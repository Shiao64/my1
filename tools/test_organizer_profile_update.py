#!/usr/bin/env python3
"""Tests for tools/organizer_profile_update.py.  Run: python3 tools/test_organizer_profile_update.py"""
import json, os, shutil, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import organizer_profile_update as M  # noqa: E402

BASE = [
    {"id": "gou-chen", "name": "Gou Chen", "name_zh": "勾陳", "city": "Beijing", "city_zh": "北京", "photo": "",
     "bio": "", "bio_zh": "", "links": {"instagram": "", "facebook": "", "wechat": "", "soundcloud": ""},
     "match": ["Gou Chen", "勾陳"], "auto": True},
    {"id": "liu-zheng", "name": "Liu Zheng", "name_zh": "刘峥", "city": "Beijing", "city_zh": "北京",
     "photo": "/images/asia/profiles/liu-zheng.webp?v=l1", "bio": "old", "bio_zh": "旧", "links": {}, "match": ["刘峥"]},
]


class T(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.root, self.P = M.ROOT, M.P
        M.ROOT = self.tmp
        M.P = lambda *a: os.path.join(self.tmp, *a)
        os.makedirs(os.path.join(self.tmp, 'asia'))
        M.save(json.loads(json.dumps(BASE)))
        from PIL import Image
        self.jpg = os.path.join(self.tmp, 'photo.jpg')
        Image.new('RGB', (1600, 1200), (200, 30, 40)).save(self.jpg)

    def tearDown(self):
        M.ROOT, M.P = self.root, self.P
        shutil.rmtree(self.tmp)

    def run_tool(self, *argv):
        return M.main(list(argv))

    def entry(self, pid):
        return [p for p in M.load() if p['id'] == pid][0]

    def test_find(self):
        self.assertEqual(self.run_tool('--find', '勾陈'), 1)  # 陳 vs 陈: different characters, no match
        self.assertEqual(self.run_tool('--find', 'gou chen'), 0)

    def test_update_existing(self):
        rc = self.run_tool('--id', 'gou-chen', '--photo', self.jpg, '--bio-zh', '主理人。微信 abc', '--bio', 'Runs it. WeChat abc',
                           '--link', 'wechat=abc', '--source', '主办本人 2026-11-26 来信')
        self.assertEqual(rc, 0)
        p = self.entry('gou-chen')
        self.assertEqual(p['photo'], '/images/asia/profiles/gou-chen.webp?v=g1')
        self.assertEqual(p['bio_zh'], '主理人。微信 abc')
        self.assertEqual(p['links']['wechat'], 'abc')
        self.assertEqual(p['sources'], ['主办本人 2026-11-26 来信'])
        self.assertNotIn('auto', p)
        self.assertEqual(p['match'], ['Gou Chen', '勾陳'])
        from PIL import Image
        im = Image.open(os.path.join(self.tmp, 'images/asia/profiles/gou-chen.webp'))
        self.assertEqual(im.size, (720, 540))
        raw = open(os.path.join(self.tmp, 'asia/organizers.json'), encoding='utf-8').read()
        self.assertEqual(raw, json.dumps(M.load(), ensure_ascii=False, indent=2) + '\n')

    def test_photo_tag_bumps(self):
        self.assertEqual(self.run_tool('--id', 'liu-zheng', '--photo', self.jpg), 0)
        self.assertEqual(self.entry('liu-zheng')['photo'], '/images/asia/profiles/liu-zheng.webp?v=l2')

    def test_bio_from_file_and_dry_run(self):
        f = os.path.join(self.tmp, 'bio.txt')
        open(f, 'w', encoding='utf-8').write('第一段\n\n第二段\n')
        self.assertEqual(self.run_tool('--id', 'liu-zheng', '--bio-zh', '@' + f, '--dry-run'), 0)
        self.assertEqual(self.entry('liu-zheng')['bio_zh'], '旧')
        self.assertEqual(self.run_tool('--id', 'liu-zheng', '--bio-zh', '@' + f), 0)
        self.assertEqual(self.entry('liu-zheng')['bio_zh'], '第一段\n\n第二段')

    def test_unknown_id_refused(self):
        self.assertEqual(self.run_tool('--id', 'nobody', '--bio-zh', 'x'), 2)
        self.assertEqual(self.run_tool('--link', 'bad=x', '--id', 'liu-zheng'), 2)

    def test_new_group_with_pages(self):
        rc = self.run_tool('--new', '--kind', 'group', '--name', 'Tango Union West', '--name-zh', 'Tango Union West',
                           '--city', 'Beijing', '--city-zh', '北京', '--members', 'Gou Chen', '--bio-zh', '团体', '--bio', 'Group',
                           '--photo', self.jpg)
        self.assertEqual(rc, 0)
        p = self.entry('tango-union-west')
        self.assertEqual(p['kind'], 'group')
        self.assertEqual(p['members'], ['Gou Chen'])
        self.assertEqual(p['photo'], '/images/asia/profiles/tango-union-west.webp?v=t1')
        for f in ('group/tango-union-west/index.html', 'zh/group/tango-union-west/index.html'):
            t = open(os.path.join(self.tmp, f), encoding='utf-8').read()
            self.assertIn('data-kind="group" data-id="tango-union-west"', t)
        self.assertIn('lang="zh-CN"', open(os.path.join(self.tmp, 'zh/group/tango-union-west/index.html'), encoding='utf-8').read())

    def test_new_person_with_pages(self):
        rc = self.run_tool('--new', '--name', 'Ming Li', '--name-zh', '李明', '--city', 'Shanghai', '--city-zh', '上海', '--bio-zh', '你好')
        self.assertEqual(rc, 0)
        p = self.entry('ming-li')
        self.assertNotIn('kind', p)
        self.assertEqual(p['match'], ['Ming Li', '李明'])
        t = open(os.path.join(self.tmp, 'organizer/ming-li/index.html'), encoding='utf-8').read()
        self.assertIn('data-kind="organizer" data-id="ming-li"', t)
        self.assertIn('id="pf-past"', t)

    def test_new_refused_when_name_exists(self):
        self.assertEqual(self.run_tool('--new', '--name', 'Gou Chen', '--city', 'Beijing', '--bio-zh', 'x'), 2)


if __name__ == '__main__':
    unittest.main()
