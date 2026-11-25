#!/usr/bin/env python3
"""Tests for tools/gen_organizer_profiles.py distinct_types() (Shiao 2026-11-25: 举办 2 种（含）以上不同活动).

    python3 tools/test_gen_organizer_profiles.py
"""
import os, sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_organizer_profiles import distinct_types  # noqa: E402


def C(t, **kw):
    return dict({'type': t}, **kw)


CASES = [
    ('舞会 + 练习', [C('milonga'), C('practica')], 2),
    ('舞会 + 组团', [C('milonga'), C('grouptrip')], 2),
    ('几场舞会只算一种', [C('milonga'), C('milonga'), C('milonga'), C('milonga')], 1),
    ('同一个探戈节两届只算一种', [C('festival', start='2026-10-23'), C('festival', start='2027-10-22')], 1),
    ('探戈节两届 + 每周舞会', [C('festival'), C('festival'), C('milonga', kind='weekly')], 2),
    ('舞会 + practilonga', [C('milonga'), C('practilonga'), C('milonga')], 2),
    ('大小写、空格不算不同', [C('Milonga'), C(' milonga ')], 1),
    ('没有 type 的卡不算', [C('milonga'), {'id': 'x'}], 1),
]


def main():
    bad = 0
    for name, cards, want in CASES:
        got = distinct_types(cards)
        ok = got == want
        bad += not ok
        print('%s  %s：%d（应为 %d）' % ('ok  ' if ok else 'FAIL', name, got, want))
    print('OK' if not bad else '%d 个失败' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
