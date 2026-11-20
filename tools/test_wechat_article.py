#!/usr/bin/env python3
"""Tests for tools/wechat_article.py (no network: pages and pictures are faked).

  python3 tools/test_wechat_article.py
"""
import io, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wechat_article as wa  # noqa: E402

PAGE = '''<html><head><meta property="og:title" content="【北京 Practica V】11/21 周六练习场" />
<script>var nickname = htmlDecode("Tango V");var ct = "1763654400";</script></head><body>
<div class="rich_media_content" id="js_content" style="visibility: hidden;">
<section><p>时间：11月21日 周六 15:00–18:00</p><p>地点：朝阳区某路&nbsp;8号 2层</p>
<p><img data-src="https://mmbiz.qpic.cn/poster?wx_fmt=jpeg" /></p>
<p><img data-src="https://mmbiz.qpic.cn/icon?wx_fmt=png" /></p>
<p><img data-src="https://mmbiz.qpic.cn/sticker?wx_fmt=gif" /></p>
<p>报名：13812345678 或 a.b@example.com</p><div><span>DJ：</span><span>Vincent</span></div></section>
</div><div id="js_pc_qr_code">不要这一段</div></body></html>'''


def picture(w, h, fmt='JPEG'):
    from PIL import Image
    b = io.BytesIO()
    Image.new('RGB', (w, h), 'white').save(b, fmt)
    return b.getvalue()


def fake(pages):
    def fetch(url, referer=None, limit=None):
        if url not in pages:
            raise OSError('no route')
        v = pages[url]
        return (v.encode() if isinstance(v, str) else v), 'text/html'
    return fetch


def md_file(d, body):
    p = os.path.join(d, '2026-11-21-mail-1121-0039-beea.md')
    open(p, 'w', encoding='utf-8').write(
        '# 邮件：x\n\n## 内容\n\n' + body + '\n\n---\n邮件里的邮箱地址都已隐藏。原始邮件没有存下来。\n')
    return p


def test_reads_text_and_big_pictures():
    url = 'https://mp.weixin.qq.com/s/_ODrpf5UJinDDllqhPiuBw'
    pages = {url: PAGE,
             'https://mmbiz.qpic.cn/poster?wx_fmt=jpeg': picture(1080, 1500),
             'https://mmbiz.qpic.cn/icon?wx_fmt=png': picture(120, 120, 'PNG'),
             'https://mmbiz.qpic.cn/sticker?wx_fmt=gif': picture(800, 800, 'GIF')}
    with tempfile.TemporaryDirectory() as d:
        p = md_file(d, url)
        files = wa.process(p, fake(pages))
        md = open(p, encoding='utf-8').read()
        assert files == [p, p[:-3] + '-wx1-1.jpg'], files
        assert os.path.exists(p[:-3] + '-wx1-1.jpg')
        assert wa.HEAD in md and md.index(wa.HEAD) < md.index('邮件里的邮箱地址都已隐藏')
        for s in ('标题：【北京 Practica V】11/21 周六练习场', '公众号：Tango V', '发布时间：2025-11-21 00:00',
                  '15:00–18:00', '朝阳区某路 8号 2层', 'DJ：', 'Vincent', '`2026-11-21-mail-1121-0039-beea-wx1-1.jpg`'):
            assert s in md, s
        assert '13812345678' not in md and 'example.com' not in md and '（电话已隐藏）' in md
        assert '不要这一段' not in md
        # second run changes nothing
        assert wa.process(p, fake(pages)) == []


def test_failure_is_written_not_raised():
    url = 'https://mp.weixin.qq.com/s?__biz=MzA&amp;mid=1&amp;idx=1&amp;sn=abc'
    with tempfile.TemporaryDirectory() as d:
        p = md_file(d, '看这里 ' + url + '。')
        clean = 'https://mp.weixin.qq.com/s?__biz=MzA&mid=1&idx=1&sn=abc'
        wa.process(p, fake({clean: '<html>环境异常 去验证</html>'}))
        md = open(p, encoding='utf-8').read()
        assert '读取失败：微信要求验证' in md and clean in md, md
    with tempfile.TemporaryDirectory() as d:
        p = md_file(d, url)
        wa.process(p, fake({}))
        assert '读取失败：连不上' in open(p, encoding='utf-8').read()


PICTURE_POST = r"""<html><head><meta property="og:title" content="【北京 Practica V】2026/11/21 周六练习场" /></head><body>
<div id="js_content" style="visibility:hidden"></div>
<script>var item_show_type = "8";
window.cgiDataNew = { nick_name: JsDecode('Tango\x20V'), content_noencode: JsDecode('11\u6708 21\u65e5\x0a\x26lt;p\x26gt;15:00\x26lt;/p\x26gt;\x0a\u7535\u8bdd 13812345678'),
picture_page_info_list: [{ cdn_url: 'https://mmbiz.qpic.cn/sz_mmbiz_jpg/abc/0?wx_fmt=jpeg', width: '1080' }] };</script></body></html>"""


def test_picture_post():
    url = 'https://mp.weixin.qq.com/s/_ODrpf5UJinDDllqhPiuBw'
    pages = {url: PICTURE_POST, 'https://mmbiz.qpic.cn/sz_mmbiz_jpg/abc/0?wx_fmt=jpeg': picture(1080, 1440)}
    with tempfile.TemporaryDirectory() as d:
        p = md_file(d, url)
        files = wa.process(p, fake(pages))
        md = open(p, encoding='utf-8').read()
        assert len(files) == 2, files
        for x in ('公众号：Tango V', '11月 21日', '15:00', '（电话已隐藏）', '-wx1-1.jpg'):
            assert x in md, (x, md)
        assert '<p>' not in md and '13812345678' not in md


def test_double_escaped_text_and_map_link():
    raw = (r"\\u5468\\u516d\\x0a\\x26lt;a class=\\x26quot;js_poi_entry wx_poi_link\\x26quot; "
           r"data-address=\\x26quot;%E5%8C%97%E4%BA%AC%E5%B8%82%E6%9C%9D%E9%98%B3%E5%8C%BA\\x26quot;\\x26gt;"
           r"\\u6d3b\\u52a8\\u4e2d\\u5fc3\\x26lt;/a\\x26gt;")
    page = "<html><div id='js_content'></div><script>content_noencode: JsDecode('" + raw + "'),</script></html>"
    art = wa.parse(page)
    assert art['text'] == '周六\n活动中心（地图地址：北京市朝阳区）', repr(art['text'])


def test_empty_page_is_a_failure():
    url = 'https://mp.weixin.qq.com/s/x'
    page = '<html><div id="js_content"></div><script>var item_show_type = "10";</script></html>'
    with tempfile.TemporaryDirectory() as d:
        p = md_file(d, url)
        wa.process(p, fake({url: page}))
        assert '读取失败：打开了页面，但没找到正文和图片（版式 item_show_type=10）' in open(p, encoding='utf-8').read()


def test_no_link_no_change():
    with tempfile.TemporaryDirectory() as d:
        p = md_file(d, '只是谢谢')
        before = open(p, encoding='utf-8').read()
        assert wa.process(p, fake({})) == []
        assert open(p, encoding='utf-8').read() == before


if __name__ == '__main__':
    for name, f in list(globals().items()):
        if name.startswith('test_'):
            f()
            print('ok', name)
