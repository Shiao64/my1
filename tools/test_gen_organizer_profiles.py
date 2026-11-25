#!/usr/bin/env python3
"""Tests for tools/gen_organizer_profiles.py distinct_slots() (Shiao 2026-11-25: 不同时段的 2 场以上).

    python3 tools/test_gen_organizer_profiles.py
"""
import os, sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_organizer_profiles import distinct_slots  # noqa: E402


def W(i, days, time='20:00–24:00'):
    return {'id': i, 'kind': 'weekly', 'weekdays': days, 'time': time}


def D(i, day, time='20:00–24:00', **kw):
    return dict({'id': i, 'kind': 'event', 'start': day, 'end': day, 'time': time}, **kw)


CASES = [
    ('两个每周活动，不同星期几', [W('a', [6]), W('b', [3])], 2),
    ('两张卡同一个每周时段（重复卡）', [W('a', [6]), W('b', [6])], 1),
    ('同一天、不同时间（下午、晚上）', [W('a', [6], '15:30–18:30'), W('b', [6], '21:00–02:00')], 2),
    ('一张每周卡开两天，仍算一张', [W('a', [3, 0])], 1),
    ('单场是自己每周舞会的主题夜（theme_of）', [W('a', [2]), D('b', '2026-11-10', theme_of='a')], 1),
    ('单场和自己每周舞会同一星期几、同一开始时间', [W('a', [6]), D('b', '2026-11-28')], 1),  # 11/28 是周六
    ('单场在别的日子', [W('a', [6]), D('b', '2026-11-26')], 2),
    ('两个单场，不同日期', [D('a', '2026-11-14'), D('b', '2026-11-21')], 2),
    ('两个单场，同日同时间（重复卡）', [D('a', '2026-11-14'), D('b', '2026-11-14')], 1),
    ('两届周末活动，不同年份', [D('a', '2026-10-23', time=''), D('b', '2027-10-22', time='')], 2),
    ('没有日期也没有时间的卡各算一张', [{'id': 'a', 'kind': 'event'}, {'id': 'b', 'kind': 'event'}], 2),
]


def main():
    bad = 0
    for name, cards, want in CASES:
        got = distinct_slots(cards)
        ok = got == want
        bad += not ok
        print('%s  %s：%d（应为 %d）' % ('ok  ' if ok else 'FAIL', name, got, want))
    print('OK' if not bad else '%d 个失败' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
