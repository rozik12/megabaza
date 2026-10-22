# Генерирует статические страницы товаров (site/p/<id>.html) и sitemap.xml для поисковиков.
# Запуск из корня репозитория: python3 tools/gen_pages.py https://rozik12.github.io/megabaza
import json, sys, html, os, shutil
base = (sys.argv[1] if len(sys.argv) > 1 else 'https://rozik12.github.io/megabaza').rstrip('/')
d = json.load(open('site/products.json', encoding='utf8')); cats = {c['id']: c['name'] for c in d['categories']}
os.makedirs('site/p', exist_ok=True)
for f in os.listdir('site/p'): os.remove('site/p/' + f)
E = html.escape
urls = [base + '/']
for p in d['products']:
    name = p['name']; cat = cats.get(p['cat'], ''); price = p['price']; pr = f"{price:,}".replace(',', ' ')
    title = f"{name} — купить в Ташкенте | MEGABAZA"; desc = f"{name}: {pr} сум. {cat}. Доставка по Ташкенту, самовывоз, гарантия. Заказ онлайн или в Telegram."
    ld = json.dumps({"@context": "https://schema.org", "@type": "Product", "name": name, "category": cat, "description": desc, "offers": {"@type": "Offer", "priceCurrency": "UZS", "price": price, "availability": "https://schema.org/InStock", "url": f"{base}/p/{p['id']}.html"}}, ensure_ascii=False)
    page = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}"><link rel="canonical" href="{base}/p/{p['id']}.html">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:type" content="product"><meta property="og:image" content="{base}/logo.png">
<meta http-equiv="refresh" content="0;url=../?p={p['id']}"><script type="application/ld+json">{ld}</script>
<link rel="stylesheet" href="../css/style.css"></head><body><div class="wrap" style="padding:40px 16px;text-align:center">
<h1>{E(name)}</h1><p class="muted">{E(cat)}</p><p style="font-size:24px;font-weight:800">{pr} сум</p>
<p><a class="btn" style="display:inline-block;text-decoration:none" href="../?p={p['id']}">Открыть в магазине</a></p>
<script>location.replace('../?p={p['id']}')</script></div></body></html>'''
    open(f"site/p/{p['id']}.html", 'w', encoding='utf8').write(page); urls.append(f"{base}/p/{p['id']}.html")
open('site/sitemap.xml', 'w', encoding='utf8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')
open('site/robots.txt', 'w').write(f"User-agent: *\nDisallow: /admin.html\nSitemap: {base}/sitemap.xml\n")
print(len(urls) - 1, 'product pages')
