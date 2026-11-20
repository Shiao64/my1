#!/usr/bin/env python3
"""Read WeChat official-account articles linked in inbox answers (Shiao 2026-11-21).

A mail to huodong@ that is only a mp.weixin.qq.com link used to be moved to done/ as
"no data". Now inbox.yml runs this first: for every answer it opens each article link,
appends the article's text to the answer under 「## 公众号文章（自动读取）」 and saves its
pictures next to the answer as <answer>-wx<k>-<n>.<ext>, so the Claude step can read them
like mail attachments (posters go through tools/radar_poster_update.py as usual).

  python3 tools/wechat_article.py data/inbox/A.md [data/inbox/B.md ...]   # changes files, git adds them

The repo is public: emails and phone numbers in the article text are hidden. An answer that
already has the section is skipped, so running twice does nothing. A failed fetch is written
into the answer too (the Claude step then lists it for Shiao) and never fails the run.
"""
import html, io, os, re, subprocess, sys, time, urllib.request
from html.parser import HTMLParser

LINK = re.compile(r'https?://mp\.weixin\.qq\.com/s(?:/[A-Za-z0-9_-]+|\?[^\s<>()\[\]"\'`，。）】]+)')
UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
      '(KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x1800322c) NetType/WIFI Language/zh_CN')
HEAD = '## 公众号文章（自动读取）'
MAX_LINKS = 3
MAX_IMAGES = 8           # per article, same as mail attachments
MAX_BYTES = 10 * 1024 * 1024
MIN_SIDE = 400           # smaller pictures are icons, dividers, stickers
MAX_TEXT = 8000
BLOCK = {'p', 'div', 'section', 'br', 'h1', 'h2', 'h3', 'h4', 'li', 'tr', 'blockquote', 'figure'}


def hide(s):
    s = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '（邮箱已隐藏）', s)
    s = re.sub(r'(?<!\d)(?:\+?86[- ]?)?1[3-9]\d[- ]?\d{4}[- ]?\d{4}(?!\d)', '（电话已隐藏）', s)
    return s


class Article(HTMLParser):
    """Text and picture URLs inside <div id="js_content">."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0          # >0 while inside js_content
        self.parts, self.images = [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.depth == 0:
            if a.get('id') == 'js_content':
                self.depth = 1
            return
        if tag not in ('img', 'br', 'hr', 'input', 'meta', 'link'):
            self.depth += 1
        if tag in BLOCK:
            self.parts.append('\n')
        if tag == 'img':
            src = a.get('data-src') or a.get('src') or ''
            if src.startswith('http') and src not in self.images:
                self.images.append(html.unescape(src))
            self.parts.append('\n[图片]\n')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.depth == 0:
            return
        if tag in BLOCK:
            self.parts.append('\n')
        if tag not in ('img', 'br', 'hr', 'input', 'meta', 'link'):
            self.depth -= 1

    def handle_data(self, data):
        if self.depth > 0:
            self.parts.append(data)

    def text(self):
        t = ''.join(self.parts).replace('\xa0', ' ').replace('​', '')
        lines = [re.sub(r'[ \t]+', ' ', x).strip() for x in t.split('\n')]
        out = []
        for x in lines:
            if not x or (x == '[图片]' and out and out[-1] == '[图片]'):
                continue
            out.append(x)
        return '\n'.join(out)


def meta(page, *names):
    for n in names:
        m = re.search(r'<meta[^>]+(?:property|name)="%s"[^>]+content="([^"]*)"' % re.escape(n), page)
        if m and m.group(1).strip():
            return html.unescape(m.group(1)).strip()
    return ''


def js_var(page, name):
    m = re.search(r'var %s\s*=\s*(?:htmlDecode\()?\s*["\']([^"\']*)["\']' % name, page)
    return html.unescape(m.group(1)).strip() if m else ''


def js_decode(s):
    """Undo JsDecode('...') / JS string escapes: \\xNN, \\uNNNN, \\n, \\'."""
    s = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1), 16)), s)
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    s = s.replace('\\n', '\n').replace("\\'", "'").replace('\\"', '"').replace('\\/', '/')
    return html.unescape(html.unescape(s))


def strip_tags(s):
    s = re.sub(r'<br\s*/?>|</p>|</div>|</section>', '\n', s, flags=re.I)
    return re.sub(r'<[^>]+>', '', s)


def fallback_text(page):
    """Text of picture posts and other layouts without a filled js_content."""
    found = []
    for pat in (r"content_noencode\s*:\s*JsDecode\('((?:[^'\\]|\\.)*)'\)",
                r'content_noencode\s*:\s*"((?:[^"\\]|\\.)*)"',
                r"desc\s*:\s*JsDecode\('((?:[^'\\]|\\.)*)'\)",
                r'var msg_desc\s*=\s*(?:htmlDecode\()?\s*"((?:[^"\\]|\\.)*)"'):
        for m in re.finditer(pat, page):
            t = strip_tags(js_decode(m.group(1))).strip()
            if t and t not in found:
                found.append(t)
        if found:
            break
    if not found:
        d = meta(page, 'og:description', 'description')
        if d:
            found.append(d)
    t = '\n'.join(found)
    return '\n'.join(x.strip() for x in t.split('\n') if x.strip())


def fallback_images(page):
    """Pictures listed in the page data (picture posts), then any mmbiz picture URL."""
    urls = []
    for pat in (r"cdn_url\s*:\s*(?:JsDecode\()?\s*['\"]([^'\"]+)['\"]",
                r'(https?:(?:\\?/){2}mmbiz\.qpic\.cn(?:\\?/)[^"\'\s<>)]+)'):
        for m in re.finditer(pat, page):
            u = js_decode(m.group(1)).replace('\\/', '/')
            if 'mmbiz.qpic.cn' in u and 'mmbiz_gif' not in u and u not in urls:
                urls.append(u)
        if urls:
            break
    return urls


def parse(page):
    """-> dict(title, account, published, text, images) or raise ValueError with a reason."""
    if 'js_content' not in page and 'content_noencode' not in page and 'picture_page_info_list' not in page:
        if '环境异常' in page or '完成验证' in page:
            raise ValueError('微信要求验证（环境异常），读不到')
        if '已被发布者删除' in page or '此内容因违规无法查看' in page or '该内容已被发布者删除' in page:
            raise ValueError('文章已被删除或无法查看')
        raise ValueError('页面里没有文章内容')
    p = Article()
    p.feed(page)
    published = ''
    m = re.search(r'var ct\s*=\s*"(\d{9,})"', page) or re.search(r'create_time\s*[:=]\s*["\']?(\d{9,})', page)
    if m:
        published = time.strftime('%Y-%m-%d %H:%M', time.gmtime(int(m.group(1)) + 8 * 3600))
    text, images = p.text(), p.images
    if not text.replace('[图片]', '').strip():
        text = fallback_text(page) or text
    if not images:
        images = fallback_images(page)
    if not text.replace('[图片]', '').strip() and not images:
        st = re.search(r'item_show_type\s*[:=]\s*["\']?(\d+)', page)
        raise ValueError('打开了页面，但没找到正文和图片' + (f'（版式 item_show_type={st.group(1)}）' if st else ''))
    nick = js_var(page, 'nickname') or js_var(page, 'nick_name')
    if not nick:
        m = re.search(r"nick_name\s*:\s*JsDecode\('([^']*)'\)", page) or \
            re.search(r'class="profile_nickname"[^>]*>([^<]+)<', page) or \
            re.search(r'id="js_name"[^>]*>\s*([^<]+?)\s*<', page)
        nick = js_decode(m.group(1)).strip() if m else ''
    return {
        'title': meta(page, 'og:title', 'twitter:title') or js_var(page, 'msg_title'),
        'account': nick or meta(page, 'og:article:author'),
        'published': published,
        'text': text,
        'images': images,
    }


def get(url, referer=None, limit=None):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9',
                                               **({'Referer': referer} if referer else {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read((limit or 0) + 1 if limit else -1)
        return data, r.headers.get('Content-Type', '')


def image_ext(url, ctype, data):
    if data[:3] == b'\xff\xd8\xff':
        return 'jpg'
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    if data[:4] == b'GIF8':
        return 'gif'
    m = re.search(r'wx_fmt=(\w+)', url)
    return (m.group(1) if m else ctype.split('/')[-1]).lower().replace('jpeg', 'jpg')


def big_enough(data):
    try:
        from PIL import Image
        w, h = Image.open(io.BytesIO(data)).size
    except Exception:
        return True          # cannot tell: keep it
    return min(w, h) >= MIN_SIDE and max(w, h) <= 6 * min(w, h)


def links(md):
    seen = []
    for u in LINK.findall(md):
        u = html.unescape(u).rstrip('.,;:')
        if u not in seen:
            seen.append(u)
    return seen[:MAX_LINKS]


def section(k, url, art, saved, err=None):
    lines = [f'### 文章 {k}', '', f'- 链接：{url}']
    if err:
        lines += [f'- 读取失败：{err}（只有链接，内容要 Shiao 看）', '']
        return '\n'.join(lines)
    if art['title']:
        lines.append(f'- 标题：{hide(art["title"])}')
    if art['account']:
        lines.append(f'- 公众号：{hide(art["account"])}')
    if art['published']:
        lines.append(f'- 发布时间：{art["published"]}（北京时间）')
    lines.append('- 图片：' + ('、'.join(f'`{n}`' for n in saved) if saved else '无（或都是小图标）'))
    text = hide(art['text'])
    if len(text) > MAX_TEXT:
        text = text[:MAX_TEXT] + '\n……（后面省略）'
    lines += ['', '正文：', '', '```text', text.replace('```', "'''") or '（没有文字）', '```', '']
    return '\n'.join(lines)


def process(path, fetch=get):
    """Add the article section to one answer. Returns the list of files written (for git add)."""
    md = open(path, encoding='utf-8').read()
    if HEAD in md:
        return []
    urls = links(md)
    if not urls:
        return []
    stem = path[:-3]
    out, written = [], [path]
    for k, url in enumerate(urls, 1):
        try:
            page = fetch(url)[0].decode('utf-8', 'replace')
            art = parse(page)
        except Exception as e:
            out.append(section(k, url, None, [], str(e) if isinstance(e, ValueError) else f'连不上（{type(e).__name__}）'))
            continue
        saved, n = [], 0
        for src in art['images']:
            if n >= MAX_IMAGES:
                break
            try:
                data, ctype = fetch(src, 'https://mp.weixin.qq.com/', MAX_BYTES)
            except Exception:
                continue
            if len(data) > MAX_BYTES or not data:
                continue
            ext = image_ext(src, ctype, data)
            if ext not in ('jpg', 'png', 'webp') or not big_enough(data):
                continue           # gif stickers, icons, dividers
            n += 1
            name = f'{stem}-wx{k}-{n}.{ext}'
            with open(name, 'wb') as f:
                f.write(data)
            saved.append(os.path.basename(name))
            written.append(name)
        out.append(section(k, url, art, saved))
    note = ('\n' + HEAD + '\n\n信里的公众号文章链接，处理前自动打开读下来的文字和图片'
            '（文字里的邮箱、电话已隐藏）。当作这封信的内容处理；图片和附件一样用。\n\n' + '\n'.join(out))
    marker = '\n---\n邮件里的邮箱地址都已隐藏。'
    md = md.replace(marker, note + marker, 1) if marker in md else md.rstrip('\n') + '\n' + note
    with open(path, 'w', encoding='utf-8') as f:
        f.write(md)
    return written


def main(paths):
    for p in paths:
        if not (p.endswith('.md') and os.path.isfile(p)):
            continue
        files = process(p)
        if files:
            print(f'{p}: {len(files) - 1} 张图片')
            subprocess.run(['git', 'add', '--', *files], check=False)


if __name__ == '__main__':
    main(sys.argv[1:])
