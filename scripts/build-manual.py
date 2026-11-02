#!/usr/bin/env python3
"""Gera public/manual.html (manual com visual do Hanne) a partir de docs/MANUAL_USUARIO.md.
Uso: python3 scripts/build-manual.py   (precisa do pacote Python "markdown")."""
import re, pathlib, markdown
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'docs' / 'MANUAL_USUARIO.md').read_text(encoding='utf-8')
md = markdown.Markdown(extensions=['tables', 'toc', 'sane_lists'], extension_configs={'toc': {'permalink': False, 'toc_depth': '2-3'}})
# Os links entre guias (.md) apontam para o site: mantém só os que existem aqui.
src = src.replace('[WHATSAPP_NA_ORACLE.md](WHATSAPP_NA_ORACLE.md)', 'guia de instalação do conector')
body = md.convert(src)
# Callouts: blockquote que começa com **Dica/Importante/Atenção/Em uma frase**
def callout(m):
    inner = m.group(1)
    kind = 'note'
    label = re.match(r'\s*<p><strong>([^<:]+):?</strong>', inner)
    if label:
        t = label.group(1).lower()
        kind = 'tip' if t.startswith('dica') else 'warn' if t.startswith(('atenção', 'importante')) else 'sum' if t.startswith('em uma') else 'note'
    return f'<aside class="callout {kind}">{inner}</aside>'
body = re.sub(r'<blockquote>(.*?)</blockquote>', callout, body, flags=re.S)
# Tabelas dentro de um contêiner que rola no celular
body = body.replace('<table>', '<div class="tw"><table>').replace('</table>', '</table></div>')
# Sumário lateral: só os h2
toc = [(m.group(1), re.sub(r'<.*?>', '', m.group(2))) for m in re.finditer(r'<h2 id="([^"]+)">(.*?)</h2>', body)]
toc = [(i, t) for i, t in toc if t.strip().lower() != 'sumário']
# Remove o sumário em markdown (a lista numerada logo após "Sumário") e a primeira linha de título
body = re.sub(r'<h2 id="sumario">.*?</h2>\s*<ol>.*?</ol>', '', body, count=1, flags=re.S)
body = re.sub(r'<h1[^>]*>.*?</h1>', '', body, count=1, flags=re.S)
lead = re.search(r'<p>(Guia completo.*?)</p>', body, flags=re.S)
lead_html = lead.group(1) if lead else ''
body = body.replace(lead.group(0), '', 1) if lead else body
nav = ''.join(f'<a href="#{i}">{t}</a>' for i, t in toc)
html = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manual · Hanne</title><meta name="description" content="Manual completo do Hanne: atendimentos pelo WhatsApp, automação, orçamentos, tarefas e estoque.">
<link rel="icon" href="/favicon.svg">
<style>
:root{{--bg:#f6f4fb;--card:#fff;--ink:#1d1830;--muted:#625b78;--line:#e4dff0;--accent:#6d4cc2;--accent-soft:#efe9fb;--tip:#e8f6ef;--tipc:#14684a;--warn:#fff3e0;--warnc:#8a4b00;--sum:#efe9fb;--code:#f0ecf8}}
@media(prefers-color-scheme:dark){{:root{{--bg:#0f0d17;--card:#171424;--ink:#f1eefb;--muted:#a9a2c2;--line:#2a2540;--accent:#a68cf2;--accent-soft:#251f3b;--tip:#10261e;--tipc:#7fe0b6;--warn:#2b2113;--warnc:#f4cf8a;--sum:#251f3b;--code:#211c33}}}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth;scroll-padding-top:84px}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}}
header.top{{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;padding:12px clamp(16px,4vw,40px);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}}
.logo{{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#8a63e6,#5b3fb0);color:#fff;font:italic 700 20px Georgia,serif}}
.brand{{font-weight:700;letter-spacing:-.01em}}.brand small{{display:block;font-weight:500;color:var(--muted);font-size:12px;line-height:1.1}}
header.top a.back{{margin-left:auto;color:var(--accent);text-decoration:none;font-weight:600;font-size:14px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:var(--card)}}
.hero{{padding:clamp(28px,6vw,64px) clamp(16px,4vw,40px) 12px;max-width:1120px;margin:0 auto}}
.hero .kicker{{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);background:var(--accent-soft);padding:5px 12px;border-radius:999px}}
.hero h1{{font-size:clamp(34px,6vw,56px);line-height:1.05;margin:14px 0 12px;letter-spacing:-.03em}}.hero h1 em{{font-family:Georgia,serif;color:var(--accent)}}
.hero p{{max-width:680px;color:var(--muted);font-size:18px;margin:0}}
.wrap{{display:grid;grid-template-columns:240px minmax(0,1fr);gap:clamp(20px,4vw,56px);max-width:1120px;margin:0 auto;padding:24px clamp(16px,4vw,40px) 80px}}
nav.side{{position:sticky;top:84px;align-self:start;display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 110px);overflow:auto;padding-right:6px}}
nav.side a{{color:var(--muted);text-decoration:none;font-size:14px;padding:7px 12px;border-radius:10px;line-height:1.35}}nav.side a:hover{{background:var(--accent-soft);color:var(--accent)}}
nav.side a.on{{background:var(--accent-soft);color:var(--accent);font-weight:650}}
main{{min-width:0}}
main h2{{font-size:clamp(24px,3.4vw,32px);letter-spacing:-.02em;margin:56px 0 14px;padding-top:30px;border-top:1px solid var(--line);line-height:1.2}}
main h2:first-of-type{{margin-top:8px;border-top:0;padding-top:0}}
main h3{{font-size:20px;margin:34px 0 8px;letter-spacing:-.01em}}
main p,main li{{max-width:72ch}}main ul,main ol{{padding-left:1.3em}}main li{{margin:5px 0}}
main a{{color:var(--accent);text-underline-offset:3px}}main hr{{display:none}}
main code{{background:var(--code);padding:2px 7px;border-radius:7px;font:600 .88em ui-monospace,SFMono-Regular,Menlo,monospace}}
.tw{{overflow-x:auto;margin:16px 0 22px;border:1px solid var(--line);border-radius:14px;background:var(--card)}}
table{{border-collapse:collapse;width:100%;min-width:480px;font-size:15px}}th,td{{text-align:left;padding:11px 14px;vertical-align:top;border-bottom:1px solid var(--line)}}
th{{background:var(--accent-soft);color:var(--accent);font-size:12.5px;letter-spacing:.05em;text-transform:uppercase}}tr:last-child td{{border-bottom:0}}td:first-child{{font-weight:600}}
.callout{{margin:20px 0;padding:14px 18px;border-radius:14px;border:1px solid var(--line);background:var(--card);max-width:72ch}}.callout p{{margin:0}}
.callout.tip{{background:var(--tip);border-color:transparent;color:var(--tipc)}}.callout.warn{{background:var(--warn);border-color:transparent;color:var(--warnc)}}.callout.sum{{background:var(--sum);border-color:transparent;font-size:17px}}
.callout strong{{font-weight:750}}
footer{{max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,40px) 50px;color:var(--muted);font-size:13px}}
@media(max-width:860px){{.wrap{{grid-template-columns:minmax(0,1fr)}}nav.side{{position:static;flex-direction:row;overflow-x:auto;max-height:none;padding:0 0 10px;margin:0 -4px;gap:6px}}nav.side a{{white-space:nowrap;border:1px solid var(--line);background:var(--card)}}}}
@media print{{header.top,nav.side{{display:none}}.wrap{{display:block}}body{{background:#fff;color:#000}}main h2{{break-after:avoid}}.tw{{overflow:visible}}}}
</style></head><body>
<header class="top"><span class="logo" aria-hidden="true">h</span><span class="brand">hanne.<small>Manual</small></span><a class="back" href="/">← Voltar ao sistema</a></header>
<section class="hero"><span class="kicker">Manual completo</span><h1>Seu ateliê, <em>em dia.</em></h1><p>{lead_html}</p></section>
<div class="wrap"><nav class="side" aria-label="Seções do manual">{nav}</nav><main>{body}</main></div>
<footer>Este manual acompanha a versão atual do Hanne. Para imprimir ou salvar em PDF, use o menu de impressão do navegador.</footer>
<script src="/manual.js" defer></script>
</body></html>'''
(root / 'public' / 'manual.html').write_text(html, encoding='utf-8')
(root / 'public' / 'manual.js').write_text('''/* Destaca no sumário a seção que está na tela. */
(function () {
  var links = [].slice.call(document.querySelectorAll('nav.side a'));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
  var heads = [].slice.call(document.querySelectorAll('main h2[id]'));
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove('on'); });
      var a = map[e.target.id]; if (a) { a.classList.add('on'); if (a.scrollIntoView && window.innerWidth <= 860) a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    });
  }, { rootMargin: '-90px 0px -70% 0px' });
  heads.forEach(function (h) { io.observe(h); });
})();
''', encoding='utf-8')
print('ok', len(html))
