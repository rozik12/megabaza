/* MEGABAZA — витрина. Один файл, без фреймворков. */
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const S = { cats: [], products: [], cat: 'all', q: '', sort: 'new', brand: '', car: '', stockOnly: false, pmin: 0, pmax: 0,
  season: '', deals: false, fw: '', fh: '', fd: '', favs: new Set(ls('favs', [])), garage: [], settings: {}, me: null, delivery: 'delivery', promoPct: 0, promo: '', cmp: [] };
S.car = ls('mycar', ''); let cart = ls('cart', {}), recent = ls('recent', []);
const byId = id => S.products.find(p => p.id == id);
const priceOf = p => (S.me && S.me.wholesale && p.wholesale_price) ? +p.wholesale_price : +p.price;
const isTire = p => (p.cat || '').startsWith('tires_');
const sizeOf = p => { const m = (p.name || '').match(/(\d{3})\/(\d{2})\s*R(\d{2}(?:\.\d)?)/); return m ? { w: m[1], h: m[2], d: m[3] } : null; };
const seasonOf = p => /всесезон/i.test(p.name) ? 'all' : /зимн/i.test(p.name) ? 'winter' : /летн/i.test(p.name) ? 'summer' : '';
const KIT_PCT = 0;
const unit = (p, q) => isTire(p) && q >= 4 ? Math.round(priceOf(p) * (100 - KIT_PCT) / 100) : priceOf(p);
const isDeal = p => p.badge || (p.old_price && +p.old_price > priceOf(p));
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const st = k => S.settings[k] || '';
const ICONS = { tires_car: '🚗', tires_lt: '🚐', tires_suv: '🚙', tires_truck: '🚛', disks: '⚙️', accessories: '🔧', services: '🛠', engine: '⚙️', suspension: '🔩', brakes: '🛑', electrics: '⚡', body: '🚘', steering: '🎛', filters: '🧰', ignition: '🔥', cooling: '❄️', transmission: '⚙️', fluids: '🛢' };
const catIcon = id => ICONS[id] || '🛞';
const TIRE_SVG = `<svg viewBox="0 0 100 100" class="phsvg" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="#2b2d3a"/><circle cx="50" cy="50" r="27" fill="#dfe1ea"/><circle cx="50" cy="50" r="9" fill="#2b2d3a"/>${[0, 72, 144, 216, 288].map(a => `<rect x="48.2" y="25" width="3.6" height="15" rx="1.8" fill="#9ea2b5" transform="rotate(${a} 50 50)"/>`).join('')}</svg>`;
const imgOf = p => p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : (isTire(p) ? TIRE_SVG : `<span class="phico">${catIcon(p.cat)}</span>`);

/* ---------- данные ---------- */
const COLS = 'id,category,name,car,brand,price,in_stock,image_url,description,sku,badge,old_price,stock,wholesale_price';
async function loadCatalog() {
  if (sb) {
    try {
      let [c, p] = await Promise.all([sb.from('categories').select('id,name').order('sort'), sb.from('products').select(COLS).eq('active', true).order('id', { ascending: false })]);
      if (p.error) p = await sb.from('products').select('id,category,name,car,brand,price,in_stock').eq('active', true).order('id', { ascending: false });
      if (!c.error && !p.error && p.data.length) { S.cats = c.data; S.products = p.data.map(x => ({ ...x, cat: x.category, price: +x.price })); lsSet('catalog', { c: S.cats, p: S.products }); return; }
    } catch {}
    const cached = ls('catalog', null);
    if (cached) { S.cats = cached.c; S.products = cached.p; $('offline').hidden = false; return; }
  }
  const d = await (await fetch('products.json')).json();
  S.cats = d.categories; S.products = d.products.map(x => ({ ...x, in_stock: true }));
}
async function loadExtras() {
  if (!sb) return;
  const [s, b] = await Promise.all([sb.from('settings').select('key,value'), sb.from('banners').select('title,text,link').eq('active', true).order('sort')]);
  if (!s.error) s.data.forEach(r => S.settings[r.key] = r.value);
  if (!b.error && b.data.length) { S.dbBanners = true; drawSlider(b.data); }
  drawContacts();
}
const defaultSlides = () => [{ title: t('sl1t'), text: t('sl1d'), link: '#grid' }, { title: t('sl2t2'), text: t('sl2d2'), link: '#grid' }, { title: t('sl3t'), text: t('sl3d'), link: 'https://t.me/' + (CFG.bot || '') }];
let slideTimer;
function drawSlider(list) {
  const el = $('slider'); el.hidden = false;
  el.innerHTML = list.map((b, i) => `<div class="slide ${i ? '' : 'on'}"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p>${b.link ? `<a href="${esc(b.link)}" rel="noopener">${t('slBtn')} →</a>` : ''}</div>`).join('');
  clearInterval(slideTimer);
  if (list.length > 1) { let i = 0; slideTimer = setInterval(() => { const s = el.children; s[i].classList.remove('on'); i = (i + 1) % s.length; s[i].classList.add('on'); }, 5000); }
}
function drawContacts() {
  const ph = st('phone'), tg = st('telegram'), wa = st('whatsapp').replace(/\D/g, ''), ig = st('instagram');
  $('contactInfo').innerHTML = `<p>${shopOpen() ? '🟢 ' + t('openNow') : '🔴 ' + t('closedNow')}</p>${ph ? `<p>📞 <a href="tel:${esc(ph.replace(/\s/g, ''))}">${esc(ph)}</a></p>` : ''}${st('address') ? `<p>📍 ${esc(st('address'))}</p>` : ''}<p>🕘 ${t('hours')}: ${esc(st('hours_from') || 9)}:00–${esc(st('hours_to') || 19)}:00</p>`;
  $('contactBtns').innerHTML = [ph && `<a class="btn" href="tel:${esc(ph.replace(/\s/g, ''))}">${t('call')}</a>`, tg && `<a class="ghost sm" style="padding:10px 14px;text-decoration:none" href="https://t.me/${esc(tg)}" rel="noopener">Telegram</a>`,
    wa && `<a class="ghost sm" style="padding:10px 14px;text-decoration:none" href="https://wa.me/${wa}" rel="noopener">WhatsApp</a>`, ig && `<a class="ghost sm" style="padding:10px 14px;text-decoration:none" href="${esc(ig)}" rel="noopener">Instagram</a>`].filter(Boolean).join('');
  if (ph) $('callBtn').href = 'tel:' + ph.replace(/\s/g, '');
  const q = st('address') || st('map_query'); if (q) { $('map').src = 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed'; $('map').hidden = false; }
}

/* ---------- каталог ---------- */
const matchQ = (p, q) => { const h = (p.name + ' ' + p.car + ' ' + p.brand + ' ' + (p.sku || '')).toLowerCase(); return q.split(/\s+/).every(w => h.includes(w)); };
function filtered() {
  const q = S.q.trim().toLowerCase(), q2 = q && swapLayout(q);
  let l = S.products.filter(p => (S.cat === 'all' || p.cat === S.cat) && (!S.brand || p.brand === S.brand) && (!S.stockOnly || p.in_stock)
    && (!S.pmin || priceOf(p) >= S.pmin) && (!S.pmax || priceOf(p) <= S.pmax)
    && (!S.car || (p.car || '').toLowerCase().includes(S.car) || /универс|universal/i.test(p.car || ''))
    && (!S.deals || isDeal(p)) && (!S.season || seasonOf(p) === S.season) && (!S.fw || (sizeOf(p) || {}).w === S.fw) && (!S.fh || (sizeOf(p) || {}).h === S.fh) && (!S.fd || (sizeOf(p) || {}).d === S.fd)
    && (!q || matchQ(p, q) || matchQ(p, q2)));
  if (S.sort === 'asc') l.sort((a, b) => priceOf(a) - priceOf(b)); else if (S.sort === 'desc') l.sort((a, b) => priceOf(b) - priceOf(a)); else if (S.sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return l;
}
const cardAct = p => { const q = cart[p.id] || 0; if (!p.in_stock) return `<button class="ghost wide" data-open="${p.id}">${t('out')}</button>`; return q ? `<div class="stepper"><button data-d="-1" data-id="${p.id}" aria-label="-">−</button><span>${q}</span><button data-d="1" data-id="${p.id}" aria-label="+">+</button></div>` : `<button class="btn wide" data-add="${p.id}">${t('add')}</button>`; };
function refreshActs() { document.querySelectorAll('[data-act]').forEach(el => { const p = byId(el.dataset.act); if (p) el.innerHTML = cardAct(p); }); }
function cardHtml(p) {
  const pr = priceOf(p), low = p.stock != null && p.stock > 0 && p.stock <= 5, pct = p.old_price && +p.old_price > pr ? Math.round((1 - pr / p.old_price) * 100) : 0;
  return `<div class="card"><div class="img" data-open="${p.id}">${imgOf(p)}${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}<button class="heart ${S.favs.has(p.id) ? 'on' : ''}" data-fav="${p.id}" aria-label="fav">♥</button></div>
    <div class="cbd"><div class="price"><b>${money(pr)}</b></div>${pct ? `<div class="old2"><s>${money(p.old_price)}</s> <span class="disc">−${pct}%</span></div>` : ''}
    <h3 data-open="${p.id}">${esc(p.name)}</h3><div class="meta">${esc(p.car)}${p.brand ? ' · ' + esc(p.brand) : ''}</div>${p.sku ? `<div class="meta">${esc(p.sku)}</div>` : ''}
    ${low ? `<div class="meta red">${t('left')} ${p.stock} ${t('pcs')}</div>` : (isTire(p) && KIT_PCT ? `<div class="meta">🎁 ${t('kitS')}</div>` : '')}
    <div class="cact" data-act="${p.id}">${cardAct(p)}</div></div></div>`;
}
const filtersActive = () => !!(S.q || S.brand || S.car || S.stockOnly || S.pmin || S.pmax || S.deals || S.season || S.fw || S.cat !== 'all');
function renderHits() { const hs = S.products.filter(p => p.in_stock && (p.badge || isDeal(p))).slice(0, 12); $('hitsBox').hidden = filtersActive() || !hs.length; $('hits').innerHTML = hs.map(cardHtml).join(''); }
function fillMega() { $('mega').innerHTML = S.cats.map(c => `<button class="mitem" data-c="${esc(c.id)}"><span class="cico">${catIcon(c.id)}</span><span>${esc(c.name)}</span></button>`).join(''); }
function renderFinder() {
  const sz = S.products.map(sizeOf).filter(Boolean), uniq = a => [...new Set(a)].sort((x, y) => x - y);
  const W = uniq(sz.map(x => x.w)), H = uniq(sz.filter(x => !S.fw || x.w === S.fw).map(x => x.h)), D = uniq(sz.filter(x => (!S.fw || x.w === S.fw) && (!S.fh || x.h === S.fh)).map(x => x.d));
  const opt = (arr, cur, lab, pre = '') => `<option value="">${lab}</option>` + arr.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${pre}${v}</option>`).join('');
  $('fw').innerHTML = opt(W, S.fw, t('f_w')); $('fh').innerHTML = opt(H, S.fh, t('f_h')); $('fd').innerHTML = opt(D, S.fd, t('f_d'), 'R');
}
function shopOpen() { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }).format(new Date()); return h >= (+st('hours_from') || 9) && h < (+st('hours_to') || 19); }
function downloadPrice() {
  const rows = [['ID', 'Category', 'Name', 'Price', 'Stock']].concat(S.products.map(p => [p.id, (S.cats.find(c => c.id === p.cat) || {}).name || '', p.name, priceOf(p), p.in_stock ? (p.stock ?? 'yes') : 0]));
  const csv = '\ufeff' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'megabaza-prices.csv'; a.click();
}
const PAGE_N = 24; let moreObs = null;
function gridMore(l) { return l.length > S.shown ? `<div class="more" id="more"><button class="ghost wide" data-more="1">${t('showMore')} (${l.length - S.shown})</button></div>` : ''; }
function watchMore() {
  if (moreObs) moreObs.disconnect(); const el = $('more'); if (!el || !('IntersectionObserver' in window)) return;
  moreObs = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) showMore(); }, { rootMargin: '600px' }); moreObs.observe(el);
}
function showMore() {
  const l = filtered(), from = S.shown; if (from >= l.length) return; S.shown = from + PAGE_N;
  const old = $('more'); if (old) old.remove(); $('grid').insertAdjacentHTML('beforeend', l.slice(from, S.shown).map(cardHtml).join('') + gridMore(l)); watchMore();
}
function modelList() {
  const m = new Map();
  S.products.forEach(p => (p.car || '').replace(/Chevrolet\s*/gi, '').replace(/\([^)]*\)/g, '').split(/[\/,]/).map(x => x.trim()).filter(x => /^[A-Za-z]/.test(x)).forEach(x => { const k = x.toLowerCase(); if (!m.has(k)) m.set(k, { k, name: x, n: 0 }); }));
  m.forEach(v => { v.n = S.products.filter(p => (p.car || '').toLowerCase().includes(v.k)).length; });
  return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
function renderCarPick() {
  const ms = modelList(), cur = ms.find(x => x.k === S.car);
  $('cpModel').innerHTML = `<option value="">${t('cpModel')}</option>` + ms.map(x => `<option value="${esc(x.k)}" ${x.k === S.car ? 'selected' : ''}>${esc(x.name)} (${x.n})</option>`).join('');
  const base = S.car ? S.products.filter(p => (p.car || '').toLowerCase().includes(S.car)) : S.products;
  $('cpCat').innerHTML = `<option value="all">${t('cpAll')} (${base.length})</option>` + S.cats.map(c => [c, base.filter(p => p.cat === c.id).length]).filter(x => x[1]).map(([c, n]) => `<option value="${esc(c.id)}" ${c.id === S.cat ? 'selected' : ''}>${esc(c.name)} (${n})</option>`).join('');
  $('cpChips').innerHTML = `<span>${t('cpPop')}</span>` + ms.slice(0, 8).map(x => `<button class="chip ${x.k === S.car ? 'on' : ''}" data-model="${esc(x.k)}">${esc(x.name)}</button>`).join('');
  const now = $('cpNow'); now.hidden = !S.car; if (S.car) now.innerHTML = `<span>🚗 ${t('cpFor')} <b>${esc(cur ? cur.name : S.car)}</b></span><button class="ghost sm" data-model="">${t('cpReset')}</button>`;
}
function setModel(k) { S.car = k || ''; S.cat = 'all'; lsSet('mycar', S.car); render(); }
function render() {
  $('chips').innerHTML = [{ id: 'all', name: t('all') }, ...S.cats].map(c => `<button class="ctile ${c.id === S.cat ? 'on' : ''}" data-c="${esc(c.id)}"><span class="cico">${c.id === 'all' ? '🛍' : catIcon(c.id)}</span><span>${esc(c.name)}</span></button>`).join('');
  $('chips2').innerHTML = `<button class="chip ${S.deals ? 'on' : ''}" data-deals="1">🔥 ${t('deals')}</button>` + ['summer', 'winter', 'all'].map(k => `<button class="chip ${S.season === k ? 'on' : ''}" data-season="${k}">${t('s_' + k)}</button>`).join('');
  const tires = S.products.some(isTire); { const pb = document.querySelector('.promo span'); pb.dataset.i = 'promoBar2'; pb.textContent = t(pb.dataset.i); } $('finder').hidden = !tires; $('chips2').querySelectorAll('[data-season]').forEach(b => b.hidden = !tires);
  renderFinder(); fillMega(); renderHits(); renderCarPick();
  const brands = [...new Set(S.products.map(p => p.brand).filter(Boolean))].sort();
  $('brand').innerHTML = `<option value="">${t('allbrands')}</option>` + brands.map(b => `<option ${b === S.brand ? 'selected' : ''}>${esc(b)}</option>`).join('');
  const models = [...new Set(S.products.flatMap(p => (p.car || '').replace(/Chevrolet\s*/gi, '').replace(/\([^)]*\)/g, '').split(/[\/,]/).map(x => x.trim()).filter(x => /^[A-Za-z]/.test(x))))].sort();
  $('car').innerHTML = `<option value="">${t('anycar')}</option>` + models.map(m => `<option value="${esc(m.toLowerCase())}" ${m.toLowerCase() === S.car ? 'selected' : ''}>${esc(m)}</option>`).join('') + S.garage.map(g => `<option value="${esc(g.model.toLowerCase())}" ${g.model.toLowerCase() === S.car ? 'selected' : ''}>${t('mycar')}: ${esc(g.make)} ${esc(g.model)}</option>`).join('');
  const sig = JSON.stringify([S.cat, S.q, S.brand, S.car, S.stockOnly, S.pmin, S.pmax, S.deals, S.season, S.fw, S.fh, S.fd, S.sort]); if (sig !== S._sig) { S._sig = sig; S.shown = PAGE_N; }
  const l = filtered();
  $('foundN').textContent = (S.q || S.brand || S.car || S.stockOnly || S.pmin || S.pmax || S.deals || S.season || S.fw || S.cat !== 'all') ? `${t('found')} ${l.length}` : '';
  $('grid').innerHTML = (l.slice(0, S.shown).map(cardHtml).join('') + gridMore(l)) || `<p class="empty" style="grid-column:1/-1">${t('nothing')}</p>`; watchMore();
  $('favCount').hidden = !S.favs.size; $('favCount').textContent = S.favs.size;
  const rl = recent.map(byId).filter(Boolean);
  $('recentBox').hidden = !rl.length; $('recent').innerHTML = rl.map(cardHtml).join('');
}

/* ---------- избранное ---------- */
async function toggleFav(id) {
  id = +id; const on = !S.favs.has(id);
  on ? S.favs.add(id) : S.favs.delete(id);
  if (S.me) { on ? await sb.from('favorites').upsert({ user_id: S.me.id, product_id: id }) : await sb.from('favorites').delete().match({ user_id: S.me.id, product_id: id }); }
  else lsSet('favs', [...S.favs]);
  render(); if (!$('profModal').classList.contains('open')) return; profTab('favs');
}

/* ---------- страница товара ---------- */
async function openProduct(id) {
  const p = byId(id); if (!p) return;
  recent = [p.id, ...recent.filter(x => x != p.id)].slice(0, 8); lsSet('recent', recent);
  history.replaceState(null, '', '?p=' + p.id); document.title = p.name + ' — MEGABAZA';
  const pr = priceOf(p), analogs = S.products.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 6);
  $('prodBody').innerHTML = `<div style="display:flex;justify-content:space-between"><h2>${esc(p.name)}</h2><button class="ghost sm" data-x="prod">✕</button></div>
    <div class="pgrid"><div class="pimg">${imgOf(p)}</div><div style="display:flex;flex-direction:column;gap:8px">
      <div class="price" style="font-size:26px">${money(pr)}${p.old_price && +p.old_price > pr ? `<span class="old">${money(p.old_price)}</span>` : ''}</div>
      ${S.me && S.me.wholesale && p.wholesale_price ? `<span class="status">${t('wholesale')}</span>` : ''}
      <div class="meta">${t('sku')}: ${esc(p.sku || '—')}</div><div class="meta">${t('brand')}: ${esc(p.brand || '—')}</div><div class="meta">${t('car')}: ${esc(p.car || '—')}</div>
      <div class="meta">${p.in_stock ? (p.stock != null ? `${t('left')} ${p.stock} ${t('pcs')}` : '✓ ' + t('yes')) : t('out')}</div>
      <p>${esc(p.description)}</p>
      <div class="kv">${p.in_stock ? `<button class="btn" data-add="${p.id}">${t('add')}</button>` : `<button class="btn" data-alert="${p.id}">${t('notify')}</button>`}
        <button class="ghost sm" data-fav="${p.id}">♥</button><button class="ghost sm" data-cmp="${p.id}">${t('compare')} (${S.cmp.length})</button>
        <button class="ghost sm" data-share="${p.id}">${t('share')}</button><button class="ghost sm" data-ask="${p.id}">💬 ${t('ask')}</button></div></div></div>
    ${analogs.length ? `<h3 style="margin-top:12px">${t('analogs')}</h3><div class="mini">${analogs.map(cardHtml).join('')}</div>` : ''}
    <h3>${t('reviews')}</h3><div id="revs" class="muted">…</div>
    <form id="revForm" data-pid="${p.id}" style="display:flex;flex-direction:column;gap:8px"><select id="rStars">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${stars(n)}</option>`).join('')}</select>
      <textarea id="rText" rows="2" maxlength="1000" placeholder="${t('writerev')}"></textarea><button class="btn">${t('send')}</button></form>`;
  let ld = document.getElementById('ldp'); if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ldp'; document.head.appendChild(ld); }
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku || String(p.id), image: p.image_url || undefined, description: p.description || p.name, offers: { '@type': 'Offer', priceCurrency: 'UZS', price: pr, availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } });
  $('prodModal').classList.add('open'); render();
  if (sb) { const { data } = await sb.rpc('product_reviews', { pid: p.id }); $('revs').innerHTML = (data || []).map(r => `<div class="rev"><span class="stars">${stars(r.rating)}</span> <b>${esc(r.author)}</b><br>${esc(r.body)}</div>`).join('') || t('noreviews'); }
  if (typeof gtag === 'function') gtag('event', 'view_item', { items: [{ item_id: p.id, item_name: p.name }] });
}
function closeProduct() { $('prodModal').classList.remove('open'); history.replaceState(null, '', location.pathname); document.title = 'MEGABAZA — центр автозапчастей'; }
function openCompare() {
  const l = S.cmp.map(byId).filter(Boolean); if (l.length < 2) return;
  const row = (k, f) => `<tr><th>${t(k)}</th>${l.map(p => `<td>${f(p)}</td>`).join('')}</tr>`;
  $('cmpBody').innerHTML = `<table class="cmp" style="width:100%;border-collapse:collapse"><tr><th></th>${l.map(p => `<th>${esc(p.name)}</th>`).join('')}</tr>${row('price', p => money(priceOf(p)))}${row('brand', p => esc(p.brand))}${row('car', p => esc(p.car))}${row('sku', p => esc(p.sku))}${row('stock', p => p.in_stock ? t('yes') : t('no'))}</table>`;
  $('cmpModal').classList.add('open');
}

/* ---------- корзина ---------- */
const maxQty = p => p && p.stock != null ? Math.max(1, p.stock) : 99;
const normPhone = v => { const d = String(v).replace(/\D/g, ''); if (d.length === 9) return '+998' + d; if (d.length === 12 && d.startsWith('998')) return '+' + d; return null; };
function maskPhone(el) { let d = el.value.replace(/\D/g, ''); if (!d.startsWith('998')) d = '998' + d.replace(/^9?9?8?/, ''); d = d.slice(0, 12); const g = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean); el.value = d.length ? '+' + g.join(' ') : ''; }
let syncT; const scheduleSync = () => { if (!S.me || !sb) return; clearTimeout(syncT); syncT = setTimeout(() => sb.from('carts').upsert({ user_id: S.me.id, items: cart, updated_at: new Date().toISOString() }), 700); };
async function loadCloudCart() {
  const { data } = await sb.from('carts').select('items').eq('user_id', S.me.id).maybeSingle(); const remote = (data && data.items) || {}; let ch = false;
  for (const [id, q] of Object.entries(remote)) if (byId(id) && (cart[id] || 0) < q) { cart[id] = Math.min(q, maxQty(byId(id))); ch = true; }
  if (ch || Object.keys(cart).length) { lsSet('cart', cart); drawCart(); scheduleSync(); }
}
const saveCart = () => { lsSet('cart', cart); drawCart(); refreshActs(); scheduleSync(); };
function sums() {
  const ids = Object.keys(cart).filter(byId); let sub = 0, kit = 0; ids.forEach(id => { const p = byId(id), q = cart[id]; sub += unit(p, q) * q; kit += (priceOf(p) - unit(p, q)) * q; });
  const disc = Math.round(sub * S.promoPct / 100), feeS = +st('delivery_fee') || 0, freeS = +st('free_delivery_from') || 0;
  const fee = S.delivery === 'delivery' && ids.length && (!freeS || sub - disc < freeS) ? feeS : 0;
  return { ids, sub, kit, disc, fee, total: sub - disc + fee };
}
function drawCart() {
  const s = sums();
  $('count').textContent = $('mcount').textContent = s.ids.reduce((n, id) => n + cart[id], 0);
  $('items').innerHTML = s.ids.map(id => { const p = byId(id), q = cart[id], up = unit(p, q), mx = maxQty(p);
    return `<div class="citem"><div class="cth">${imgOf(p)}</div><div class="cbody"><div class="cname" data-open="${id}">${esc(p.name)}</div>
      <div class="muted sm2">${money(up)}${up < priceOf(p) ? ' 🎁' : ''}${p.stock != null && p.stock <= 5 ? ' · ' + t('left') + ' ' + p.stock + ' ' + t('pcs') : ''}</div>
      <div class="qtyrow"><div class="qty"><button data-d="-1" data-id="${id}" aria-label="-">−</button><input class="qin" type="number" min="1" max="${mx}" value="${q}" data-qty="${id}" inputmode="numeric"><button data-d="1" data-id="${id}" aria-label="+">+</button></div>
      <b>${money(up * q)}</b><button class="ghost sm rm" data-rm="${id}" aria-label="remove">🗑</button></div></div></div>`; }).join('')
    || `<div class="empty">🛒<br>${t('empty')}<br><br><button class="btn" data-go="1">${t('startShopping')}</button></div>`;
  const freeS = +st('free_delivery_from') || 0, left = freeS - (s.sub - s.disc);
  $('ship').innerHTML = (S.delivery === 'delivery' && freeS && s.ids.length) ? (left > 0 ? `<div class="shipmsg">🚚 ${t('shipMore')} <b>${money(left)}</b></div><div class="pbar"><i style="width:${Math.min(100, Math.round((s.sub - s.disc) / freeS * 100))}%"></i></div>` : `<div class="shipmsg ok">🚚 ${t('shipFree')} ✓</div>`) : '';
  $('form').style.display = s.ids.length ? 'flex' : 'none';
  $('oName').style.display = S.me ? 'none' : ''; $('oAddr').style.display = S.delivery === 'delivery' ? '' : 'none';
  $('sums').innerHTML = `<div class="sumrow"><span>${t('sub')}</span><span>${money(s.sub + s.kit)}</span></div>${s.kit ? `<div class="sumrow"><span>🎁 ${t('kit')}</span><span>−${money(s.kit)}</span></div>` : ''}${s.disc ? `<div class="sumrow"><span>${t('discount')} ${S.promoPct}%</span><span>−${money(s.disc)}</span></div>` : ''}
    ${S.delivery === 'delivery' ? `<div class="sumrow"><span>${t('deliveryFee')}</span><span>${s.fee ? money(s.fee) : t('free')}</span></div>` : ''}<div style="font-weight:800;font-size:18px;display:flex;justify-content:space-between"><span>${t('total')}</span><span>${money(s.total)}</span></div>`;
  $('order').style.display = s.ids.length ? '' : 'none'; $('order').textContent = S.me ? t('order') : t('ordLogin');
  document.querySelectorAll('[data-dl]').forEach(b => b.classList.toggle('on', b.dataset.dl === S.delivery));
}
async function applyPromo() {
  const code = $('oPromo').value.trim().toUpperCase(); if (!code || !sb) return;
  const { data } = await sb.rpc('check_promo', { p_code: code, p_total: sums().sub });
  S.promoPct = data || 0; S.promo = S.promoPct ? code : ''; toast(S.promoPct ? `${t('promoOk')} ${S.promoPct}%` : t('promoBad')); drawCart();
}
function badField(id, msg) { const e = $(id); e.classList.add('bad'); $('oErr').textContent = msg; e.focus(); setTimeout(() => e.classList.remove('bad'), 2500); return false; }
async function placeOrder() {
  if (!sb) return toast(t('err'));
  const name = $('oName').value.trim(), phone = normPhone($('oPhone').value), addr = $('oAddr').value.trim();
  if (!S.me && name.length < 2) return badField('oName', t('badName'));
  if (!phone) return badField('oPhone', t('badPhone2'));
  if (S.delivery === 'delivery' && addr.length < 5) return badField('oAddr', t('needFields'));
  $('oErr').textContent = ''; $('order').disabled = true;
  const items = sums().ids.map(id => ({ id: +id, qty: cart[id] }));
  const { data, error } = await sb.rpc('place_order', { items, p_phone: phone, p_address: addr, p_comment: [$('oSlot').value, $('oNote').value.trim()].filter(Boolean).join(' | '), p_delivery: S.delivery, p_payment: $('oPay').value, p_promo: S.promo, p_name: name });
  $('order').disabled = false;
  if (error) { $('oErr').textContent = t('orderErr'); return; }
  const total = sums().total; cart = {}; S.promoPct = 0; S.promo = ''; $('oPromo').value = ''; saveCart(); $('drawer').classList.remove('open');
  if (S.me && addr && addr !== S.me.address) { sb.from('profiles').update({ address: addr, phone }).eq('id', S.me.id).then(() => { S.me.address = addr; }); }
  $('doneTitle').textContent = t('doneTitle'); $('doneText').innerHTML = `${t('doneN')}: <b>№${data}</b><br><br>${S.me ? t('doneUser') : t('doneGuest')}`;
  $('doneOrders').textContent = S.me ? t('btnProfile') : t('tabReg'); $('doneOrders').dataset.guest = S.me ? '' : '1'; $('doneModal').classList.add('open');
  loadCatalog().then(render);
  if (typeof gtag === 'function') gtag('event', 'purchase', { transaction_id: data, value: total, currency: 'UZS' });
  if (typeof ym === 'function' && CFG.ymId) ym(CFG.ymId, 'reachGoal', 'order');
}

/* ---------- вход ---------- */
let mode = 'login';
function openAuth(m) { setMode(m || 'login'); $('authModal').classList.add('open'); $('aEmail').focus(); }
function setMode(m) {
  mode = m; $('aErr').textContent = '';
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  document.querySelectorAll('[data-reg]').forEach(e => e.hidden = m !== 'register');
  $('aSubmit').textContent = m === 'login' ? t('login') : t('create'); $('aPass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
}
async function submitAuth(e) {
  e.preventDefault(); if (!sb) return;
  const email = $('aEmail').value.trim().toLowerCase(), password = $('aPass').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $('aErr').textContent = t('badEmail'); return; }
  if (mode === 'login' && !password) { $('aErr').textContent = t('pass'); return; }
  let regPhone = '';
  if (mode === 'register') {
    if ($('aName').value.trim().length < 2) { $('aErr').textContent = t('badName'); return; }
    regPhone = normPhone($('aPhone').value); if (!regPhone) { $('aErr').textContent = t('badPhone2'); return; }
    if (password.length < 8) { $('aErr').textContent = t('badPass'); return; }
    if (!$('aTerms').checked) { $('aErr').textContent = t('needTerms'); return; }
  }
  $('aSubmit').disabled = true;
  const res = mode === 'login' ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password, options: { data: { full_name: $('aName').value.trim(), phone: regPhone } } });
  $('aSubmit').disabled = false;
  if (res.error) { $('aErr').textContent = authErrorText(res.error); return; }
  if (!res.data.session) { $('aErr').textContent = '✉ ' + (mode === 'register' ? t('confirmMail') : t('magicSent')); return; }
  $('authModal').classList.remove('open'); $('authForm').reset();
  if (mode === 'register') toast(t('welcomeUser'));
  if (typeof gtag === 'function' && mode === 'register') gtag('event', 'sign_up');
}
async function refreshUser() {
  S.me = await getProfile();
  $('authBtn').textContent = S.me ? (S.me.full_name || t('profile')).split(' ')[0] : t('login');
  $('adminLink').hidden = !(S.me && S.me.role === 'admin');
  if (S.me) {
    $('oPhone').value ||= S.me.phone || ''; $('oAddr').value ||= S.me.address || ''; maskPhone($('oPhone'));
    const [f, g] = await Promise.all([sb.from('favorites').select('product_id'), sb.from('garage').select('*').order('id')]);
    const local = [...S.favs]; S.favs = new Set((f.data || []).map(r => r.product_id));
    if (local.length) { await sb.from('favorites').upsert(local.map(id => ({ user_id: S.me.id, product_id: id }))); local.forEach(id => S.favs.add(id)); lsSet('favs', []); }
    S.garage = g.data || [];
  } else { S.garage = []; S.favs = new Set(ls('favs', [])); }
  render(); drawCart(); chat.setUser(S.me); if (S.me) loadCloudCart();
}

/* ---------- профиль ---------- */
async function profTab(tab) {
  document.querySelectorAll('[data-pt]').forEach(b => b.classList.toggle('on', b.dataset.pt === tab));
  const B = $('profBody'); B.dataset.tab = tab;
  if (tab === 'orders') {
    const { data } = await sb.from('orders').select('id,status,total,created_at,delivery,order_items(product_id,name,qty)').order('id', { ascending: false }).limit(50);
    B.innerHTML = (data || []).map(o => `<div class="tile" style="margin-top:8px"><div class="kv"><b>${t('order_n')}${o.id}</b><span class="status">${t('st_' + o.status)}</span><span class="muted">${new Date(o.created_at).toLocaleDateString('ru-RU')}</span></div>
      <div class="meta">${o.order_items.map(i => esc(i.name) + ' × ' + i.qty).join(', ')}</div><div class="kv"><b>${money(o.total)}</b><button class="ghost sm" data-repeat="${o.id}">${t('repeat')}</button></div></div>`).join('') || `<p class="empty">${t('noOrders')}</p>`;
    window._orders = data || [];
  } else if (tab === 'favs') {
    const l = [...S.favs].map(byId).filter(Boolean);
    B.innerHTML = l.map(p => `<div class="row" style="margin-top:8px"><span data-open="${p.id}" style="cursor:pointer">${esc(p.name)}<br><small class="muted">${money(priceOf(p))}</small></span><button class="btn sm" data-add="${p.id}">${t('add')}</button></div>`).join('') || `<p class="empty">${t('noFavs')}</p>`;
  } else if (tab === 'garage') {
    B.innerHTML = (S.garage.map(g => `<div class="row" style="margin-top:8px"><span>🚗 ${esc(g.make)} ${esc(g.model)} ${g.year || ''}<br><small class="muted">${esc(g.vin)}</small></span><span><button class="ghost sm" data-pickcar="${esc(g.model.toLowerCase())}">${t('pick')}</button> <button class="ghost sm" data-delcar="${g.id}">✕</button></span></div>`).join('') || `<p class="empty">${t('noCars')}</p>`)
      + `<form id="carForm" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><input id="gMake" placeholder="${t('make')}"><input id="gModel" placeholder="${t('model')}" required><input id="gYear" type="number" placeholder="${t('year')}"><input id="gVin" placeholder="${t('vin')}" maxlength="17"><button class="btn" style="grid-column:1/-1">${t('addCar')}</button></form>`;
  } else {
    B.innerHTML = `<form id="profForm" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><input id="pName" value="${esc(S.me.full_name)}" placeholder="${t('regName')}"><input id="pPhone" value="${esc(S.me.phone)}" placeholder="${t('phone')}"><div class="muted">${esc(S.me.email)}</div>
      <button class="btn">${t('save')}</button><button type="button" class="ghost" id="pReset">${t('forgot')}</button><button type="button" class="ghost" id="pOut">${t('logout')}</button></form>`;
  }
}
function openProfile() { $('profModal').classList.add('open'); profTab('orders'); }

/* ---------- чат ---------- */
const chat = (() => {
  const box = $('msgs'); let uid = null, ch = null, open = false, loaded = false, unread = 0, noted = false, typeT = 0, typeHide;
  const feed = createFeed(box, m => !m.from_admin);
  const dot = () => { $('chatDot').hidden = !unread; $('chatDot').textContent = unread > 9 ? '9+' : unread || ''; };
  const COLS = 'id,body,from_admin,created_at,read_at,attachment_url';
  async function load() { const { data } = await sb.from('messages').select(COLS).eq('user_id', uid).order('id', { ascending: false }).limit(200); feed.clear(); feed.addMany((data || []).reverse()); loaded = true; }
  function sub() {
    ch = sb.channel('chat-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'user_id=eq.' + uid }, ({ new: m }) => {
        if (!loaded) return; feed.add(m);
        if (m.from_admin) { $('typing').textContent = ''; if (open) sb.rpc('mark_read', { thread: uid }); else { unread++; dot(); notify('MEGABAZA', m.body); } }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'user_id=eq.' + uid }, () => feed.markRead())
      .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload.admin) { $('typing').textContent = t('typing'); clearTimeout(typeHide); typeHide = setTimeout(() => $('typing').textContent = '', 3000); } })
      .subscribe();
  }
  function offHours() { const h = new Date().getHours(), a = +st('hours_from') || 9, b = +st('hours_to') || 19; return h < a || h >= b; }
  async function insert(row, tempId) {
    const { data, error } = await sb.from('messages').insert({ user_id: uid, ...row }).select(COLS).single();
    if (error) { feed.fail(tempId); toast(t('err')); return; }
    feed.add({ ...data, tempId });
    if (!noted && offHours()) { noted = true; feed.note(t('offHours')); }
  }
  return {
    async setUser(p) {
      if (ch) { sb.removeChannel(ch); ch = null; }
      uid = p ? p.id : null; loaded = false; unread = 0; feed.clear(); dot(); if (!uid) return;
      const { count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('from_admin', true).is('read_at', null);
      unread = count || 0; dot(); sub(); if (open) { await load(); sb.rpc('mark_read', { thread: uid }); }
    },
    async toggle(v) {
      if (!sb) return toast(t('demo'));
      if (!uid) { toast(t('chatLogin')); return openAuth('login'); }
      open = v ?? !open; $('chat').classList.toggle('open', open);
      if (open) { if (!loaded) await load(); unread = 0; dot(); sb.rpc('mark_read', { thread: uid }); $('msgInput').focus(); askNotify(); }
    },
    send(text) { text = text.trim(); if (!text || !uid) return; insert({ body: text }, feed.pending(text)); },
    async sendFile(f) {
      if (!f || !uid) return; if (f.size > 5e6) return toast('≤ 5 MB');
      const tempId = feed.pending('📷'); const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${(f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
      const up = await sb.storage.from('chat').upload(path, f, { contentType: f.type }); if (up.error) { feed.fail(tempId); return toast(t('err')); }
      insert({ body: '📷', attachment_url: sb.storage.from('chat').getPublicUrl(path).data.publicUrl }, tempId);
    },
    typing() { if (!ch || Date.now() - typeT < 2000) return; typeT = Date.now(); ch.send({ type: 'broadcast', event: 'typing', payload: { admin: false } }); },
    prefill(text) { $('msgInput').value = text; }
  };
})();

/* ---------- события ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('button,[data-open],a'); if (!b) return; const d = b.dataset;
  if (d.fav) { e.stopPropagation(); return toggleFav(d.fav); }
  if (d.open) return openProduct(d.open);
  if (!e.target.closest('#mega,#catBtn,[data-m="cat"]')) $('mega').hidden = true;
  if (d.c) { S.cat = d.c; render(); $('mega').hidden = true; if (d.c !== 'all') $('grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if (d.add) { cart[d.add] = Math.min((cart[d.add] || 0) + 1, maxQty(byId(d.add))); if (cart[d.add] >= maxQty(byId(d.add)) && byId(d.add).stock != null) toast(t('maxStock')); saveCart(); toast(t('added')); if (typeof gtag === 'function') gtag('event', 'add_to_cart', { items: [{ item_id: d.add }] }); }
  if (d.d) { cart[d.id] = Math.min(cart[d.id] + +d.d, maxQty(byId(d.id))); if (cart[d.id] <= 0) delete cart[d.id]; saveCart(); }
  if (d.rm) { delete cart[d.rm]; saveCart(); toast(t('removed')); }
  if (d.go) { $('drawer').classList.remove('open'); scrollTo({ top: 0, behavior: 'smooth' }); }
  if (d.mode) setMode(d.mode);
  if (d.more) showMore();
  if (d.model !== undefined) { setModel(d.model); if (d.model) $('grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if (d.deals) { S.deals = !S.deals; render(); }
  if (d.season) { S.season = S.season === d.season ? '' : d.season; render(); }
  if (d.m === 'home') scrollTo({ top: 0, behavior: 'smooth' });
  if (d.m === 'search') { scrollTo({ top: 0, behavior: 'smooth' }); $('q').focus(); }
  if (d.m === 'chat') chat.toggle();
  if (d.m === 'cat') $('mega').hidden = !$('mega').hidden;
  if (d.m === 'fav') $('favBtn').click();
  if (d.m === 'prof') $('authBtn').click();
  if (d.m === 'cart') $('drawer').classList.add('open');
  if (d.dl) { S.delivery = d.dl; drawCart(); }
  if (d.x === 'prod') closeProduct();
  if (d.share) { const u = location.origin + location.pathname + '?p=' + d.share; if (navigator.share) navigator.share({ url: u, title: byId(d.share).name }).catch(() => {}); else { navigator.clipboard?.writeText(u); toast(t('copied')); } }
  if (d.ask) { closeProduct(); chat.prefill(`${byId(d.ask).name} (${location.origin}${location.pathname}?p=${d.ask})`); chat.toggle(true); }
  if (d.cmp) { const id = +d.cmp; if (!S.cmp.includes(id)) S.cmp.push(id); S.cmp = S.cmp.slice(-3); b.textContent = `${t('compare')} (${S.cmp.length})`; if (S.cmp.length >= 2) openCompare(); }
  if (d.alert) { if (!S.me) { closeProduct(); return openAuth('login'); } await sb.from('stock_alerts').upsert({ user_id: S.me.id, product_id: +d.alert }); toast(t('notified')); }
  if (d.pt) profTab(d.pt);
  if (d.repeat) { (window._orders.find(o => o.id == d.repeat)?.order_items || []).forEach(i => { if (i.product_id && byId(i.product_id)) cart[i.product_id] = (cart[i.product_id] || 0) + i.qty; }); saveCart(); $('profModal').classList.remove('open'); $('drawer').classList.add('open'); }
  if (d.pickcar) { S.car = d.pickcar; $('profModal').classList.remove('open'); render(); scrollTo({ top: 0, behavior: 'smooth' }); }
  if (d.delcar) { await sb.from('garage').delete().eq('id', d.delcar); S.garage = S.garage.filter(g => g.id != d.delcar); render(); profTab('garage'); }
});
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'revForm') { e.preventDefault(); if (!S.me) { closeProduct(); return openAuth('login'); }
    const { error } = await sb.from('reviews').insert({ product_id: +f.dataset.pid, user_id: S.me.id, rating: +$('rStars').value, body: $('rText').value.trim() }); toast(error ? t('err') : t('thanks')); if (!error) openProduct(f.dataset.pid); }
  if (f.id === 'carForm') { e.preventDefault(); const { data, error } = await sb.from('garage').insert({ user_id: S.me.id, make: $('gMake').value.trim(), model: $('gModel').value.trim(), year: +$('gYear').value || null, vin: $('gVin').value.trim() }).select().single();
    if (!error) { S.garage.push(data); render(); profTab('garage'); } else toast(t('err')); }
  if (f.id === 'profForm') { e.preventDefault(); const { error } = await sb.from('profiles').update({ full_name: $('pName').value.trim(), phone: $('pPhone').value.trim() }).eq('id', S.me.id); toast(error ? t('err') : t('saved')); if (!error) refreshUser(); }
});
document.addEventListener('click', async e => {
  if (e.target.id === 'pOut') { await sb.auth.signOut(); $('profModal').classList.remove('open'); }
  if (e.target.id === 'pReset') { await sb.auth.resetPasswordForEmail(S.me.email, { redirectTo: location.origin + location.pathname }); toast(t('resetSent')); }
});
const onF = debounce(() => render(), 120);
document.addEventListener('change', e => { const el = e.target; if (el.dataset && el.dataset.qty) { const p = byId(el.dataset.qty); cart[el.dataset.qty] = Math.max(1, Math.min(maxQty(p), parseInt(el.value) || 1)); saveCart(); } });
$('oPhone').addEventListener('input', e => maskPhone(e.target)); $('aPhone').addEventListener('input', e => maskPhone(e.target));
$('aEye').onclick = () => { const p = $('aPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
$('aPass').addEventListener('input', e => { const v = e.target.value, sc = (v.length >= 8) + (v.length >= 12) + /[A-Z]/.test(v) + /\d/.test(v) + /[^\w]/.test(v), el = $('aStr'); el.style.width = Math.min(100, sc * 22) + '%'; el.style.background = sc <= 2 ? '#ff6b6b' : sc === 3 ? '#ffb400' : '#3ecf8e'; });
$('trackOpen').onclick = () => { $('trRes').textContent = ''; $('trackModal').classList.add('open'); };
$('trClose').onclick = () => $('trackModal').classList.remove('open');
$('trPhone').addEventListener('input', e => maskPhone(e.target));
$('trackForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!sb) return toast(t('demo'));
  const { data, error } = await sb.rpc('track_order', { p_id: +$('trId').value, p_phone: $('trPhone').value });
  const o = data && data[0]; $('trRes').innerHTML = (error || !o) ? t('trackNone') : `<b>${t('st_' + o.status)}</b><br>${t('total')}: ${money(o.total)}<br>${t('trackDate')}: ${new Date(o.created_at).toLocaleString('ru-RU')}`;
});
$('doneClose').onclick = () => $('doneModal').classList.remove('open');
$('doneOrders').onclick = () => { $('doneModal').classList.remove('open'); if ($('doneOrders').dataset.guest) openAuth('register'); else { openProfile(); } };
$('q').addEventListener('input', e => { S.q = e.target.value; onF(); suggest(); });
$('q').addEventListener('blur', () => setTimeout(() => $('sugg').hidden = true, 150));
function suggest() {
  const q = S.q.trim().toLowerCase(); if (q.length < 2) return $('sugg').hidden = true;
  const l = S.products.filter(p => matchQ(p, q) || matchQ(p, swapLayout(q))).slice(0, 6);
  $('sugg').innerHTML = l.map(p => `<div data-s="${esc(p.name)}">${esc(p.name)}</div>`).join(''); $('sugg').hidden = !l.length;
}
$('sugg').addEventListener('mousedown', e => { const s = e.target.dataset.s; if (s) { S.q = $('q').value = s; $('sugg').hidden = true; render(); } });
$('fw').onchange = e => { S.fw = e.target.value; S.fh = ''; S.fd = ''; render(); };
$('fh').onchange = e => { S.fh = e.target.value; S.fd = ''; render(); };
$('fd').onchange = e => { S.fd = e.target.value; render(); };
$('priceCsv').onclick = downloadPrice; $('catBtn').onclick = () => { $('mega').hidden = !$('mega').hidden; }; $('sbtn').onclick = () => { render(); $('grid').scrollIntoView({ behavior: 'smooth' }); };
$('cpModel').onchange = e => setModel(e.target.value);
$('cpCat').onchange = e => { S.cat = e.target.value; render(); $('grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
$('cpGo').onclick = () => $('grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
$('sort').onchange = e => { S.sort = e.target.value; render(); };
$('brand').onchange = e => { S.brand = e.target.value; render(); };
$('car').onchange = e => { S.car = e.target.value; lsSet('mycar', S.car); render(); };
$('stockOnly').onchange = e => { S.stockOnly = e.target.checked; render(); };
$('pmin').oninput = debounce(e => { S.pmin = +e.target.value || 0; render(); }, 300);
$('pmax').oninput = debounce(e => { S.pmax = +e.target.value || 0; render(); }, 300);
$('resetF').onclick = () => { Object.assign(S, { cat: 'all', q: '', sort: 'new', brand: '', car: '', stockOnly: false, pmin: 0, pmax: 0, season: '', deals: false, fw: '', fh: '', fd: '' }); ['q', 'pmin', 'pmax'].forEach(i => $(i).value = ''); $('stockOnly').checked = false; $('sort').value = 'new'; render(); };
$('favBtn').onclick = () => { if (!S.me) { toast(S.favs.size ? t('needLogin') : t('noFavs')); return S.favs.size ? openAuth('login') : null; } openProfile(); profTab('favs'); };
$('open').onclick = () => $('drawer').classList.add('open');
$('close').onclick = () => $('drawer').classList.remove('open');
$('order').onclick = placeOrder; $('promoBtn').onclick = applyPromo;
$('authBtn').onclick = () => { if (!sb) return toast(t('demo')); S.me ? openProfile() : openAuth('login'); };
$('authForm').addEventListener('submit', submitAuth);
$('aCancel').onclick = () => $('authModal').classList.remove('open');
$('aMagic').onclick = async () => { const email = $('aEmail').value.trim(); if (!email) return $('aErr').textContent = t('email'); const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); $('aErr').textContent = error ? authErrorText(error) : '✉ ' + t('magicSent'); };
$('aForgot').onclick = async () => { const email = $('aEmail').value.trim(); if (!email) return $('aErr').textContent = t('email'); const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); $('aErr').textContent = error ? authErrorText(error) : '✉ ' + t('resetSent'); };
[['authModal'], ['profModal'], ['cmpModal']].forEach(([id]) => $(id).addEventListener('click', e => { if (e.target === $(id)) $(id).classList.remove('open'); }));
$('prodModal').addEventListener('click', e => { if (e.target === $('prodModal')) closeProduct(); });
$('profClose').onclick = () => $('profModal').classList.remove('open'); $('cmpClose').onclick = () => $('cmpModal').classList.remove('open');
document.addEventListener('keydown', e => { if (e.key === 'Escape') { ['authModal', 'profModal', 'cmpModal'].forEach(i => $(i).classList.remove('open')); closeProduct(); $('drawer').classList.remove('open'); } });
$('chatFab').onclick = () => chat.toggle(); $('chatClose').onclick = () => chat.toggle(false);
$('compose').addEventListener('submit', e => { e.preventDefault(); const i = $('msgInput'); chat.send(i.value); i.value = ''; });
$('msgInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('compose').requestSubmit(); } });
$('msgInput').addEventListener('input', () => chat.typing());
$('file').addEventListener('change', e => { chat.sendFile(e.target.files[0]); e.target.value = ''; });
$('lang').onclick = () => { setLang(LANG === 'ru' ? 'uz' : 'ru'); $('lang').textContent = LANG.toUpperCase(); setMode(mode); render(); drawCart(); drawContacts(); $('authBtn').textContent = S.me ? (S.me.full_name || t('profile')).split(' ')[0] : t('login'); };
$('theme').onclick = () => { const l = document.documentElement.dataset.theme !== 'light'; document.documentElement.dataset.theme = l ? 'light' : 'dark'; lsSet('theme', l ? 'light' : 'dark'); };
addEventListener('scroll', () => { $('top').style.display = scrollY > 600 ? 'block' : 'none'; }, { passive: true });
$('top').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });

/* ---------- старт ---------- */
(async () => {
  document.documentElement.dataset.theme = ls('theme', 'light'); $('lang').textContent = LANG.toUpperCase(); applyI18n(); setMode('login');
  $('demo').hidden = CONFIGURED; $('tgBtn').href = $('footTg').href = 'https://t.me/' + (CFG.bot || ''); drawSlider(defaultSlides()); loadAnalytics();
  $('grid').innerHTML = '<div class="sk"></div>'.repeat(8);
  await Promise.all([loadCatalog(), loadExtras()]); if (!S.dbBanners) drawSlider(defaultSlides()); render(); drawCart();
  const pid = new URLSearchParams(location.search).get('p'); if (pid) openProduct(pid);
  if (sb) {
    sb.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(refreshUser, 0);
      if (ev === 'PASSWORD_RECOVERY') setTimeout(async () => { const p = prompt(t('newPass')); if (p && p.length >= 6) { const { error } = await sb.auth.updateUser({ password: p }); toast(error ? authErrorText(error) : t('passOk')); } }, 100);
    });
    await refreshUser();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
