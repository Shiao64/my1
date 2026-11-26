#!/usr/bin/env python3
"""「整条线还活着吗」检查（Shiao 2026-11-25）。

读微信 → 交收件箱 → 资料更新 → 上线检查。这条线断了不会有人说，网站会悄悄变旧，所以定时看两件事：
  1. 超过 STALE_H 小时没有新的「交收件箱」PR（分支 answer/wechat-…-mba）：
     读微信可能没跑（Mac 没开、微信没登录、没批准），也可能这段时间真的没有新活动。
  2. 「等 Shiao 看」的「资料更新」PR（分支 inbox-run-*，还开着）超过 WAIT_H 小时没处理：
     从上线检查留「这次没有自动上线」那条留言起算；没有这条留言就从 PR 开的时间算。

有问题就开（或更新）一个 issue「整条线提醒（自动）」，开头 @Shiao64，GitHub 会寄信、手机 App 推送。
同样的问题不重复提醒；问题有变（新的 PR 超时、又断了）才再留言 @ 一次；全部恢复就留言后关掉 issue。

由 .github/workflows/pipeline-health.yml 定时执行。测试：python3 tools/test_pipeline_health.py
"""
import datetime, json, os, re, subprocess, sys

STALE_H = 18
WAIT_H = 10
TITLE = '整条线提醒（自动）'
MENTION = '@Shiao64'
WAIT_MARK = '这次没有自动上线'
FP_RE = re.compile(r'<!-- fp:([^ ]*) -->')
ANSWER_MBA = re.compile(r'^answer/wechat-.*-mba$')


def ts(s):
    return datetime.datetime.strptime(s, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc)


def bj(t):
    return (t + datetime.timedelta(hours=8)).strftime('%m/%d %H:%M')


def evaluate(prs, comments, now):
    """prs: GitHub pull objects (state all, newest first is fine). comments: {pr number: [issue comments]}.
    Returns (problems, fingerprint). problems is a list of plain-language lines."""
    problems, keys = [], []
    mba = [p for p in prs if ANSWER_MBA.match(p['head']['ref'])]
    last = max((ts(p['created_at']) for p in mba), default=None)
    if last is None or now - last > datetime.timedelta(hours=STALE_H):
        when = f'最后一个是 {bj(last)}（北京时间）' if last else '一个都找不到'
        problems.append(f'超过 {STALE_H} 小时没有新的「交收件箱」PR，{when}。'
                        '可能是读微信没跑（Mac 没开、微信没登录、没批准），也可能这段时间群里真的没有新活动。')
        keys.append('stale:' + (last.strftime('%Y%m%dT%H%M') if last else 'none'))
    for p in prs:
        if p.get('state') != 'open' or not p['head']['ref'].startswith('inbox-run-'):
            continue
        n = p['number']
        marks = [ts(c['created_at']) for c in comments.get(n, [])
                 if WAIT_MARK in (c.get('body') or '') and (c.get('user') or {}).get('login') == 'github-actions[bot]']
        since = max(marks) if marks else ts(p['created_at'])
        if now - since > datetime.timedelta(hours=WAIT_H):
            h = int((now - since).total_seconds() // 3600)
            problems.append(f'#{n}「{p["title"]}」等你决定已经 {h} 小时（从 {bj(since)} 起）。')
            keys.append(f'wait:{n}')
    return problems, ','.join(sorted(keys))


def body_for(problems, fp, now):
    lines = [f'{MENTION} 整条线（读微信 → 交收件箱 → 资料更新 → 上线检查）有事要看（{bj(now)} 北京时间检查）：', '']
    lines += [f'- {x}' for x in problems]
    lines += ['', '问题都解决后，下一次检查会自动关掉这个 issue。', f'<!-- fp:{fp} -->']
    return '\n'.join(lines)


def gh(*args, data=None):
    out = subprocess.run(['gh', *args], input=data, capture_output=True, text=True, check=True).stdout
    return json.loads(out) if out.strip() else None


def main():
    repo = os.environ['GITHUB_REPOSITORY']
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    prs = gh('api', f'repos/{repo}/pulls?state=all&per_page=100&sort=created&direction=desc')
    comments = {}
    for p in prs:
        if p['state'] == 'open' and p['head']['ref'].startswith('inbox-run-'):
            comments[p['number']] = gh('api', f'repos/{repo}/issues/{p["number"]}/comments?per_page=100')
    problems, fp = evaluate(prs, comments, now)
    issues = gh('api', f'repos/{repo}/issues?state=open&per_page=100') or []
    issue = next((i for i in issues if i.get('title') == TITLE and 'pull_request' not in i
                  and (i.get('user') or {}).get('login') == 'github-actions[bot]'), None)
    print('problems:', problems or 'none', '| open issue:', issue and issue['number'])
    if not problems:
        if issue:
            gh('api', '-X', 'POST', f'repos/{repo}/issues/{issue["number"]}/comments',
               '-f', f'body=已恢复正常（{bj(now)} 北京时间检查），关掉这个提醒。')
            gh('api', '-X', 'PATCH', f'repos/{repo}/issues/{issue["number"]}', '-f', 'state=closed')
        return
    body = body_for(problems, fp, now)
    if not issue:
        gh('api', '-X', 'POST', f'repos/{repo}/issues', '-f', f'title={TITLE}', '-f', f'body={body}')
        return
    m = FP_RE.search(issue.get('body') or '')
    if m and m.group(1) == fp:
        return  # same problems as last time: no new mention
    gh('api', '-X', 'PATCH', f'repos/{repo}/issues/{issue["number"]}', '-f', f'body={body}')
    gh('api', '-X', 'POST', f'repos/{repo}/issues/{issue["number"]}/comments', '-f', f'body={body}')


if __name__ == '__main__':
    sys.exit(main())
