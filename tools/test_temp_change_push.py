#!/usr/bin/env python3
"""Unit tests: temp_change.py + push_diff.py.  python3 tools/test_temp_change_push.py"""
import json, os, shutil, sys, tempfile, unittest, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
def mod(n):
    s = importlib.util.spec_from_file_location(n, os.path.join(HERE, n + '.py')); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
tc, pd = mod('temp_change'), mod('push_diff')

class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(); os.makedirs(self.d + '/asia'); tc.ROOT = self.d
        ev = [{'id': 'A1', 'name': 'Milonga A', 'name_zh': '舞会A', 'kind': 'weekly', 'city': 'Shanghai', 'temp_notices': [{'start': '2099-01-01', 'text': 'keep'}]},
              {'id': 'B2', 'name': 'B', 'kind': 'event', 'start': '2099-02-01'}]
        for f in tc.FILES: json.dump(ev, open(os.path.join(self.d, f), 'w'))
        self.old = ev
    def tearDown(self): shutil.rmtree(self.d)
    def cur(self, f='asia/events.json'): return json.load(open(os.path.join(self.d, f)))
    def test_set_cancel_clear(self):
        self.assertEqual(tc.main(['set', 'A1', '2099-01-05', '--time', '21:00–01:00', '--venue', 'X']), 0)
        for f in tc.FILES:
            tn = self.cur(f)[0]['temp_notices']; self.assertEqual(len(tn), 2); self.assertEqual(tn[1]['status'], 'changed'); self.assertEqual(tn[0]['text'], 'keep')
        tc.main(['cancel', 'A1', '2099-01-05']); tn = self.cur()[0]['temp_notices']
        self.assertEqual([o.get('status') for o in tn], [None, 'cancelled'])  # replaced, not duplicated
        tc.main(['clear', 'A1', '2099-01-05']); self.assertEqual(len(self.cur()[0]['temp_notices']), 1)
        self.assertEqual(tc.main(['set', 'ZZ', '2099-01-05']), 1)
    def test_cancel_weekly_cancelled_dates(self):
        self.assertEqual(tc.main(['cancel', 'A1', '2099-01-05']), 0)
        self.assertEqual(self.cur()[0]['cancelled_dates'], ['2099-01-05'])
        tc.main(['cancel', 'A1', '2099-01-12'])
        self.assertEqual(self.cur()[0]['cancelled_dates'], ['2099-01-05', '2099-01-12'])
        tc.main(['cancel', 'A1', '2099-01-05'])  # dedupe, keep the other date
        self.assertEqual(self.cur()[0]['cancelled_dates'], ['2099-01-12', '2099-01-05'])
        tc.main(['cancel', 'B2', '2099-02-01'])
        self.assertNotIn('cancelled_dates', self.cur()[1])
        tc.main(['set', 'A1', '2099-01-05'])  # a change is not a cancel
        self.assertEqual(self.cur()[0]['cancelled_dates'], ['2099-01-12'])
        tc.main(['clear', 'A1', '2099-01-12'])
        self.assertNotIn('cancelled_dates', self.cur()[0])
    def test_prune_expired(self):
        tc.main(['cancel', 'A1', '2000-01-01']); tc.main(['prune']); self.assertEqual(len(self.cur()[0]['temp_notices']), 1)
    def test_diff(self):
        tc.main(['cancel', 'A1', '2099-01-05', '--text', '停一次', '--text-en', 'Off once'])
        new = self.cur() + [{'id': 'C3', 'name': 'New Fest', 'start': '2099-03-01', 'city': 'Taipei'}, {'id': 'H', 'name': 'hid', 'hidden': True}]
        m = pd.build(self.old, new); tags = [x['tag'] for x in m]
        self.assertIn('chg-A1-2099-01-05', tags); self.assertIn('new-C3', tags); self.assertNotIn('new-H', tags)
        c = [x for x in m if x['tag'].startswith('chg')][0]
        self.assertTrue(c['title_zh'].startswith('已取消 1/5：舞会A')); self.assertTrue(c['title_en'].startswith('Cancelled 1/5: Milonga A'))
        self.assertEqual(c['url_zh'], 'https://tangoweekend.org/zh/asia/?card=A1')
        self.assertEqual(pd.build(new, new), [])  # no change -> no push
    def test_expired_change_no_push(self):
        new = json.loads(json.dumps(self.old)); new[0]['temp_notices'].append({'status': 'changed', 'date': '2000-01-01', 'time': 'x'})
        self.assertEqual(pd.build(self.old, new), [])
    def test_cap(self):
        new = self.old + [{'id': f'N{i}', 'name': f'n{i}'} for i in range(9)]
        m = pd.build(self.old, new); self.assertEqual(len(m), 5); self.assertEqual(m[-1]['tag'], 'more')

if __name__ == '__main__': unittest.main(verbosity=1)
