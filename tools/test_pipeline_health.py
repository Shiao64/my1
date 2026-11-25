#!/usr/bin/env python3
"""Tests for tools/pipeline_health.py.  Run: python3 tools/test_pipeline_health.py"""
import datetime, os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline_health as H  # noqa: E402

NOW = datetime.datetime(2026, 11, 25, 12, 0, 0, tzinfo=datetime.timezone.utc)


def at(hours_ago):
    return (NOW - datetime.timedelta(hours=hours_ago)).strftime('%Y-%m-%dT%H:%M:%SZ')


def pr(n, ref, hours_ago, state='closed', title='t'):
    return {'number': n, 'head': {'ref': ref}, 'created_at': at(hours_ago), 'state': state, 'title': title}


def waiting(hours_ago):
    return {'created_at': at(hours_ago), 'user': {'login': 'github-actions[bot]'},
            'body': '@Shiao64 这次没有自动上线，等 Shiao 看过再合并。原因：'}


class T(unittest.TestCase):
    def test_all_fine(self):
        probs, fp = H.evaluate([pr(1, 'answer/wechat-2026-11-25-1000-mba', 5)], {}, NOW)
        self.assertEqual(probs, [])
        self.assertEqual(fp, '')

    def test_no_mba_pr_for_18_hours(self):
        probs, fp = H.evaluate([pr(1, 'answer/wechat-2026-11-24-1000-mba', 19),
                                pr(2, 'answer/mail-1124', 1)], {}, NOW)
        self.assertEqual(len(probs), 1)
        self.assertIn('18 小时', probs[0])
        self.assertTrue(fp.startswith('stale:'))

    def test_other_answer_branches_do_not_count(self):
        probs, _ = H.evaluate([pr(2, 'answer/2026-11-25-shanghai', 1)], {}, NOW)
        self.assertIn('一个都找不到', probs[0])

    def test_waiting_pr_over_10_hours(self):
        prs = [pr(1, 'answer/wechat-x-mba', 2), pr(7, 'inbox-run-1', 12, 'open', '资料更新：A')]
        probs, fp = H.evaluate(prs, {7: [waiting(11)]}, NOW)
        self.assertEqual(len(probs), 1)
        self.assertIn('#7', probs[0])
        self.assertEqual(fp, 'wait:7')

    def test_waiting_counts_from_the_wait_comment(self):
        prs = [pr(1, 'answer/wechat-x-mba', 2), pr(7, 'inbox-run-1', 30, 'open')]
        self.assertEqual(H.evaluate(prs, {7: [waiting(3)]}, NOW)[0], [])

    def test_comment_from_someone_else_does_not_reset(self):
        prs = [pr(1, 'answer/wechat-x-mba', 2), pr(7, 'inbox-run-1', 12, 'open')]
        fake = dict(waiting(1), user={'login': 'someone'})
        self.assertEqual(len(H.evaluate(prs, {7: [fake]}, NOW)[0]), 1)

    def test_closed_or_merged_run_pr_ignored(self):
        prs = [pr(1, 'answer/wechat-x-mba', 2), pr(7, 'inbox-run-1', 40, 'closed')]
        self.assertEqual(H.evaluate(prs, {}, NOW)[0], [])

    def test_body_mentions_and_carries_fingerprint(self):
        body = H.body_for(['x'], 'wait:7', NOW)
        self.assertTrue(body.startswith('@Shiao64'))
        self.assertEqual(H.FP_RE.search(body).group(1), 'wait:7')


if __name__ == '__main__':
    unittest.main(verbosity=1)
