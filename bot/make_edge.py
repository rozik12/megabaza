# Собирает edge/index.ts — Edge Function для Supabase (Deno, вебхук Telegram, состояние в Postgres).
import re,base64,io
from PIL import Image
import json
s=open('bot.js',encoding='utf8').read(); d0=json.load(open('catalog.json',encoding='utf8'))
descs=[];cars=[]
def idx(lst,o):
    k=json.dumps(o,ensure_ascii=False)
    if k in lst: return lst.index(k)
    lst.append(k); return len(lst)-1
P=[]
for p in d0['products']:
    q=dict(p); q['dc']=idx(descs,p['desc']); q['cr']=idx(cars,p['car']); del q['desc']; del q['car']
    P.append({k:v for k,v in q.items() if v is not None and v is not False})
cat=json.dumps(dict(categories=d0['categories'],descs=[json.loads(x) for x in descs],cars=[json.loads(x) for x in cars],products=P),ensure_ascii=False,separators=(',',':'))
im=Image.open('logo.png').convert('RGB').resize((256,256)); b=io.BytesIO(); im.save(b,'JPEG',quality=85); logo=base64.b64encode(b.getvalue()).decode()

# 1. шапка: переменные окружения Deno
s=s.replace("const env = k => process.env[k];","const env = (k: string) => Deno.env.get(k);")
s=s.replace("const SB_URL = env('SUPABASE_URL'), SB_KEY = env('SUPABASE_ANON_KEY');","const SB_URL = env('BOT_MIRROR_URL'), SB_KEY = env('BOT_MIRROR_KEY'); // зеркалирование заказов в сайт (по умолчанию выключено)")

# 2. слой данных вместо файла состояния
prelude=r"""
const RAW = __CAT__;
const CAT = { categories: RAW.categories, products: RAW.products.map((p) => ({ ...p, desc: RAW.descs[p.dc], car: RAW.cars[p.cr], stock: p.stock ?? null, season: p.season ?? null, old: p.old ?? null, w: p.w ?? null, h: p.h ?? null, d: p.d ?? null, hit: !!p.hit, new: !!p.new })) };
const LOGO_B64 = '__LOGO__';
const LOGO = () => Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0));
const LOGO_TYPE = ['image/jpeg', 'logo.jpg'];

/* ---------- состояние: Postgres (bot_users, bot_orders, bot_meta) ---------- */
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const state: any = { users: {}, orders: [], over: {}, promos: {}, lastReport: '', userCount: 0 };
const snap = { users: new Map(), orders: new Map(), meta: '' };
const resetState = () => { state.users = {}; state.orders = []; state.over = {}; state.promos = {}; state.lastReport = ''; state.userCount = 0; snap.users.clear(); snap.orders.clear(); snap.meta = ''; };
const save = () => {};
const newUser = () => ({ lang: null, name: '', cart: {}, fav: [], alerts: [], cars: [], points: 0, promo: '', joined: Date.now() });
const U = (id, from?) => { const k = String(id); if (!state.users[k]) state.users[k] = newUser(); const u = state.users[k]; if (from) u.name = [from.first_name, from.username && '@' + from.username].filter(Boolean).join(' '); return u; };
const R = (id) => { const u = U(id); if (!u.rt) u.rt = { step: null, list: [], title: '', sort: '' }; return u.rt; };
const isAdmin = (id) => ADMINS.includes(Number(id));
const metaOf = () => JSON.stringify({ over: state.over, promos: state.promos, lastReport: state.lastReport, logoId, botName: BOT_NAME });
async function loadCore() {
  const { data } = await db.from('bot_meta').select('value').eq('key', 'meta').maybeSingle(); const m = data?.value || {};
  state.over = m.over || {}; state.promos = m.promos || {}; state.lastReport = m.lastReport || ''; logoId = m.logoId || null; BOT_NAME = m.botName || BOT_NAME; snap.meta = metaOf();
}
async function loadUser(id, onlyExisting = false) {
  const k = String(id); if (state.users[k]) return state.users[k];
  const { data } = await db.from('bot_users').select('data').eq('id', k).maybeSingle();
  if (data) { state.users[k] = data.data; snap.users.set(k, JSON.stringify(data.data)); return state.users[k]; }
  return onlyExisting ? null : U(k);
}
async function loadAllUsers() {
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('bot_users').select('id,data').order('id').range(from, from + 999);
    for (const r of data || []) { const k = String(r.id); if (!state.users[k]) { state.users[k] = r.data; snap.users.set(k, JSON.stringify(r.data)); } }
    if (!data || data.length < 1000) break;
  }
}
async function loadOrders(opts: any) {
  let q = db.from('bot_orders').select('id,data').order('id', { ascending: false }).limit(opts.all ? 3000 : 30);
  if (opts.uid) q = q.eq('uid', opts.uid); if (opts.status) q = q.eq('status', opts.status);
  const { data } = await q;
  for (const r of data || []) { const i = state.orders.findIndex((o) => o.id === r.id); if (i >= 0) state.orders.splice(i, 1); state.orders.push(r.data); snap.orders.set(r.id, JSON.stringify(r.data)); }
  state.orders.sort((a, b) => a.id - b.id);
  if (opts.all) { const { count } = await db.from('bot_users').select('id', { count: 'exact', head: true }); state.userCount = count || 0; }
}
async function nextOrderId() { const { data, error } = await db.rpc('bot_next_order'); if (error) throw error; return Number(data); }
async function flush() {
  const ups = []; for (const [k, u] of Object.entries(state.users)) { const s = JSON.stringify(u); if (snap.users.get(k) !== s) { ups.push({ id: Number(k), data: u, updated_at: new Date().toISOString() }); snap.users.set(k, s); } }
  if (ups.length) { const { error } = await db.from('bot_users').upsert(ups); if (error) console.error('flush users:', error.message); }
  const os = []; for (const o of state.orders) { const s = JSON.stringify(o); if (snap.orders.get(o.id) !== s) { os.push({ id: o.id, uid: o.uid, status: o.status, ts: o.ts, data: o }); snap.orders.set(o.id, s); } }
  if (os.length) { const { error } = await db.from('bot_orders').upsert(os); if (error) console.error('flush orders:', error.message); }
  const m = metaOf(); if (m !== snap.meta) { const { error } = await db.from('bot_meta').upsert({ key: 'meta', value: JSON.parse(m) }); if (error) console.error('flush meta:', error.message); snap.meta = m; }
}
""".replace('__CAT__',cat).replace('__LOGO__',logo)
a=s.index('/*FS_BEGIN*/'); b2=s.index('/* ---------- каталог ----------')
s=s[:a]+prelude+"\n"+s[b2:]

# 3. асинхронные подгрузки там, где код трогает чужие данные
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, old[:60]
    s=s.replace(old,new) if cnt==0 else s.replace(old,new,cnt)
rep("state.users[arg.slice(4)] && !u.ref","!u.ref && await loadUser(arg.slice(4), true)")
rep("const cu = U(o.uid), t = L[cu.lang || 'ru'];","await loadUser(o.uid); const cu = U(o.uid), t = L[cu.lang || 'ru']; if (cu.ref) await loadUser(cu.ref, true);")
rep("async function restock(pid) {","async function restock(pid) { await loadAllUsers();")
rep("async function broadcast(text) {","async function broadcast(text) { await loadAllUsers();")
rep("async function background() {","async function background() { await loadAllUsers(); await loadOrders({ all: true });")
rep("const to = Number(rt.step.slice(6)); rt.step = null;","const to = Number(rt.step.slice(6)); rt.step = null; await loadUser(to);")
rep("Object.keys(state.users).length","state.userCount",0)
rep("id: state.nextOrder++,","id: await nextOrderId(),")

# 4. вместо long polling — вебхук
a=s.index("async function main()")
s=s[:a]
s="// @ts-nocheck\nimport { createClient } from 'npm:@supabase/supabase-js@2';\n"+s+r"""
/* ---------- вебхук Telegram ---------- */
let chain = Promise.resolve();
const enqueue = (fn) => { const r = chain.then(fn, fn); chain = r.catch(() => {}); return r; };
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const webhookSecret = async () => (await sha((TOKEN || '') + ':megabaza-webhook')).slice(0, 48);
async function handle(up) {
  resetState(); await loadCore();
  const chat = up.message?.chat?.id ?? up.callback_query?.message?.chat?.id ?? up.inline_query?.from?.id;
  try {
    if (chat) { await loadUser(chat); await loadOrders({ uid: chat }); if (isAdmin(chat)) await loadOrders({ all: true }); }
    if (up.message) await onMessage(up.message); else if (up.callback_query) await onCallback(up.callback_query); else if (up.inline_query) await onInline(up.inline_query);
  } catch (e) { console.error(e); } finally { await flush(); }
}
async function setup() {
  const me = await call('getMe', {}); if (!me) return { ok: false, error: 'BOT_TOKEN is missing or invalid' };
  await enqueue(async () => { resetState(); await loadCore(); BOT_NAME = me.username; await flush(); });
  const hook = `${env('SUPABASE_URL')}/functions/v1/megabaza-bot`;
  const wh = await call('setWebhook', { url: hook, secret_token: await webhookSecret(), allowed_updates: ['message', 'callback_query', 'inline_query'], drop_pending_updates: true });
  await call('setMyCommands', { commands: [{ command: 'start', description: 'Start / Начать / Boshlash' }, { command: 'catalog', description: 'Catalog / Каталог / Katalog' }, { command: 'price', description: 'Price list / Прайс / Narxlar' }, { command: 'cart', description: 'Cart / Корзина / Savat' }, { command: 'lang', description: 'Settings / Настройки / Sozlamalar' }] });
  for (const [lc, d, s2] of [['ru', 'Шины для легковых, внедорожных и грузовых авто, диски, камеры и шиномонтаж. Заказ прямо в Telegram.', 'MEGABAZA — центр автозапчастей'], ['uz', "Yengil, yo'ldan tashqari va yuk avtomobillari uchun shinalar, disklar, kameralar. Buyurtma Telegramda.", 'MEGABAZA — avtoehtiyot qismlar markazi'], ['en', 'Tires for cars, SUVs and trucks, wheels, tubes and fitting. Order right in Telegram.', 'MEGABAZA — auto parts center']]) { await call('setMyDescription', { description: d, language_code: lc }); await call('setMyShortDescription', { short_description: s2, language_code: lc }); }
  return { ok: true, bot: '@' + me.username, webhookSet: wh, webhookUrl: hook, admins: ADMINS.length };
}
Deno.serve(async (req) => {
  const url = new URL(req.url), q = url.searchParams;
  if (q.get('setup') && TOKEN && q.get('setup') === TOKEN.slice(-8)) return new Response(JSON.stringify(await setup(), null, 2), { headers: { 'content-type': 'application/json' } });
  if (q.get('cron')) { await enqueue(async () => { resetState(); await loadCore(); try { await background(); } catch (e) { console.error(e); } await flush(); }); return new Response('ok'); }
  if (req.method !== 'POST') return new Response('MEGABAZA bot is running');
  if (req.headers.get('x-telegram-bot-api-secret-token') !== await webhookSecret()) return new Response('forbidden', { status: 403 });
  let up; try { up = await req.json(); } catch { return new Response('bad request', { status: 400 }); }
  await enqueue(() => handle(up));
  return new Response('ok');
});
"""
import os; os.makedirs('edge',exist_ok=True)
open('edge/index.ts','w',encoding='utf8').write(s); print(len(s)//1024,'KB')
