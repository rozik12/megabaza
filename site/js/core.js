// Общие утилиты. Без фреймворков: страница грузится быстро и не тормозит.
const CFG = window.MB_CONFIG || {};
const CONFIGURED = !!CFG.url && !CFG.url.startsWith('YOUR');
const sb = CONFIGURED ? supabase.createClient(CFG.url, CFG.anonKey, {
  realtime: { params: { eventsPerSecond: 20 } }
}) : null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n).toLocaleString('ru-RU') + ' сум';
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

let toastTimer;
function toast(text) {
  const e = $('toast'); if (!e) return;
  e.textContent = text; e.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => e.style.display = 'none', 2200);
}

async function getProfile() {
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data } = await sb.from('profiles').select('id,full_name,phone,role').eq('id', session.user.id).single();
  return data ? { ...data, email: session.user.email } : null;
}

function authErrorText(e) {
  const m = (e && e.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Неверная почта или пароль';
  if (m.includes('already registered')) return 'Эта почта уже зарегистрирована';
  if (m.includes('password')) return 'Пароль: не менее 6 символов';
  if (m.includes('email')) return 'Проверьте адрес почты';
  if (m.includes('rate limit')) return 'Слишком много попыток, подождите минуту';
  return 'Ошибка: ' + (e && e.message || 'попробуйте ещё раз');
}

// Лента сообщений: оптимистичная отправка, без дублей, фото, галочки прочтения
function createFeed(box, isMine) {
  const seen = new Set();
  const nearBottom = () => box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  function node(m, pending) {
    const d = document.createElement('div');
    d.className = 'm ' + (isMine(m) ? 'me' : 'them') + (pending ? ' pending' : '');
    if (m.attachment_url) { const a = document.createElement('a'); a.href = m.attachment_url; a.target = '_blank'; a.rel = 'noopener'; const im = new Image(); im.src = m.attachment_url; im.loading = 'lazy'; im.className = 'att'; a.appendChild(im); d.appendChild(a); }
    if (m.body && !(m.attachment_url && m.body === '📷')) d.appendChild(document.createTextNode(m.body));
    const tm = document.createElement('time'); tm.textContent = hhmm(m.created_at || Date.now()) + (isMine(m) ? (m.read_at ? ' ✓✓' : ' ✓') : ''); if (isMine(m)) tm.dataset.tick = m.read_at ? '2' : '1'; d.appendChild(tm);
    return d;
  }
  return {
    clear() { box.textContent = ''; seen.clear(); },
    add(m) {
      const old = m.tempId && box.querySelector(`[data-temp="${m.tempId}"]`);
      if (seen.has(m.id)) { if (old) old.remove(); return; }
      seen.add(m.id);
      const stick = nearBottom() || isMine(m);
      const n = node(m, false);
      if (old) old.replaceWith(n); else box.appendChild(n);
      if (stick) box.scrollTop = box.scrollHeight;
    },
    addMany(list) { const f = document.createDocumentFragment(); list.forEach(m => { seen.add(m.id); f.appendChild(node(m, false)); }); box.appendChild(f); box.scrollTop = box.scrollHeight; },
    pending(body) { const tempId = 't' + Math.random().toString(36).slice(2); const n = node({ body }, true); n.dataset.temp = tempId; n.className = 'm me pending'; box.appendChild(n); box.scrollTop = box.scrollHeight; return tempId; },
    fail(tempId) { const n = box.querySelector(`[data-temp="${tempId}"]`); if (n) { n.title = '!'; n.style.outline = '1px solid #ff8a8a'; } },
    note(text) { const d = document.createElement('div'); d.className = 'm them'; d.style.opacity = '.7'; d.textContent = text; box.appendChild(d); box.scrollTop = box.scrollHeight; },
    markRead() { box.querySelectorAll('time[data-tick="1"]').forEach(e => { e.textContent = e.textContent.replace(' ✓', ' ✓✓'); e.dataset.tick = '2'; }); }
  };
}

// звук и системное уведомление (для админа и клиента)
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(.08, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .25); o.start(); o.stop(c.currentTime + .25); } catch {} }
function notify(title, body) { beep(); try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: 'mark.png' }); } catch {} }
function askNotify() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch {} }
// «ghbdtn» → «привет» и обратно
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`", RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const swapLayout = s => [...s].map(c => { const i = EN.indexOf(c), j = RU.indexOf(c); return i >= 0 ? RU[i] : j >= 0 ? EN[j] : c; }).join('');
// аналитика (ID в config.js)
function loadAnalytics() {
  const add = src => { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); };
  if (CFG.gaId) { add('https://www.googletagmanager.com/gtag/js?id=' + CFG.gaId); window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', CFG.gaId); }
  if (CFG.ymId) { window.ym = window.ym || function () { (ym.a = ym.a || []).push(arguments); }; ym.l = +new Date(); add('https://mc.yandex.ru/metrika/tag.js'); ym(CFG.ymId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true }); }
}
