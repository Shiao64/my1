#!/usr/bin/env python3
"""Tests for tools/inbox_autocheck.py.  Run: python3 tools/test_inbox_autocheck.py"""
import datetime, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import inbox_autocheck as A  # noqa: E402

TODAY = datetime.date(2026, 11, 16)
BASE_CARDS = [
    {"id": "R001", "kind": "weekly", "type": "milonga", "name": "Milonga Uno", "city": "Beijing",
     "region": "China", "weekday": 2, "weekdays": [2], "time": "20:00–24:00", "venue": "Hall A",
     "venue_address": "", "source": "x"},
    {"id": "E001", "kind": "event", "type": "milonga", "name": "Big Night", "city": "Shanghai",
     "region": "China", "start": "2026-11-28", "end": "2026-11-28", "time": "20:00", "venue": "Te Amo",
     "venue_address": "某路1号", "source": "x"},
    {"id": "T001", "kind": "weekly", "type": "milonga", "name": "Tokyo One", "city": "Tokyo",
     "region": "Japan", "weekday": 5, "weekdays": [5], "time": "19:00", "venue": "Zita",
     "venue_address": "", "source": "x"},
]
CORE_IDS = {"R001", "E001"}


def dump(lst, more=False):
    return json.dumps(lst, ensure_ascii=False, separators=(',', ':')) + ('\n' if more else '')


class T(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.cwd = os.getcwd()
        os.chdir(self.tmp)
        self.git('init', '-q', '-b', 'main')
        self.git('config', 'user.email', 't@example.invalid')
        self.git('config', 'user.name', 't')
        os.makedirs('asia')
        os.makedirs('tools')
        os.makedirs('images/asia/posters/_backup')
        open('tools/radar-poster-log.jsonl', 'w').write('{"action":"replaced","id":"OLD"}\n')
        open('asia/index.html', 'w').write("<script src='/asia/cardB.js?v=cb1'></script><p>hello</p>")
        self.write(BASE_CARDS)
        self.git('add', '-A')
        self.git('commit', '-qm', 'base')
        self.git('checkout', '-qb', 'run')

    def tearDown(self):
        os.chdir(self.cwd)

    def git(self, *a):
        subprocess.check_call(['git', *a], stdout=subprocess.DEVNULL)

    def write(self, cards, core_extra=()):
        core = [c for c in cards if c['id'] in CORE_IDS or c['id'] in core_extra]
        more = [c for c in cards if c not in core]
        open('asia/events.json', 'w').write(dump(cards))
        open('asia/events-core.json', 'w').write(dump(core))
        open('asia/events-more.json', 'w').write(dump(more, True))

    def run_check(self, cards, core_extra=(), body='需要确认：无', extra_file=None):
        self.write(cards, core_extra)
        if extra_file:
            open(extra_file, 'w').write('x')
        self.git('add', '-A')
        self.git('commit', '-qm', 'run')
        return A.check('main', 'run', body, TODAY)

    def cards(self):
        return json.loads(json.dumps(BASE_CARDS))

    def mail(self, own, organizer=True):
        os.makedirs('data/inbox/done', exist_ok=True)
        who = '- 寄件人是主办本人：这封信可以算「主办确认」' if organizer else '- 寄件人是 ATM 这边的人（转寄或整理的资料），不算主办确认'
        cards = f'\n- 这位主办在网站上的卡：{"、".join(own)}（主办确认只用在这些卡）' if own else ''
        open('data/inbox/done/2026-11-20-mail-1120-1200-abcd.md', 'w').write(f'# 邮件：x\n\n{who}{cards}\n')

    def test_organizer_mail_own_card_goes_live(self):
        c = self.cards(); i = c[0]['id']
        c[0]['temp_notices'] = [{"date": "2026-11-17", "text": "取消"}]
        self.mail([i])
        ok, why, _ = self.run_check(c)
        self.assertTrue(ok, why)

    def test_organizer_mail_other_card_waits(self):
        c = self.cards()
        c[0]['temp_notices'] = [{"date": "2026-11-17", "text": "取消"}]
        self.mail(['SOMEONE_ELSE'])
        ok, why, _ = self.run_check(c)
        self.assertFalse(ok)
        self.assertTrue(any('别人的卡' in r for r in why), why)

    def test_staff_mail_other_card_goes_live(self):
        c = self.cards()
        c[0]['temp_notices'] = [{"date": "2026-11-17", "text": "取消"}]
        self.mail([], organizer=False)
        ok, why, _ = self.run_check(c)
        self.assertTrue(ok, why)

    def test_temp_notice_goes_live(self):
        c = self.cards()
        c[0]['temp_notices'] = [{"date": "2026-11-17", "text": "DJ 木木"}]
        c[0]['updated'] = '2026-11-16'
        ok, why, _ = self.run_check(c)
        self.assertTrue(ok, why)

    def test_fill_empty_address_goes_live(self):
        c = self.cards()
        c[0]['venue_address'] = '北京市某路2号'
        self.assertTrue(self.run_check(c)[0])

    def test_change_existing_address_waits(self):
        c = self.cards()
        c[1]['venue_address'] = '另一条路'
        self.assertFalse(self.run_check(c)[0])

    def test_dj_change_waits(self):
        c = self.cards()
        c[0]['dj'] = 'X'
        self.assertFalse(self.run_check(c)[0])

    def test_removed_notice_waits(self):
        c = self.cards()
        c[0]['temp_notices'] = [{"date": "2026-11-17", "text": "a"}]
        self.run_check(c)
        self.git('checkout', '-q', 'main')
        self.git('merge', '-q', 'run')
        self.git('checkout', '-qB', 'run2')
        c[0]['temp_notices'] = []
        self.write(c)
        self.git('commit', '-qam', 'x')
        self.assertFalse(A.check('main', 'run2', '需要确认：无', TODAY)[0])

    def test_delete_card_waits(self):
        self.assertFalse(self.run_check(self.cards()[1:])[0])

    def test_needs_confirmation_waits(self):
        c = self.cards()
        c[0]['venue_address'] = '北京市某路2号'
        self.assertFalse(self.run_check(c, body='## 要 Shiao 确认\n1. 泥人是谁\n需要确认：有')[0])

    def test_other_file_waits(self):
        c = self.cards()
        c[0]['venue_address'] = '北京市某路2号'
        self.assertFalse(self.run_check(c, extra_file='asia/cardB.js')[0])

    def new_card(self, **kw):
        n = {"id": "E900", "kind": "event", "type": "milonga", "name": "New Milonga", "city": "Shanghai",
             "region": "China", "start": "2026-11-29", "end": "2026-11-29", "time": "20:00–24:00",
             "venue": "Studio 9", "venue_address": "上海市某路9号", "source": "主办海报",
             "contacts": {"wechat_id": "studio9"}}
        n.update(kw)
        return n

    def test_new_card_without_contact_or_link_waits(self):
        n = self.new_card(contacts={})
        ok, why, _ = self.run_check(self.cards() + [n], core_extra={'E900'})
        self.assertFalse(ok)
        self.assertTrue(any('联络方式' in w for w in why), why)

    def test_new_china_card_goes_live(self):
        ok, why, _ = self.run_check(self.cards() + [self.new_card()], core_extra={'E900'})
        self.assertTrue(ok, why)

    def test_new_card_not_in_core_waits(self):
        self.assertFalse(self.run_check(self.cards() + [self.new_card()])[0])

    def test_new_tokyo_card_waits(self):
        n = self.new_card(city='Tokyo', region='Japan', venue_address='東京')
        self.assertFalse(self.run_check(self.cards() + [n], core_extra={'E900'})[0])

    def test_new_card_missing_address_waits(self):
        n = self.new_card(venue_address='', contacts={}, links={'other': 'https://example.com'})
        self.assertFalse(self.run_check(self.cards() + [n], core_extra={'E900'})[0])

    def test_new_card_with_contact_blank_time_address_goes_live(self):
        n = self.new_card(venue_address='', time='', venue='STP')
        ok, why, _ = self.run_check(self.cards() + [n], core_extra={'E900'})
        self.assertTrue(ok, why)

    def test_new_past_card_waits(self):
        n = self.new_card(start='2026-11-10', end='2026-11-10')
        self.assertFalse(self.run_check(self.cards() + [n], core_extra={'E900'})[0])

    def test_new_card_same_day_same_venue_waits(self):
        n = self.new_card(start='2026-11-28', end='2026-11-28', venue='TeAmo', name='Other')
        ok, why, _ = self.run_check(self.cards() + [n], core_extra={'E900'})
        self.assertFalse(ok)
        self.assertTrue(any('重复' in r for r in why), why)

    def test_new_weekly_same_weekday_same_name_waits(self):
        n = self.new_card(id='R900', kind='weekly', weekday=2, weekdays=[2], name='Milonga Uno',
                          city='Beijing', venue='Hall B', venue_address='北京')
        n.pop('start'); n.pop('end')
        self.assertFalse(self.run_check(self.cards() + [n], core_extra={'R900'})[0])

    def test_festival_without_time_goes_live(self):
        n = self.new_card(type='festival', start='2026-12-04', end='2026-12-06', time='',
                          venue='Te Amo / Hall A', name='Winter Festival')
        ok, why, _ = self.run_check(self.cards() + [n], core_extra={'E900'})
        self.assertTrue(ok, why)


    def poster_cards(self):
        c = self.cards()
        c[0]['poster'] = '/images/asia/posters/R001.png'
        c[0]['poster_djs'] = {'/images/asia/posters/R001.png': 'Dandi'}
        c[0]['dj'] = 'Dandi'
        return c

    def add_poster_files(self, log=True, page_edit="<script src='/asia/cardB.js?v=cb2'></script><p>hello</p>"):
        open('images/asia/posters/R001.png', 'w').write('png')
        open('images/asia/posters/_backup/R001-20261116.jpg', 'w').write('jpg')
        if log:
            with open('tools/radar-poster-log.jsonl', 'a') as fh:
                fh.write('{"action":"replaced","id":"R001"}\n')
        open('asia/index.html', 'w').write(page_edit)

    def test_poster_by_tool_goes_live(self):
        self.add_poster_files()
        ok, why, _ = self.run_check(self.poster_cards())
        self.assertTrue(ok, why)

    def test_poster_without_tool_log_waits(self):
        self.add_poster_files(log=False)
        self.assertFalse(self.run_check(self.poster_cards())[0])

    def test_page_edit_beyond_cache_key_waits(self):
        self.add_poster_files(page_edit="<script src='/asia/cardB.js?v=cb2'></script><p>changed</p>")
        self.assertFalse(self.run_check(self.poster_cards())[0])

    def test_image_of_other_card_waits(self):
        self.add_poster_files()
        open('images/asia/posters/E001.png', 'w').write('x')
        self.assertFalse(self.run_check(self.poster_cards())[0])

    # 2026-11-25 (#466): the tool overwrote <id>.jpg in place; the poster path did not change.
    def same_path_setup(self, log=True):
        c = self.cards()
        c[0]['poster'] = '/images/asia/posters/R001.jpg'
        self.write(c); open('images/asia/posters/R001.jpg', 'w').write('old')
        self.git('add', '-A'); self.git('commit', '-qm', 'old poster')
        c = self.cards()
        c[0]['poster'] = '/images/asia/posters/R001.jpg?v=20261125'
        c[0]['poster_date'] = '2026-11-25'
        c[0]['poster_dates'] = {'/images/asia/posters/R001.jpg': '2026-11-25'}
        c[0]['posters_past'] = ['/images/asia/posters/past/R001-20261125T063950Z.jpg']
        open('images/asia/posters/R001.jpg', 'w').write('new')
        os.makedirs('images/asia/posters/past', exist_ok=True)
        open('images/asia/posters/past/R001-20261125T063950Z.jpg', 'w').write('old')
        for d in ('images/thumb/images/asia/posters/past', 'images/thumb800/images/asia/posters/past'):
            os.makedirs(d, exist_ok=True)
            open(d + '/R001-20261125T063950Z.webp', 'w').write('t')
        if log:
            with open('tools/radar-poster-log.jsonl', 'a') as fh:
                fh.write('{"action":"replaced","id":"R001"}\n')
        return c

    def test_poster_same_path_by_tool_goes_live(self):
        ok, why, _ = self.run_check(self.same_path_setup())
        self.assertTrue(ok, why)

    def test_poster_same_path_without_log_waits(self):
        self.assertFalse(self.run_check(self.same_path_setup(log=False))[0])

    def test_poster_dated_name_goes_live(self):
        c = self.cards()
        c[0]['poster'] = '/images/asia/posters/R001_2026-11-24.jpg'
        open('images/asia/posters/R001_2026-11-24.jpg', 'w').write('jpg')
        os.makedirs('images/thumb/images/asia/posters', exist_ok=True)
        open('images/thumb/images/asia/posters/R001_2026-11-24.webp', 'w').write('t')
        with open('tools/radar-poster-log.jsonl', 'a') as fh:
            fh.write('{"action":"replaced","id":"R001"}\n')
        ok, why, _ = self.run_check(c)
        self.assertTrue(ok, why)


if __name__ == '__main__':
    unittest.main(verbosity=1)
