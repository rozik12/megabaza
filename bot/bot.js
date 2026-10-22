// MEGABAZA — Telegram-бот магазина шин и автозапчастей. Русский / O'zbekcha / English.
// Запуск: BOT_TOKEN=... ADMIN_IDS=123,456 node bot.js   (Node 18+, без зависимостей)
// Необязательно: SUPABASE_URL + SUPABASE_ANON_KEY (заказы дублируются в админку сайта), STORE_PHONE, STORE_ADDRESS,
//   STORE_HOURS, STORE_TELEGRAM, STORE_LAT, STORE_LON, DELIVERY_FEE, FREE_DELIVERY_FROM, KIT_DISCOUNT, PROMO_CODES="SALE10:10,TIRE5:5", STATE_FILE
const env = k => process.env[k];
const TOKEN = env('BOT_TOKEN');
const ADMINS = String(env('ADMIN_IDS') || env('ADMIN_CHAT_ID') || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
const SB_URL = env('SUPABASE_URL'), SB_KEY = env('SUPABASE_ANON_KEY');
const API = (env('TG_API') || 'https://api.telegram.org') + '/bot' + TOKEN + '/';
const STORE = { phone: env('STORE_PHONE') || '', address: env('STORE_ADDRESS') || 'Toshkent / Ташкент', hours: env('STORE_HOURS') || '09:00–19:00', telegram: env('STORE_TELEGRAM') || '' };
const FEE = Number(env('DELIVERY_FEE') ?? 25000), FREE_FROM = Number(env('FREE_DELIVERY_FROM') ?? 500000);
const KIT_PCT = Number(env('KIT_DISCOUNT') ?? 5), KIT_MIN = 4;
const PROMOS = Object.fromEntries(String(env('PROMO_CODES') || 'SALE10:10').split(',').map(x => x.split(':')).filter(x => x[1]).map(([c, p]) => [c.trim().toUpperCase(), +p]));

/*FS_BEGIN*/
const fs = require('fs'), path = require('path');
const CAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const LOGO = () => fs.readFileSync(path.join(__dirname, 'logo.png'));
const LOGO_TYPE = ['image/png', 'logo.png'];
const STATE_FILE = env('STATE_FILE') || path.join(__dirname, 'state.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return null; } };
const writeState = s => { try { fs.writeFileSync(STATE_FILE, s); } catch (e) { console.error('state:', e.message); } };
/*FS_END*/

/* ---------- состояние ---------- */
const state = loadState() || { users: {}, orders: [], nextOrder: 1, over: {} };
let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => writeState(JSON.stringify(state)), 800); };
const U = (id, from) => { const k = String(id); if (!state.users[k]) state.users[k] = { lang: null, name: '', cart: {}, fav: [], alerts: [], cars: [], points: 0, promo: '', joined: Date.now() }; const u = state.users[k]; if (from) u.name = [from.first_name, from.username && '@' + from.username].filter(Boolean).join(' '); return u; };
const RT = new Map(); // временное: шаг диалога, список, сортировка
const R = id => { if (!RT.has(id)) RT.set(id, { step: null, list: [], title: '', sort: '' }); return RT.get(id); };
const isAdmin = id => ADMINS.includes(Number(id));

/* ---------- каталог ---------- */
const prod = id => { const p = CAT.products.find(x => x.id === +id); if (!p) return null; const o = state.over[p.id] || {}; return { ...p, in_stock: o.in_stock ?? true, stock: o.stock !== undefined ? o.stock : p.stock, price: o.price ?? p.price, old: o.old !== undefined ? o.old : p.old, hit: o.hit ?? p.hit, photo: o.photo || p.photo }; };
const avail = p => p.in_stock && (p.stock === null || p.stock > 0);
const nm = (p, l) => p.name[l] || p.name.ru;
const cname = (c, l) => c.name[l] || c.name.ru;
const carShort = (p) => String((p.car && p.car.ru) || '').replace(/Chevrolet\s*/gi, '').trim();
const fullName = (p, l) => nm(p, l) + (carShort(p) ? ' (' + carShort(p) + ')' : '');
const norm = s => String(s).toLowerCase().replace(/[^a-zа-я0-9./]+/g, ' ').trim();

/* ---------- переводы ---------- */
const L = {
 ru: { code: 'RU', flag: '🇷🇺', cur: 'сум',
  btn: { catalog: '🛞 Каталог', search: '🔍 Поиск', pick: '🎯 Подбор шин', cart: '🛒 Корзина', fav: '❤️ Избранное', orders: '📦 Мои заказы', contacts: '📞 Контакты', settings: '⚙️ Настройки', manager: '💬 Менеджер', faq: '❓ Вопросы' },
  chooseLang: 'Выберите язык / Tilni tanlang / Choose language', welcome: n => `Здравствуйте${n ? ', ' + n : ''}! 👋\n<b>MEGABAZA</b> — центр автозапчастей. Шины для легковых, внедорожных и грузовых авто, диски, камеры и шиномонтаж.\n\nВыберите раздел в меню ниже.`,
  menu: 'Главное меню', back: '⬅ Назад', cats: '🛞 <b>Каталог</b>\nВыберите раздел:', page: (a, b) => `стр. ${a}/${b}`, sortAsc: '↑ Цена', sortDesc: '↓ Цена', empty: 'Здесь пока пусто.', none: 'Ничего не найдено. Попробуйте размер, например <code>205/55 R16</code>.',
  searchAsk: '🔍 Введите размер (<code>205/55 R16</code>), название или марку авто:', found: n => `Найдено: ${n}`, itemsIn: (t, n) => `<b>${t}</b> — ${n} поз.`,
  price: 'Цена', for: 'Для', inStock: '✅ В наличии', left: n => `✅ В наличии (осталось ${n})`, out: '❌ Нет в наличии', add: '➕ В корзину', added: 'Добавлено ✅', favAdd: '🤍 В избранное', favDel: '❤️ Убрать из избранного', notify: '🔔 Сообщить о поступлении', notified: 'Сообщим, когда появится 🔔', toCart: n => `🛒 Корзина (${n})`,
  cartTitle: '🛒 <b>Ваша корзина</b>', cartEmpty: '🛒 Корзина пуста.', subtotal: 'Товары', discount: p => `Скидка ${p}%`, delivery: 'Доставка', free: 'бесплатно', total: 'Итого', checkout: '✅ Оформить', clear: '🗑 Очистить', promo: '🎟 Промокод', promoAsk: 'Введите промокод:', promoOk: p => `Промокод применён: −${p}% ✅`, promoBad: 'Промокод не найден.',
  askPhone: '📱 Отправьте номер телефона кнопкой или текстом (+998…):', sendPhone: '📱 Отправить мой номер', cancel: '✖ Отмена', cancelled: 'Отменено.', badPhone: 'Не похоже на номер. Пример: +998901234567', howGet: 'Как получить заказ?', btnDelivery: '🚚 Доставка', btnPickup: '🏪 Самовывоз',
  askAddr: '📍 Напишите адрес доставки или отправьте геопозицию:', sendLoc: '📍 Отправить геопозицию', askNote: 'Комментарий к заказу? (или нажмите «Пропустить»)', skip: 'Пропустить ⏭', check: '<b>Проверьте заказ</b>', phone: 'Телефон', pickup: 'Самовывоз', addr: 'Адрес', note: 'Комментарий', pay: 'Оплата при получении (наличные или карта)', confirm: '✅ Подтвердить', orderOk: id => `✅ <b>Заказ №${id} принят!</b>\nМенеджер скоро свяжется с вами. Статус заказа — в «📦 Мои заказы».`, orderFail: '😔 Не удалось оформить заказ. Позвоните нам:', stockShort: n => `Недостаточно товара: ${n}. Измените количество.`,
  myOrders: '📦 <b>Мои заказы</b>', noOrders: 'Заказов пока нет.', order: 'Заказ', repeat: '🔁 Повторить', st: { new: '🆕 Новый', processing: '🔧 В работе', done: '✅ Выполнен', cancelled: '❌ Отменён' }, stChanged: (id, s) => `Заказ №${id}: ${s}`,
  contacts: '📞 <b>Контакты MEGABAZA</b>', hours: 'Часы работы', faq: '<b>Вопросы и ответы</b>\n\n<b>Как подобрать шину?</b>\nНажмите «🎯 Подбор шин» — выберите ширину, профиль и диаметр. Или напишите нам: подскажем по марке авто.\n\n<b>Есть ли гарантия?</b>\nДа, на все шины и диски. Условия — у менеджера.\n\n<b>Как быстро доставите?</b>\nПо Ташкенту обычно в день заказа.\n\n<b>Можно оплатить картой?</b>\nДа, при получении — наличными или картой.\n\n<b>Шиномонтаж есть?</b>\nДа, смотрите раздел «Услуги».',
  settings: '⚙️ <b>Настройки</b>\nЯзык интерфейса:', langSet: 'Язык изменён ✅',
  managerOn: '💬 Вы в чате с менеджером. Пишите — мы ответим здесь. Чтобы выйти, нажмите «⬅ Меню».', managerSent: 'Отправлено ✅', managerReply: 'Ответ менеджера', exit: '⬅ Меню',
  pick: '🎯 <b>Подбор шин</b>', pickW: 'Выберите ширину (мм):', pickH: 'Выберите профиль (%):', pickD: 'Выберите диаметр (R):', pickRes: s => `Подходящие шины: ${s}`, season: { summer: 'лето', winter: 'зима', all: 'всесезон' }, favTitle: '❤️ <b>Избранное</b>', restock: n => `🔔 Снова в наличии: ${n}` },
 uz: { code: 'UZ', flag: '🇺🇿', cur: "so'm",
  btn: { catalog: '🛞 Katalog', search: '🔍 Qidiruv', pick: '🎯 Shina tanlash', cart: '🛒 Savat', fav: '❤️ Sevimlilar', orders: '📦 Buyurtmalarim', contacts: '📞 Aloqa', settings: '⚙️ Sozlamalar', manager: '💬 Menejer', faq: '❓ Savollar' },
  chooseLang: 'Выберите язык / Tilni tanlang / Choose language', welcome: n => `Assalomu alaykum${n ? ', ' + n : ''}! 👋\n<b>MEGABAZA</b> — avtoehtiyot qismlar markazi. Yengil, yo'ldan tashqari va yuk avtomobillari uchun shinalar, disklar, kameralar va shina o'rnatish.\n\nQuyidagi menyudan bo'limni tanlang.`,
  menu: 'Asosiy menyu', back: '⬅ Orqaga', cats: '🛞 <b>Katalog</b>\nBo\'limni tanlang:', page: (a, b) => `${a}/${b}-sahifa`, sortAsc: '↑ Narx', sortDesc: '↓ Narx', empty: "Hozircha bo'sh.", none: "Hech narsa topilmadi. O'lchamni kiriting, masalan <code>205/55 R16</code>.",
  searchAsk: "🔍 O'lcham (<code>205/55 R16</code>), nom yoki avtomobil markasini kiriting:", found: n => `Topildi: ${n}`, itemsIn: (t, n) => `<b>${t}</b> — ${n} ta`,
  price: 'Narx', for: 'Mos', inStock: '✅ Mavjud', left: n => `✅ Mavjud (${n} ta qoldi)`, out: '❌ Mavjud emas', add: "➕ Savatga", added: "Qo'shildi ✅", favAdd: "🤍 Sevimlilarga", favDel: "❤️ Sevimlilardan olib tashlash", notify: '🔔 Kelganda xabar bering', notified: 'Paydo bo‘lganda xabar beramiz 🔔', toCart: n => `🛒 Savat (${n})`,
  cartTitle: '🛒 <b>Savatingiz</b>', cartEmpty: "🛒 Savat bo'sh.", subtotal: 'Tovarlar', discount: p => `Chegirma ${p}%`, delivery: 'Yetkazib berish', free: 'bepul', total: 'Jami', checkout: '✅ Buyurtma berish', clear: '🗑 Tozalash', promo: '🎟 Promokod', promoAsk: 'Promokodni kiriting:', promoOk: p => `Promokod qo'llandi: −${p}% ✅`, promoBad: 'Promokod topilmadi.',
  askPhone: '📱 Telefon raqamingizni tugma orqali yoki matn bilan yuboring (+998…):', sendPhone: '📱 Raqamimni yuborish', cancel: '✖ Bekor qilish', cancelled: 'Bekor qilindi.', badPhone: "Raqamga o'xshamaydi. Misol: +998901234567", howGet: 'Buyurtmani qanday olasiz?', btnDelivery: '🚚 Yetkazib berish', btnPickup: "🏪 O'zi olib ketish",
  askAddr: '📍 Yetkazib berish manzilini yozing yoki joylashuvni yuboring:', sendLoc: '📍 Joylashuvni yuborish', askNote: "Buyurtmaga izoh? (yoki «O'tkazib yuborish»)", skip: "O'tkazib yuborish ⏭", check: '<b>Buyurtmani tekshiring</b>', phone: 'Telefon', pickup: "O'zi olib ketish", addr: 'Manzil', note: 'Izoh', pay: "Olishda to'lov (naqd yoki karta)", confirm: '✅ Tasdiqlash', orderOk: id => `✅ <b>№${id} buyurtma qabul qilindi!</b>\nMenejer tez orada siz bilan bog'lanadi. Holat — «📦 Buyurtmalarim»da.`, orderFail: "😔 Buyurtma berilmadi. Bizga qo'ng'iroq qiling:", stockShort: n => `Tovar yetarli emas: ${n}. Sonini o'zgartiring.`,
  myOrders: '📦 <b>Buyurtmalarim</b>', noOrders: "Buyurtmalar hali yo'q.", order: 'Buyurtma', repeat: '🔁 Takrorlash', st: { new: '🆕 Yangi', processing: '🔧 Jarayonda', done: '✅ Bajarildi', cancelled: '❌ Bekor qilindi' }, stChanged: (id, s) => `№${id} buyurtma: ${s}`,
  contacts: '📞 <b>MEGABAZA aloqa</b>', hours: 'Ish vaqti', faq: "<b>Savol-javoblar</b>\n\n<b>Shinani qanday tanlayman?</b>\n«🎯 Shina tanlash» tugmasini bosing — kenglik, profil va diametrni tanlang. Yoki avtomobil markasini yozing, maslahat beramiz.\n\n<b>Kafolat bormi?</b>\nHa, barcha shina va disklarga. Shartlar menejerda.\n\n<b>Qanchada yetkazasiz?</b>\nToshkent bo'ylab odatda buyurtma kuni.\n\n<b>Karta bilan to'lash mumkinmi?</b>\nHa, olishda — naqd yoki karta bilan.\n\n<b>Shina o'rnatish bormi?</b>\nHa, «Xizmatlar» bo'limiga qarang.",
  settings: '⚙️ <b>Sozlamalar</b>\nInterfeys tili:', langSet: "Til o'zgartirildi ✅",
  managerOn: "💬 Siz menejer bilan chatdasiz. Yozing — shu yerda javob beramiz. Chiqish uchun «⬅ Menyu» tugmasini bosing.", managerSent: 'Yuborildi ✅', managerReply: 'Menejer javobi', exit: '⬅ Menyu',
  pick: '🎯 <b>Shina tanlash</b>', pickW: 'Kenglikni tanlang (mm):', pickH: 'Profilni tanlang (%):', pickD: 'Diametrni tanlang (R):', pickRes: s => `Mos shinalar: ${s}`, season: { summer: 'yoz', winter: 'qish', all: 'barcha fasl' }, favTitle: '❤️ <b>Sevimlilar</b>', restock: n => `🔔 Yana mavjud: ${n}` },
 en: { code: 'EN', flag: '🇬🇧', cur: 'UZS',
  btn: { catalog: '🛞 Catalog', search: '🔍 Search', pick: '🎯 Tire finder', cart: '🛒 Cart', fav: '❤️ Favorites', orders: '📦 My orders', contacts: '📞 Contacts', settings: '⚙️ Settings', manager: '💬 Manager', faq: '❓ FAQ' },
  chooseLang: 'Выберите язык / Tilni tanlang / Choose language', welcome: n => `Hello${n ? ', ' + n : ''}! 👋\n<b>MEGABAZA</b> — auto parts center. Tires for passenger, off-road and truck vehicles, wheels, tubes and tire fitting.\n\nChoose a section in the menu below.`,
  menu: 'Main menu', back: '⬅ Back', cats: '🛞 <b>Catalog</b>\nChoose a section:', page: (a, b) => `page ${a}/${b}`, sortAsc: '↑ Price', sortDesc: '↓ Price', empty: 'Nothing here yet.', none: 'Nothing found. Try a size, e.g. <code>205/55 R16</code>.',
  searchAsk: '🔍 Enter a size (<code>205/55 R16</code>), name or car make:', found: n => `Found: ${n}`, itemsIn: (t, n) => `<b>${t}</b> — ${n} items`,
  price: 'Price', for: 'Fits', inStock: '✅ In stock', left: n => `✅ In stock (${n} left)`, out: '❌ Out of stock', add: '➕ Add to cart', added: 'Added ✅', favAdd: '🤍 Add to favorites', favDel: '❤️ Remove from favorites', notify: '🔔 Notify me when back', notified: "We'll let you know 🔔", toCart: n => `🛒 Cart (${n})`,
  cartTitle: '🛒 <b>Your cart</b>', cartEmpty: '🛒 Your cart is empty.', subtotal: 'Items', discount: p => `Discount ${p}%`, delivery: 'Delivery', free: 'free', total: 'Total', checkout: '✅ Checkout', clear: '🗑 Clear', promo: '🎟 Promo code', promoAsk: 'Enter promo code:', promoOk: p => `Promo applied: −${p}% ✅`, promoBad: 'Promo code not found.',
  askPhone: '📱 Send your phone number with the button or as text (+998…):', sendPhone: '📱 Send my number', cancel: '✖ Cancel', cancelled: 'Cancelled.', badPhone: "That doesn't look like a number. Example: +998901234567", howGet: 'How would you like to receive it?', btnDelivery: '🚚 Delivery', btnPickup: '🏪 Pickup',
  askAddr: '📍 Type the delivery address or share your location:', sendLoc: '📍 Share location', askNote: 'Any comment for the order? (or press “Skip”)', skip: 'Skip ⏭', check: '<b>Please check your order</b>', phone: 'Phone', pickup: 'Pickup', addr: 'Address', note: 'Comment', pay: 'Pay on receipt (cash or card)', confirm: '✅ Confirm', orderOk: id => `✅ <b>Order #${id} accepted!</b>\nOur manager will contact you soon. Track it in “📦 My orders”.`, orderFail: '😔 Could not place the order. Please call us:', stockShort: n => `Not enough stock: ${n}. Please change the quantity.`,
  myOrders: '📦 <b>My orders</b>', noOrders: 'No orders yet.', order: 'Order', repeat: '🔁 Repeat', st: { new: '🆕 New', processing: '🔧 Processing', done: '✅ Completed', cancelled: '❌ Cancelled' }, stChanged: (id, s) => `Order #${id}: ${s}`,
  contacts: '📞 <b>MEGABAZA contacts</b>', hours: 'Opening hours', faq: '<b>FAQ</b>\n\n<b>How do I choose a tire?</b>\nPress “🎯 Tire finder” — pick width, profile and diameter. Or message us with your car make.\n\n<b>Is there a warranty?</b>\nYes, on all tires and wheels. Terms are with the manager.\n\n<b>How fast is delivery?</b>\nAround Tashkent usually the same day.\n\n<b>Can I pay by card?</b>\nYes, on receipt — cash or card.\n\n<b>Do you fit tires?</b>\nYes, see the “Services” section.',
  settings: '⚙️ <b>Settings</b>\nInterface language:', langSet: 'Language changed ✅',
  managerOn: '💬 You are chatting with a manager. Write here and we will answer. Press “⬅ Menu” to exit.', managerSent: 'Sent ✅', managerReply: 'Manager reply', exit: '⬅ Menu',
  pick: '🎯 <b>Tire finder</b>', pickW: 'Choose width (mm):', pickH: 'Choose profile (%):', pickD: 'Choose diameter (R):', pickRes: s => `Matching tires: ${s}`, season: { summer: 'summer', winter: 'winter', all: 'all-season' }, favTitle: '❤️ <b>Favorites</b>', restock: n => `🔔 Back in stock: ${n}` }
};

/* ---------- дополнительные тексты ---------- */
const X = {
 ru: { btn: { price: '💰 Прайс-лист', deals: '🔥 Хиты и акции', info: 'ℹ️ Полезное' },
  priceTitle: '💰 <b>Прайс-лист</b>\nВыберите раздел или скачайте весь файлом:', priceNote: 'Цены ориентировочные, актуальную цену и наличие уточняйте у менеджера.', priceFile: '📄 Скачать весь прайс (CSV)',
  dealsTitle: '🔥 Хиты и акции', fMenu: '🎯 <b>Подбор шин</b>\nКак подберём?', byDims: '📏 По размеру', byCar: '🚗 По автомобилю', bySeason: '🌦 По сезону', pickCar: '🚗 Выберите автомобиль:', otherCar: '❓ Моей машины нет → менеджер', saveCar: '💾 Запомнить как мою машину', carSaved: 'Сохранено ✅ Теперь она в «Подбор шин».', pickSeason: 'Выберите сезон:',
  kit: '🛞 Комплект ×4', kitDisc: n => `🎁 Комплект −${n}%`, cmpBtn: '⚖️ Сравнить', cmpTitle: '⚖️ <b>Сравнение</b>', cmpClear: '🧹 Очистить сравнение', cmpNeed: 'Добавьте ещё один товар — и покажу сравнение.',
  rgLow: 'до 500 тыс.', rgMid: '500 тыс.–1 млн', rgHigh: 'от 1 млн', sSummer: '☀️ Лето', sWinter: '❄️ Зима', sAll: '🌤 Всесезон',
  usePhone: p => `📱 Использовать ${p}`, useAddr: a => `📍 ${a.slice(0, 40)}`, askSlot: 'Когда удобно получить?', slotAsap: '⚡ Как можно скорее', slotToday: '📅 Сегодня', slotTomorrow: '📅 Завтра', askPay: 'Способ оплаты:', payCash: '💵 Наличные', payCard: '💳 Картой при получении', slot: 'Когда', payL: 'Оплата',
  points: n => `💎 Баллы: ${n}`, usePoints: n => `💎 Списать баллы (−${n})`, pointsOff: '💎 Не списывать баллы', pointsUsed: 'Списано баллов', earned: n => `🎉 Вам начислено ${n} баллов (1 балл = 1 сум скидки).`,
  cancelOrder: '❌ Отменить', cancelledOk: 'Заказ отменён ✅', cantCancel: 'Заказ уже в работе — свяжитесь с менеджером.', rateAsk: id => `Заказ №${id} выполнен ✅\nОцените, пожалуйста, обслуживание:`, rateThanks: 'Спасибо за оценку! ⭐', rateBtn: '⭐ Оценить',
  closedNote: '🔴 Сейчас мы закрыты — менеджер свяжется с вами в рабочее время.', openS: '🟢 Открыто сейчас', closedS: '🔴 Сейчас закрыто',
  infoMenu: 'ℹ️ <b>Полезное</b>', i1: '📏 Как читать размер шины', i2: '🌦 Лето, зима или всесезон?', i3: '🚚 Доставка и оплата', i4: '🛡 Гарантия и возврат', i5: '❓ Вопросы и ответы',
  g1: '<b>Как читать размер шины</b>\nНапример <code>205/55 R16</code>:\n• 205 — ширина в мм\n• 55 — высота профиля в % от ширины\n• R16 — диаметр диска в дюймах\nБуква C (195/75 R16C) — шина для микроавтобусов, усиленная.',
  g2: '<b>Какой сезон выбрать</b>\n☀️ Лето — от +7°C и выше, лучше держит сухую и мокрую дорогу.\n❄️ Зима — при устойчивых температурах ниже +5°C, снег и лёд.\n🌤 Всесезонные — компромисс для мягкой зимы Ташкента.\nМеняйте шины, когда днём стабильно ниже +7°C или выше +10°C.',
  g3: '<b>Доставка и оплата</b>\n🚚 По Ташкенту — обычно в день заказа. Стоимость и порог бесплатной доставки видны в корзине.\n🏪 Самовывоз — бесплатно.\n💵💳 Оплата при получении: наличные или карта.\n🛞 При покупке комплекта (4 шт.) — скидка.', g4: '<b>Гарантия и возврат</b>\n🛡 На шины и диски действует гарантия производителя и магазина.\n🔁 Возврат — если товар не подошёл и не был в использовании, с сохранением упаковки и чека.\nУсловия уточняйте у менеджера.',
  invite: '🎁 Пригласить друга', inviteText: l => `🎁 <b>Пригласите друга</b>\nОтправьте ему вашу ссылку:\n${l}\n\nДруг получит скидку 5% на первый заказ, а вы — 5 000 баллов после его первой покупки.`, welcomeBonus: '🎁 Вам доступна скидка 5% на первый заказ (промокод применится автоматически).', friendJoined: '🎉 По вашей ссылке пришёл друг! Баллы придут после его первой покупки.', friendBonus: n => `🎁 Друг сделал первую покупку: +${n} баллов.`,
  notifOn: '🔔 Рассылки: включены', notifOff: '🔕 Рассылки: выключены', deleteMe: '🗑 Удалить мои данные', deleteAsk: 'Удалить все ваши данные (корзина, избранное, баллы)? Заказы останутся у магазина.', deleted: 'Данные удалены.', yes: 'Да', no: 'Нет',
  cartRemind: '🛒 Вы оставили товары в корзине. Оформим заказ?', showMap: '📍 На карте', shopContact: '☎ Контакт магазина', sizeHint: 'Совет: напишите размер, например 205/55 R16.', total2: 'К оплате', continue: '🛍 Продолжить покупки', myCars: 'Мои машины', repeatDone: 'Товары из заказа добавлены в корзину 🛒', notFoundCar: 'Напишите менеджеру марку и год авто — подберём.' },
 uz: { btn: { price: '💰 Narxlar', deals: '🔥 Xitlar va aksiyalar', info: 'ℹ️ Foydali' },
  priceTitle: '💰 <b>Narxlar ro‘yxati</b>\nBo‘limni tanlang yoki hammasini fayl sifatida yuklab oling:', priceNote: 'Narxlar taxminiy, dolzarb narx va mavjudligini menejerdan aniqlang.', priceFile: '📄 Butun narxnomani yuklash (CSV)',
  dealsTitle: '🔥 Xitlar va aksiyalar', fMenu: '🎯 <b>Shina tanlash</b>\nQanday tanlaymiz?', byDims: '📏 O‘lcham bo‘yicha', byCar: '🚗 Avtomobil bo‘yicha', bySeason: '🌦 Fasl bo‘yicha', pickCar: '🚗 Avtomobilni tanlang:', otherCar: '❓ Mashinam yo‘q → menejer', saveCar: '💾 Mening mashinam sifatida saqlash', carSaved: 'Saqlandi ✅ Endi u «Shina tanlash»da.', pickSeason: 'Faslni tanlang:',
  kit: '🛞 Komplekt ×4', kitDisc: n => `🎁 Komplekt −${n}%`, cmpBtn: '⚖️ Taqqoslash', cmpTitle: '⚖️ <b>Taqqoslash</b>', cmpClear: '🧹 Taqqoslashni tozalash', cmpNeed: 'Yana bitta tovar qo‘shing — taqqoslashni ko‘rsataman.',
  rgLow: '500 mingacha', rgMid: '500 ming–1 mln', rgHigh: '1 mlndan', sSummer: '☀️ Yoz', sWinter: '❄️ Qish', sAll: '🌤 Barcha fasl',
  usePhone: p => `📱 ${p} dan foydalanish`, useAddr: a => `📍 ${a.slice(0, 40)}`, askSlot: 'Qachon olish qulay?', slotAsap: '⚡ Imkon qadar tezroq', slotToday: '📅 Bugun', slotTomorrow: '📅 Ertaga', askPay: 'To‘lov usuli:', payCash: '💵 Naqd', payCard: '💳 Olishda karta bilan', slot: 'Qachon', payL: 'To‘lov',
  points: n => `💎 Ballar: ${n}`, usePoints: n => `💎 Ballarni sarflash (−${n})`, pointsOff: '💎 Ballarni sarflamaslik', pointsUsed: 'Sarflangan ballar', earned: n => `🎉 Sizga ${n} ball berildi (1 ball = 1 so‘m chegirma).`,
  cancelOrder: '❌ Bekor qilish', cancelledOk: 'Buyurtma bekor qilindi ✅', cantCancel: 'Buyurtma allaqachon jarayonda — menejer bilan bog‘laning.', rateAsk: id => `№${id} buyurtma bajarildi ✅\nXizmatni baholang:`, rateThanks: 'Bahoyingiz uchun rahmat! ⭐', rateBtn: '⭐ Baholash',
  closedNote: '🔴 Hozir yopiqmiz — menejer ish vaqtida siz bilan bog‘lanadi.', openS: '🟢 Hozir ochiq', closedS: '🔴 Hozir yopiq',
  infoMenu: 'ℹ️ <b>Foydali</b>', i1: '📏 Shina o‘lchamini qanday o‘qish', i2: '🌦 Yoz, qish yoki barcha fasl?', i3: '🚚 Yetkazib berish va to‘lov', i4: '🛡 Kafolat va qaytarish', i5: '❓ Savol-javoblar',
  g1: '<b>Shina o‘lchamini qanday o‘qish</b>\nMasalan <code>205/55 R16</code>:\n• 205 — kenglik, mm\n• 55 — profil balandligi (kenglikdan %)\n• R16 — disk diametri, dyuym\nC harfi (195/75 R16C) — mikroavtobuslar uchun kuchaytirilgan shina.',
  g2: '<b>Qaysi faslni tanlash</b>\n☀️ Yoz — +7°C dan yuqorida.\n❄️ Qish — barqaror +5°C dan past, qor va muz.\n🌤 Barcha fasl — Toshkentning yumshoq qishi uchun murosa.\nKunduzi barqaror +7°C dan past yoki +10°C dan yuqori bo‘lganda almashtiring.',
  g3: '<b>Yetkazib berish va to‘lov</b>\n🚚 Toshkent bo‘ylab — odatda buyurtma kuni. Narxi va bepul chegara savatda ko‘rinadi.\n🏪 O‘zi olib ketish — bepul.\n💵💳 Olishda to‘lov: naqd yoki karta.\n🛞 Komplekt (4 dona) uchun chegirma.', g4: '<b>Kafolat va qaytarish</b>\n🛡 Shina va disklarga ishlab chiqaruvchi va do‘kon kafolati.\n🔁 Qaytarish — tovar mos kelmasa va ishlatilmagan bo‘lsa, qadoq va chek saqlangan holda.\nShartlarni menejerdan aniqlang.',
  invite: '🎁 Do‘stni taklif qilish', inviteText: l => `🎁 <b>Do‘stingizni taklif qiling</b>\nUnga havolangizni yuboring:\n${l}\n\nDo‘stingiz birinchi buyurtmaga 5% chegirma oladi, siz esa uning birinchi xarididan keyin 5 000 ball.`, welcomeBonus: '🎁 Birinchi buyurtmaga 5% chegirma mavjud (promokod avtomatik qo‘llanadi).', friendJoined: '🎉 Havolangiz orqali do‘stingiz keldi! Ballar uning birinchi xarididan keyin beriladi.', friendBonus: n => `🎁 Do‘stingiz birinchi xaridni qildi: +${n} ball.`,
  notifOn: '🔔 Xabarnomalar: yoqilgan', notifOff: '🔕 Xabarnomalar: o‘chirilgan', deleteMe: '🗑 Ma’lumotlarimni o‘chirish', deleteAsk: 'Barcha ma’lumotlaringiz (savat, sevimlilar, ballar) o‘chirilsinmi? Buyurtmalar do‘konda qoladi.', deleted: 'Ma’lumotlar o‘chirildi.', yes: 'Ha', no: 'Yo‘q',
  cartRemind: '🛒 Savatda tovarlar qoldi. Buyurtma beramizmi?', showMap: '📍 Xaritada', shopContact: '☎ Do‘kon kontakti', sizeHint: 'Maslahat: o‘lchamni yozing, masalan 205/55 R16.', total2: 'To‘lov', continue: '🛍 Xaridni davom ettirish', myCars: 'Mening mashinalarim', repeatDone: 'Buyurtmadagi tovarlar savatga qo‘shildi 🛒', notFoundCar: 'Menejerga avtomobil markasi va yilini yozing — tanlab beramiz.' },
 en: { btn: { price: '💰 Price list', deals: '🔥 Hits & deals', info: 'ℹ️ Info' },
  priceTitle: '💰 <b>Price list</b>\nChoose a section or download everything as a file:', priceNote: 'Prices are approximate; please confirm the current price and availability with a manager.', priceFile: '📄 Download full price list (CSV)',
  dealsTitle: '🔥 Hits & deals', fMenu: '🎯 <b>Tire finder</b>\nHow should we search?', byDims: '📏 By size', byCar: '🚗 By car', bySeason: '🌦 By season', pickCar: '🚗 Choose your car:', otherCar: '❓ My car is not here → manager', saveCar: '💾 Save as my car', carSaved: 'Saved ✅ It now appears in “Tire finder”.', pickSeason: 'Choose a season:',
  kit: '🛞 Set of 4', kitDisc: n => `🎁 Set discount −${n}%`, cmpBtn: '⚖️ Compare', cmpTitle: '⚖️ <b>Comparison</b>', cmpClear: '🧹 Clear comparison', cmpNeed: 'Add one more item and I will show the comparison.',
  rgLow: 'under 500k', rgMid: '500k–1M', rgHigh: 'over 1M', sSummer: '☀️ Summer', sWinter: '❄️ Winter', sAll: '🌤 All-season',
  usePhone: p => `📱 Use ${p}`, useAddr: a => `📍 ${a.slice(0, 40)}`, askSlot: 'When would you like it?', slotAsap: '⚡ As soon as possible', slotToday: '📅 Today', slotTomorrow: '📅 Tomorrow', askPay: 'Payment method:', payCash: '💵 Cash', payCard: '💳 Card on receipt', slot: 'When', payL: 'Payment',
  points: n => `💎 Points: ${n}`, usePoints: n => `💎 Use points (−${n})`, pointsOff: '💎 Don’t use points', pointsUsed: 'Points used', earned: n => `🎉 You earned ${n} points (1 point = 1 UZS off).`,
  cancelOrder: '❌ Cancel', cancelledOk: 'Order cancelled ✅', cantCancel: 'The order is already in progress — please contact a manager.', rateAsk: id => `Order #${id} completed ✅\nPlease rate our service:`, rateThanks: 'Thanks for rating! ⭐', rateBtn: '⭐ Rate',
  closedNote: '🔴 We are closed now — a manager will contact you during working hours.', openS: '🟢 Open now', closedS: '🔴 Closed now',
  infoMenu: 'ℹ️ <b>Useful</b>', i1: '📏 How to read tire size', i2: '🌦 Summer, winter or all-season?', i3: '🚚 Delivery & payment', i4: '🛡 Warranty & returns', i5: '❓ FAQ',
  g1: '<b>How to read tire size</b>\nFor example <code>205/55 R16</code>:\n• 205 — width in mm\n• 55 — sidewall height as % of width\n• R16 — wheel diameter in inches\nLetter C (195/75 R16C) — reinforced tire for vans.',
  g2: '<b>Which season to choose</b>\n☀️ Summer — above +7°C.\n❄️ Winter — steadily below +5°C, snow and ice.\n🌤 All-season — a compromise for Tashkent’s mild winters.\nSwap when daytime temperatures stay below +7°C or above +10°C.',
  g3: '<b>Delivery & payment</b>\n🚚 Around Tashkent — usually the same day. Fee and free-delivery threshold are shown in the cart.\n🏪 Pickup — free.\n💵💳 Pay on receipt: cash or card.\n🛞 Discount when you buy a set of 4.', g4: '<b>Warranty & returns</b>\n🛡 Tires and wheels come with manufacturer and store warranty.\n🔁 Returns — if the item did not fit and was not used, with packaging and receipt.\nAsk a manager for details.',
  invite: '🎁 Invite a friend', inviteText: l => `🎁 <b>Invite a friend</b>\nSend them your link:\n${l}\n\nYour friend gets 5% off the first order, and you get 5,000 points after their first purchase.`, welcomeBonus: '🎁 You have 5% off your first order (applied automatically).', friendJoined: '🎉 A friend joined via your link! Points arrive after their first purchase.', friendBonus: n => `🎁 Your friend made a first purchase: +${n} points.`,
  notifOn: '🔔 Newsletters: on', notifOff: '🔕 Newsletters: off', deleteMe: '🗑 Delete my data', deleteAsk: 'Delete all your data (cart, favorites, points)? Orders stay with the store.', deleted: 'Data deleted.', yes: 'Yes', no: 'No',
  cartRemind: '🛒 You left items in your cart. Shall we place the order?', showMap: '📍 On map', shopContact: '☎ Store contact', sizeHint: 'Tip: type a size, e.g. 205/55 R16.', total2: 'To pay', continue: '🛍 Continue shopping', myCars: 'My cars', repeatDone: 'Items from the order were added to your cart 🛒', notFoundCar: 'Tell the manager your car make and year — we will find the right tires.' }
};
for (const k of Object.keys(L)) { const { btn, ...rest } = X[k]; Object.assign(L[k].btn, btn); Object.assign(L[k], rest); }
Object.assign(L.ru, { allParts: 'Все запчасти', pickCat: 'Выберите раздел:' }); Object.assign(L.uz, { allParts: 'Barcha ehtiyot qismlar', pickCat: 'Bo‘limni tanlang:' }); Object.assign(L.en, { allParts: 'All parts', pickCat: 'Choose a section:' });
const lg = u => L[u.lang] || L.ru;
const money = (n, l) => Number(n).toLocaleString('ru-RU') + ' ' + L[l].cur;
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);
let BOT_NAME = '';

/* ---------- Telegram API ---------- */
async function call(method, body) {
  try {
    const r = await fetch(API + method, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json();
    if (!j.ok) { console.error(method, j.description); if (j.error_code === 403 && body.chat_id && state.users[body.chat_id]) { state.users[body.chat_id].blocked = true; } }
    return j.result;
  } catch (e) { console.error(method, e.message); }
}
const send = (chat_id, text, extra = {}) => call('sendMessage', { chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
const edit = (chat_id, message_id, text, extra = {}) => call('editMessageText', { chat_id, message_id, text, parse_mode: 'HTML', ...extra });
async function upload(method, chat_id, field, blob, name, extra = {}) {
  try { const f = new FormData(); f.set('chat_id', String(chat_id)); for (const [k, v] of Object.entries(extra)) f.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v)); f.set(field, blob, name); const j = await (await fetch(API + method, { method: 'POST', body: f })).json(); if (!j.ok) console.error(method, j.description); return j.result; }
  catch (e) { console.error(method, e.message); }
}
let logoId = null;
async function sendLogo(chat_id, caption, extra = {}) {
  if (logoId) return call('sendPhoto', { chat_id, photo: logoId, caption, parse_mode: 'HTML', ...extra });
  const r = await upload('sendPhoto', chat_id, 'photo', new Blob([LOGO()], { type: LOGO_TYPE[0] }), LOGO_TYPE[1], { caption, parse_mode: 'HTML', ...(extra.reply_markup ? { reply_markup: extra.reply_markup } : {}) });
  if (r) { logoId = r.photo.at(-1).file_id; return r; } return send(chat_id, caption, extra);
}
const sendDoc = (chat, text, name, caption) => upload('sendDocument', chat, 'document', new Blob(['﻿' + text], { type: 'text/csv' }), name, caption ? { caption } : {});
const ik = rows => ({ reply_markup: { inline_keyboard: rows } });
const mainKb = u => { const b = lg(u).btn; return { reply_markup: { keyboard: [[{ text: b.catalog }, { text: b.price }, { text: b.pick }], [{ text: b.search }, { text: b.deals }, { text: b.cart }], [{ text: b.fav }, { text: b.orders }, { text: b.manager }], [{ text: b.contacts }, { text: b.info }, { text: b.settings }]], resize_keyboard: true } }; };
const langKb = () => ik([[...Object.entries(L).map(([k, v]) => ({ text: v.flag + ' ' + v.code, callback_data: 'lang:' + k }))]]);

/* ---------- цены, скидки, магазин ---------- */
const isTire = p => p.cat.startsWith('tires_');
const unit = (p, q) => isTire(p) && q >= KIT_MIN && KIT_PCT ? Math.round(p.price * (100 - KIT_PCT) / 100) : p.price;
const promos = () => ({ ...PROMOS, ...(state.promos || {}) });
const salePct = p => p.old && p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
function shopOpen() {
  const m = String(STORE.hours).match(/(\d{1,2}):?(\d{2})?\D+(\d{1,2}):?(\d{2})?/); if (!m) return true;
  const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number), cur = now[0] * 60 + now[1];
  return cur >= (+m[1]) * 60 + (+m[2] || 0) && cur < (+m[3]) * 60 + (+m[4] || 0);
}
const cartIds = u => Object.keys(u.cart).filter(id => prod(id));
function totals(u, d = {}) {
  let sub = 0, kit = 0; for (const id of cartIds(u)) { const p = prod(id), q = u.cart[id]; sub += unit(p, q) * q; kit += (p.price - unit(p, q)) * q; }
  const pct = promos()[u.promo] || 0, disc = Math.round(sub * pct / 100), after = sub - disc;
  const fee = d.delivery === 'pickup' ? 0 : (FREE_FROM && after >= FREE_FROM ? 0 : FEE), pts = d.usePoints ? Math.min(u.points || 0, Math.floor(after * 0.3)) : 0;
  return { sub, kit, pct, disc, fee, pts, total: after - pts + fee };
}

/* ---------- списки и карточки ---------- */
const PAGE = 6, RANGES = { low: [0, 500000], mid: [500000, 1000000], high: [1000000, 1e12] };
function listView(u, rt, page) {
  const t = lg(u), l = u.lang; let ids = rt.list.map(prod).filter(Boolean);
  if (rt.range) ids = ids.filter(p => p.price >= RANGES[rt.range][0] && p.price < RANGES[rt.range][1]);
  if (rt.season) ids = ids.filter(p => p.season === rt.season);
  if (rt.sort) ids.sort((a, b) => rt.sort === 'asc' ? a.price - b.price : b.price - a.price);
  const n = ids.length, pages = Math.max(1, Math.ceil(n / PAGE)); page = Math.min(Math.max(1, page), pages); rt.page = page;
  const badge = p => (p.hit ? '🔥' : '') + (salePct(p) ? '🏷' : '') + (p.new ? '🆕' : '') + (avail(p) ? '' : '❌');
  const rows = ids.slice((page - 1) * PAGE, page * PAGE).map(p => [{ text: `${badge(p)}${nm(p, l).slice(0, 24)}${carShort(p) ? ' · ' + carShort(p).slice(0, 14) : ''} · ${Math.round(p.price / 1000)}k`, callback_data: 'i:' + p.id }]);
  const nav = []; if (page > 1) nav.push({ text: '◀', callback_data: 'pg:' + (page - 1) }); nav.push({ text: t.page(page, pages), callback_data: 'n' }); if (page < pages) nav.push({ text: '▶', callback_data: 'pg:' + (page + 1) });
  const mark = (c, k, txt) => ({ text: (c === k ? '✓ ' : '') + txt, callback_data: (k === 'summer' || k === 'winter' || k === 'all' ? 'sn:' : 'rg:') + k });
  rows.push([mark(rt.range, 'low', t.rgLow), mark(rt.range, 'mid', t.rgMid), mark(rt.range, 'high', t.rgHigh)]);
  if (rt.list.some(id => { const p = prod(id); return p && p.season; })) rows.push([mark(rt.season, 'summer', t.sSummer), mark(rt.season, 'winter', t.sWinter), mark(rt.season, 'all', t.sAll)]);
  rows.push(nav, [{ text: t.sortAsc, callback_data: 'sort:asc' }, { text: t.sortDesc, callback_data: 'sort:desc' }, { text: t.back, callback_data: 'cats' }]);
  return { text: n ? t.itemsIn(esc(rt.title), n) : `${esc(rt.title)}\n${t.none}`, kb: ik(rows) };
}
async function showList(chat, u, mid) { const v = listView(u, R(chat), R(chat).page || 1); return mid ? edit(chat, mid, v.text, v.kb) : send(chat, v.text, v.kb); }
const catsKb = u => ik(CAT.categories.map(c => [{ text: cname(c, u.lang), callback_data: 'c:' + c.id }]));
const setList = (chat, ids, title) => Object.assign(R(chat), { list: ids, title, sort: '', range: '', season: '', page: 1 });

function card(u, p) {
  const t = lg(u), l = u.lang, sp = salePct(p), cnt = Object.values(u.cart).reduce((a, b) => a + b, 0);
  const stt = !avail(p) ? t.out : (p.stock !== null && p.stock <= 5 ? t.left(p.stock) : t.inStock);
  const text = `${p.hit ? '🔥 ' : ''}${p.new ? '🆕 ' : ''}<b>${esc(nm(p, l))}</b>\n${t.for}: ${esc(p.car[l] || p.car.ru)}\n${p.sku ? 'SKU: ' + esc(p.sku) + (p.brand ? ' · ' + esc(p.brand) : '') + '\n' : ''}${t.price}: <b>${money(p.price, l)}</b>${sp ? ` <s>${money(p.old, l)}</s> 🏷 −${sp}%` : ''}\n${isTire(p) && KIT_PCT ? t.kitDisc(KIT_PCT) + ' (4+)\n' : ''}${stt}\n\n${esc(p.desc[l] || p.desc.ru)}`;
  const fav = u.fav.includes(p.id);
  const row1 = avail(p) ? (isTire(p) ? [{ text: t.add, callback_data: 'a:' + p.id }, { text: t.kit, callback_data: 'a4:' + p.id }] : [{ text: t.add, callback_data: 'a:' + p.id }]) : [{ text: t.notify, callback_data: 'nf:' + p.id }];
  return { text, kb: ik([row1, [{ text: fav ? t.favDel : t.favAdd, callback_data: 'f:' + p.id }, { text: t.cmpBtn, callback_data: 'cmp:' + p.id }], [{ text: t.toCart(cnt), callback_data: 'cart' }]]) };
}
const sendCard = async (chat, u, p) => { const c = card(u, p); return p.photo ? call('sendPhoto', { chat_id: chat, photo: p.photo, caption: c.text, parse_mode: 'HTML', ...c.kb }) : send(chat, c.text, c.kb); };
const editCard = (chat, msg, u, p) => { const c = card(u, p); return msg.photo ? call('editMessageCaption', { chat_id: chat, message_id: msg.message_id, caption: c.text, parse_mode: 'HTML', ...c.kb }) : edit(chat, msg.message_id, c.text, c.kb); };

function compareView(u, ids) {
  const t = lg(u), l = u.lang, ps = ids.map(prod).filter(Boolean);
  const lines = ps.map(p => `<b>${esc(nm(p, l))}</b>\n${t.price}: ${money(p.price, l)}\n${p.season ? t.season[p.season] + ' · ' : ''}${avail(p) ? t.inStock : t.out}\n${t.for}: ${esc(p.car[l] || p.car.ru)}`);
  return t.cmpTitle + '\n\n' + lines.join('\n\n— — —\n\n');
}

/* ---------- прайс-лист ---------- */
function priceText(u, catId) {
  const t = lg(u), l = u.lang, cats = catId ? CAT.categories.filter(c => c.id === catId) : CAT.categories, out = [];
  for (const c of cats) { let s = `<b>${esc(cname(c, l))}</b>\n`; for (const p0 of CAT.products.filter(p => p.cat === c.id)) { const p = prod(p0.id); s += `${avail(p) ? '•' : '✖'} ${esc(fullName(p, l))} — <b>${Number(p.price).toLocaleString('ru-RU')}</b>\n`; } out.push(s); }
  const txt = out.join('\n') + '\n<i>' + t.priceNote + (KIT_PCT && hasTires() ? ' ' + t.kitDisc(KIT_PCT) + ' (4+).' : '') + '</i>', parts = []; let cur = '';
  for (const line of txt.split('\n')) { if ((cur + line).length > 3500) { parts.push(cur); cur = ''; } cur += line + '\n'; } if (cur) parts.push(cur); return parts;
}
function priceCsv(u) { const l = u.lang; return 'ID;' + L[l].btn.catalog + ';Name;Price;Stock\n' + CAT.products.map(p0 => { const p = prod(p0.id), c = CAT.categories.find(x => x.id === p.cat); return [p.id, cname(c, l), nm(p, l), p.price, avail(p) ? (p.stock ?? 'yes') : 0].join(';'); }).join('\n'); }

/* ---------- корзина ---------- */
function cartView(u) {
  const t = lg(u), l = u.lang, ids = cartIds(u); if (!ids.length) return { text: t.cartEmpty, kb: ik([[{ text: t.btn.catalog, callback_data: 'cats' }]]) };
  const x = totals(u, { delivery: 'delivery' });
  const lines = ids.map(id => { const p = prod(id), q = u.cart[id], up = unit(p, q); return `• ${esc(fullName(p, l))}\n   ${q} × ${money(up, l)}${up < p.price ? ' 🎁' : ''} = <b>${money(up * q, l)}</b>`; });
  const rows = ids.map(id => [{ text: '−', callback_data: 'cm:' + id }, { text: `${nm(prod(id), l).slice(0, 22)} · ${u.cart[id]}`, callback_data: 'n' }, { text: '+', callback_data: 'cp:' + id }]);
  rows.push([{ text: t.promo, callback_data: 'promo' }, { text: t.clear, callback_data: 'cx' }], [{ text: t.continue, callback_data: 'cats' }, { text: t.checkout, callback_data: 'co' }]);
  return { text: `${t.cartTitle}\n\n${lines.join('\n')}\n\n${x.kit ? t.kitDisc(KIT_PCT) + ': −' + money(x.kit, l) + '\n' : ''}${x.disc ? t.discount(x.pct) + ': −' + money(x.disc, l) + '\n' : ''}<b>${t.total}: ${money(x.sub - x.disc, l)}</b>${u.points ? '\n' + t.points(u.points) : ''}`, kb: ik(rows) };
}
const showCart = async (chat, u, mid) => { const v = cartView(u); return mid ? edit(chat, mid, v.text, v.kb) : send(chat, v.text, v.kb); };

/* ---------- оформление: один «двигатель» шагов ---------- */
function summary(u, d) {
  const t = lg(u), l = u.lang, x = totals(u, d);
  return `${t.check}\n${t.phone}: ${esc(d.phone)}\n${d.delivery === 'pickup' ? '🏪 ' + t.pickup : '🚚 ' + t.addr + ': ' + esc(d.address)}\n🕒 ${t.slot}: ${esc(t[SLOT[d.slot]] || '')}\n💳 ${t.payL}: ${d.pay === 'card' ? t.payCard : t.payCash}${d.note ? `\n${t.note}: ${esc(d.note)}` : ''}\n\n${t.subtotal}: ${money(x.sub, l)}${x.disc ? `\n${t.discount(x.pct)}: −${money(x.disc, l)}` : ''}${x.pts ? `\n${t.pointsUsed}: −${money(x.pts, l)}` : ''}\n${t.delivery}: ${x.fee ? money(x.fee, l) : t.free}\n<b>${t.total2}: ${money(x.total, l)}</b>${shopOpen() ? '' : '\n\n' + t.closedNote}`;
}
async function advance(chat, u) {
  const t = lg(u), rt = R(chat), d = rt.draft;
  if (!d.phone) { rt.step = 'phone'; await send(chat, t.askPhone, { reply_markup: { keyboard: [[{ text: t.sendPhone, request_contact: true }], [{ text: t.cancel }]], resize_keyboard: true, one_time_keyboard: true } }); return u.phone ? send(chat, '👇', ik([[{ text: t.usePhone(u.phone), callback_data: 'up' }]])) : null; }
  if (!d.delivery) { rt.step = null; return send(chat, t.howGet, ik([[{ text: t.btnDelivery, callback_data: 'dl:delivery' }, { text: t.btnPickup, callback_data: 'dl:pickup' }]])); }
  if (d.delivery === 'delivery' && !d.address) { rt.step = 'addr'; await send(chat, t.askAddr, { reply_markup: { keyboard: [[{ text: t.sendLoc, request_location: true }], [{ text: t.cancel }]], resize_keyboard: true, one_time_keyboard: true } }); return u.address ? send(chat, '👇', ik([[{ text: t.useAddr(u.address), callback_data: 'ua' }]])) : null; }
  if (!d.slot) { rt.step = null; return send(chat, t.askSlot, ik([[{ text: t.slotAsap, callback_data: 'sl:asap' }], [{ text: t.slotToday, callback_data: 'sl:today' }, { text: t.slotTomorrow, callback_data: 'sl:tomorrow' }]])); }
  if (!d.pay) { rt.step = null; return send(chat, t.askPay, ik([[{ text: t.payCash, callback_data: 'py:cash' }, { text: t.payCard, callback_data: 'py:card' }]])); }
  if (d.note === undefined) { rt.step = 'note'; await send(chat, t.askNote, { reply_markup: { remove_keyboard: true } }); return send(chat, '👇', ik([[{ text: t.skip, callback_data: 'skip' }]])); }
  rt.step = null; return send(chat, summary(u, d), sumKb(u, d));
}
function sumKb(u, d) {
  const t = lg(u), x = totals(u, { ...d, usePoints: false }), rows = [], max = Math.min(u.points || 0, Math.floor((x.sub - x.disc) * 0.3));
  if (max > 0) rows.push([{ text: d.usePoints ? t.pointsOff : t.usePoints(max), callback_data: 'pts' }]);
  rows.push([{ text: t.confirm, callback_data: 'ok' }, { text: t.cancel.replace('✖ ', '❌ '), callback_data: 'no' }]);
  return ik(rows);
}
async function notifyAdmins(text, extra) { for (const a of ADMINS) await send(a, text, extra); }
async function placeOrder(chat, u, from) {
  const t = lg(u), rt = R(chat), d = rt.draft, ids = cartIds(u);
  for (const id of ids) { const p = prod(id); if (!avail(p) || (p.stock !== null && p.stock < u.cart[id])) return send(chat, t.stockShort(nm(p, u.lang)), mainKb(u)); }
  const x = totals(u, d), items = ids.map(id => ({ id: +id, qty: u.cart[id], name: fullName(prod(id), 'ru'), price: unit(prod(id), u.cart[id]) }));
  const order = { id: state.nextOrder++, uid: chat, user: u.name, lang: u.lang, items, phone: d.phone, delivery: d.delivery, address: d.address || '', slot: d.slotL, pay: d.pay, note: d.note || '', promo: x.pct ? u.promo : '', discount: x.disc + x.kit, points: x.pts, fee: x.fee, total: x.total, status: 'new', ts: Date.now() };
  if (SB_URL && SB_KEY) {
    try { const r = await fetch(SB_URL + '/rest/v1/rpc/place_order', { method: 'POST', headers: { apikey: SB_KEY, authorization: 'Bearer ' + SB_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ items: items.map(i => ({ id: i.id, qty: i.qty })), p_phone: order.phone, p_address: order.address, p_comment: (order.note || 'Telegram') + ' | ' + (order.slot || ''), p_delivery: order.delivery, p_payment: order.pay, p_promo: '', p_name: order.user || 'Telegram' }) }); if (r.ok) order.dbId = await r.json(); } catch (e) { console.error('db order:', e.message); }
  }
  const low = [];
  for (const i of items) { const p = prod(i.id); if (p.stock !== null) { const o = state.over[i.id] = state.over[i.id] || {}; o.stock = p.stock - i.qty; if (o.stock <= 3) low.push(`${p.name.ru} — ${o.stock}`); } }
  u.points = (u.points || 0) - x.pts; u.phone = d.phone; if (d.address) u.address = d.address; u.cart = {}; u.promo = ''; u.remindSent = false;
  state.orders.push(order); rt.step = null; rt.draft = null; save();
  const txt = `🆕 <b>Заказ №${order.id}</b> от ${esc(order.user)}\n📞 ${esc(order.phone)}\n${order.delivery === 'pickup' ? '🏪 Самовывоз' : '📍 ' + esc(order.address)}\n🕒 ${esc(order.slot || '')} · ${order.pay === 'card' ? '💳 карта' : '💵 наличные'}${order.note ? '\n💬 ' + esc(order.note) : ''}\n\n${items.map(i => `• ${esc(i.name)} × ${i.qty}`).join('\n')}\n\n<b>${money(order.total, 'ru')}</b>${order.promo ? ' (' + order.promo + ')' : ''}${order.points ? ' · баллы −' + order.points : ''}`;
  await notifyAdmins(txt, ik([[{ text: '🔧 В работу', callback_data: `as:${order.id}:processing` }, { text: '✅ Выполнен', callback_data: `as:${order.id}:done` }, { text: '❌ Отмена', callback_data: `as:${order.id}:cancelled` }], [{ text: '💬 Написать клиенту', callback_data: 'ar:' + chat }]]));
  if (low.length) await notifyAdmins('⚠️ Заканчивается: ' + low.join('; '));
  return send(chat, t.orderOk(order.id) + (shopOpen() ? '' : '\n\n' + t.closedNote), mainKb(u));
}

/* ---------- прочие экраны ---------- */
const CARS = ['Cobalt', 'Damas', 'Gentra', 'Lacetti', 'Nexia', 'Spark', 'Matiz', 'Malibu', 'Captiva', 'Tracker'];
const carIds = tok => CAT.products.filter(p => JSON.stringify(p.car).toLowerCase().includes(tok.toLowerCase())).map(p => p.id);
const ST = { new: '🆕', processing: '🔧', done: '✅', cancelled: '❌' };
const contacts = u => { const t = lg(u); return `${t.contacts}\n${shopOpen() ? t.openS : t.closedS}\n${STORE.phone ? '☎ ' + esc(STORE.phone) + '\n' : ''}📍 ${esc(STORE.address)}\n🕘 ${t.hours}: ${esc(STORE.hours)}${STORE.telegram ? '\n✈ @' + esc(STORE.telegram) : ''}`; };
function ordersView(u, chat) {
  const t = lg(u), l = u.lang, mine = state.orders.filter(o => o.uid === chat).slice(-6).reverse(); if (!mine.length) return { text: t.noOrders, kb: ik([[{ text: t.btn.catalog, callback_data: 'cats' }]]) };
  const rows = mine.map(o => [{ text: `${t.repeat} №${o.id}`, callback_data: 'rp:' + o.id }, ...(o.status === 'new' ? [{ text: `${t.cancelOrder} №${o.id}`, callback_data: 'oc:' + o.id }] : []), ...(o.status === 'done' && !o.rating ? [{ text: t.rateBtn, callback_data: `rt:${o.id}:5` }] : [])]);
  return { text: t.myOrders + `\n${t.points(u.points || 0)}\n\n` + mine.map(o => `<b>${t.order} №${o.id}</b> · ${new Date(o.ts).toLocaleDateString('ru-RU')}\n${t.st[o.status]} · ${money(o.total, l)}${o.rating ? ' · ' + '⭐'.repeat(o.rating) : ''}\n${o.items.map(i => esc(i.name) + ' × ' + i.qty).join(', ')}`).join('\n\n'), kb: ik(rows) };
}
function pickStep(u, rt) {
  const t = lg(u), f = rt.pick, tires = CAT.products.filter(p => p.w && (!f.w || p.w === f.w) && (!f.h || p.h === f.h));
  const key = !f.w ? 'w' : !f.h ? 'h' : 'd', vals = [...new Set(tires.map(p => p[key]))].sort((a, b) => a - b);
  return { text: `${t.pick}\n${f.w || '…'}/${f.h || '…'} R…\n\n${{ w: t.pickW, h: t.pickH, d: t.pickD }[key]}`, kb: ik([...chunk(vals.map(v => ({ text: v, callback_data: `p${key}:${v}` })), 4), [{ text: t.back, callback_data: 'fm' }]]) };
}
const hasTires = () => CAT.products.some(isTire);
const finderMenu = u => { const t = lg(u), cars = CARS.filter(c => carIds(c).length), top = hasTires() ? [[{ text: t.byDims, callback_data: 'pick' }, { text: t.bySeason, callback_data: 'fs' }]] : [];
  return { text: hasTires() ? t.fMenu : t.pickCar, kb: ik([...top, ...chunk(cars.map(c => ({ text: '🚗 ' + c, callback_data: 'fcar:' + c })), 3), [{ text: t.otherCar, callback_data: 'fcar:?' }], ...(u.cars || []).map(c => [{ text: '⭐ ' + c, callback_data: 'fcar:' + c }])]) }; };
const infoMenu = u => { const t = lg(u); return { text: t.infoMenu, kb: ik([[{ text: t.i1, callback_data: 'inf:g1' }], [{ text: t.i2, callback_data: 'inf:g2' }], [{ text: t.i3, callback_data: 'inf:g3' }], [{ text: t.i4, callback_data: 'inf:g4' }], [{ text: t.i5, callback_data: 'inf:faq' }], [{ text: t.invite, callback_data: 'inv' }]]) }; };
const settingsView = u => { const t = lg(u); return { text: t.settings, kb: ik([[...Object.entries(L).map(([k, v]) => ({ text: v.flag + ' ' + v.code, callback_data: 'lang:' + k }))], [{ text: u.mute ? t.notifOff : t.notifOn, callback_data: 'nt' }], [{ text: t.invite, callback_data: 'inv' }], [{ text: t.deleteMe, callback_data: 'del' }]]) }; };

/* ---------- админ ---------- */
const nOrd = s => state.orders.filter(o => o.status === s).length;
async function adminPanel(chat, mid) {
  const txt = `🛠 <b>Админ-панель</b>\n🆕 ${nOrd('new')} · 🔧 ${nOrd('processing')} · ✅ ${nOrd('done')} · ❌ ${nOrd('cancelled')}\n👥 Клиентов: ${Object.keys(state.users).length}\n\n<code>/setprice id цена · /setstock id кол-во · /sale id новая_цена · /unsale id · /hit id · /promo КОД % · /delpromo КОД · /order №</code>\nФото товара: отправьте фото с подписью <code>/photo id</code>`;
  const kb = ik([[{ text: '🆕 Новые', callback_data: 'ao:new' }, { text: '🔧 В работе', callback_data: 'ao:processing' }], [{ text: '📊 Статистика', callback_data: 'stat' }, { text: '📦 Остатки', callback_data: 'ast:1' }], [{ text: '🎟 Промокоды', callback_data: 'pr' }, { text: '📣 Рассылка', callback_data: 'ab' }], [{ text: '📤 Экспорт заказов', callback_data: 'ex' }]]);
  return mid ? edit(chat, mid, txt, kb) : send(chat, txt, kb);
}
const orderLine = o => `${ST[o.status]} <b>№${o.id}</b> · ${esc(o.user)} · ${esc(o.phone)}\n${o.delivery === 'pickup' ? 'Самовывоз' : esc(o.address)} · ${esc(o.slot || '')}\n${o.items.map(i => esc(i.name) + ' × ' + i.qty).join('\n')}\n<b>${money(o.total, 'ru')}</b>${o.rating ? ' · ' + '⭐'.repeat(o.rating) : ''}`;
const orderKb = o => ik([[{ text: '🔧', callback_data: `as:${o.id}:processing` }, { text: '✅', callback_data: `as:${o.id}:done` }, { text: '❌', callback_data: `as:${o.id}:cancelled` }, { text: '💬', callback_data: 'ar:' + o.uid }]]);
async function adminOrders(chat, status) { const l = state.orders.filter(o => o.status === status).slice(-10); if (!l.length) return send(chat, 'Пусто.'); for (const o of l) await send(chat, orderLine(o), orderKb(o)); }
function statsText() {
  const day = 864e5, now = Date.now(), ok = state.orders.filter(o => o.status !== 'cancelled'), sum = a => a.reduce((s, o) => s + o.total, 0), t0 = new Date().setHours(0, 0, 0, 0);
  const today = ok.filter(o => o.ts >= t0), week = ok.filter(o => now - o.ts < 7 * day), top = {}; for (const o of ok) for (const i of o.items) top[i.name] = (top[i.name] || 0) + i.qty;
  const rated = state.orders.filter(o => o.rating), avg = rated.length ? (rated.reduce((s, o) => s + o.rating, 0) / rated.length).toFixed(1) : '—';
  return `📊 <b>Статистика</b>\nСегодня: ${today.length} зак. · ${money(sum(today), 'ru')}\n7 дней: ${week.length} зак. · ${money(sum(week), 'ru')}\nВсего: ${ok.length} зак. · ${money(sum(ok), 'ru')}\n👥 Клиентов: ${Object.keys(state.users).length}\n⭐ Средняя оценка: ${avg} (${rated.length})\n\n<b>Топ товаров</b>\n${Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, q]) => `• ${esc(n)} — ${q}`).join('\n') || '—'}`;
}
async function adminStock(chat, mid, page) {
  const all = CAT.products, pages = Math.ceil(all.length / 8); page = Math.min(Math.max(1, page), pages);
  const rows = all.slice((page - 1) * 8, page * 8).map(p0 => { const p = prod(p0.id); return [{ text: `${avail(p) ? '✅' : '❌'} ${p.id}. ${p.name.ru.slice(0, 26)}${p.stock !== null ? ' · ' + p.stock : ''} · ${Math.round(p.price / 1000)}к`, callback_data: `at:${p.id}:${page}` }]; });
  const nav = []; if (page > 1) nav.push({ text: '◀', callback_data: 'ast:' + (page - 1) }); nav.push({ text: `${page}/${pages}`, callback_data: 'n' }); if (page < pages) nav.push({ text: '▶', callback_data: 'ast:' + (page + 1) });
  rows.push(nav, [{ text: '⬅', callback_data: 'ad' }]);
  return edit(chat, mid, '📦 <b>Остатки</b> (нажмите: вкл/выкл наличие). Цена и количество: /setprice, /setstock', ik(rows));
}
async function setStatus(oid, status) {
  const o = state.orders.find(x => x.id === +oid); if (!o || o.status === status) return; const was = o.status; o.status = status;
  const cu = U(o.uid), t = L[cu.lang || 'ru'];
  if (status === 'cancelled' && was !== 'cancelled') { for (const i of o.items) { const ov = state.over[i.id]; if (ov && ov.stock !== undefined && prod(i.id).stock !== null) ov.stock += i.qty; } if (o.points) cu.points = (cu.points || 0) + o.points; }
  save(); await send(o.uid, t.stChanged(o.id, t.st[status]));
  if (status === 'done') {
    const earn = Math.floor(o.total * 0.01); if (earn > 0) { cu.points = (cu.points || 0) + earn; await send(o.uid, t.earned(earn)); }
    if (cu.ref && !cu.refPaid && state.users[cu.ref]) { cu.refPaid = true; const inv = state.users[cu.ref]; inv.points = (inv.points || 0) + 5000; await send(Number(cu.ref), L[inv.lang || 'ru'].friendBonus(5000)); }
    save(); await send(o.uid, t.rateAsk(o.id), ik([[1, 2, 3, 4, 5].map(n => ({ text: '⭐'.repeat(n), callback_data: `rt:${o.id}:${n}` }))]));
  }
}
async function restock(pid) { for (const [k, u] of Object.entries(state.users)) if ((u.alerts || []).includes(pid)) { u.alerts = u.alerts.filter(x => x !== pid); await send(Number(k), L[u.lang || 'ru'].restock(nm(prod(pid), u.lang || 'ru')), ik([[{ text: '👀', callback_data: 'i:' + pid }]])); } save(); }
async function broadcast(text) { let n = 0; for (const [k, u] of Object.entries(state.users)) { if (u.blocked || u.mute) continue; await send(Number(k), '📣 ' + esc(text)); n++; } return n; }
const setOver = (id, patch) => { const o = state.over[id] = state.over[id] || {}; Object.assign(o, patch); save(); };
async function adminCmd(chat, text) {
  const [c, ...a] = text.split(/\s+/), n = x => Number(String(x).replace(/\D/g, ''));
  if (c === '/setprice' && a.length >= 2 && prod(a[0])) { setOver(+a[0], { price: n(a[1]), old: undefined }); return send(chat, `✅ ${prod(a[0]).name.ru}: ${money(n(a[1]), 'ru')}`); }
  if (c === '/setstock' && a.length >= 2 && prod(a[0])) { setOver(+a[0], { stock: n(a[1]), in_stock: true }); return send(chat, `✅ Остаток: ${n(a[1])}`); }
  if (c === '/sale' && a.length >= 2 && prod(a[0])) { const p = prod(a[0]); setOver(+a[0], { old: p.old && p.old > p.price ? p.old : p.price, price: n(a[1]) }); return send(chat, `🏷 Акция: ${money(n(a[1]), 'ru')}`); }
  if (c === '/unsale' && prod(a[0])) { const p = prod(a[0]); setOver(+a[0], { price: p.old || p.price, old: null }); return send(chat, '✅ Акция снята'); }
  if (c === '/hit' && prod(a[0])) { const p = prod(a[0]); setOver(+a[0], { hit: !p.hit }); return send(chat, p.hit ? 'Хит снят' : '🔥 Добавлен в хиты'); }
  if (c === '/promo' && a.length >= 2) { state.promos = state.promos || {}; state.promos[a[0].toUpperCase()] = n(a[1]); save(); return send(chat, `🎟 ${a[0].toUpperCase()} — ${n(a[1])}%`); }
  if (c === '/delpromo' && a[0]) { delete (state.promos || {})[a[0].toUpperCase()]; save(); return send(chat, 'Удалён'); }
  if (c === '/order' && a[0]) { const o = state.orders.find(x => x.id === n(a[0])); return o ? send(chat, orderLine(o), orderKb(o)) : send(chat, 'Нет такого заказа'); }
  if (c === '/stats') return send(chat, statsText());
  if (c === '/export') return sendDoc(chat, 'id;date;client;phone;delivery;address;slot;pay;total;status;items\n' + state.orders.map(o => [o.id, new Date(o.ts).toISOString(), (o.user || '').replace(/;/g, ','), o.phone, o.delivery, (o.address || '').replace(/;/g, ','), o.slot || '', o.pay || '', o.total, o.status, o.items.map(i => i.name + ' x' + i.qty).join(' | ')].join(';')).join('\n'), 'orders.csv');
  return send(chat, 'Неизвестная команда. /admin');
}

/* ---------- обработчики ---------- */
const hits = new Map();
const flood = id => { const now = Date.now(), a = (hits.get(id) || []).filter(x => now - x < 5000); a.push(now); hits.set(id, a); return a.length > 12; };
const welcome = (chat, u, from) => sendLogo(chat, lg(u).welcome(from.first_name), mainKb(u));

async function onMessage(m) {
  const chat = m.chat.id, u = U(chat, m.from), rt = R(chat), text = (m.text || '').trim(); u.id = chat;
  if (m.chat.type !== 'private' || flood(chat)) return;
  if (isAdmin(chat) && m.photo && /^\/photo\s+\d+/.test(m.caption || '')) { const id = +m.caption.split(/\s+/)[1]; if (!prod(id)) return send(chat, 'Нет такого товара'); setOver(id, { photo: m.photo.at(-1).file_id }); return send(chat, `📷 Фото сохранено для №${id}`); }
  if (text.startsWith('/start')) {
    const arg = text.split(/\s+/)[1] || '';
    if (!u.lang) {
      if (arg.startsWith('ref_') && +arg.slice(4) !== chat && state.users[arg.slice(4)] && !u.ref) { u.ref = arg.slice(4); state.promos = state.promos || {}; state.promos.WELCOME5 = 5; u.promo = 'WELCOME5'; await send(Number(u.ref), L[state.users[u.ref].lang || 'ru'].friendJoined); u.welcome = true; }
      save(); return sendLogo(chat, L.ru.chooseLang, langKb());
    }
  }
  if (!u.lang) { if (!text && !m.contact) return; return send(chat, L.ru.chooseLang, langKb()); }
  const t = lg(u), btnOf = Object.entries(t.btn).find(([, v]) => v === text)?.[0];
  if (text === t.cancel || text === '/cancel') { rt.step = null; rt.draft = null; return send(chat, t.cancelled, mainKb(u)); }
  if (text === t.exit) { rt.step = null; return send(chat, t.menu, mainKb(u)); }
  if (text.startsWith('/')) {
    const c = text.split(/[\s@]/)[0];
    if (c === '/start' || c === '/menu') { rt.step = null; return welcome(chat, u, m.from); }
    if (isAdmin(chat) && c === '/admin') return adminPanel(chat);
    if (isAdmin(chat) && c === '/broadcast') { const msg = text.slice(10).trim(); return msg ? send(chat, `Отправлено: ${await broadcast(msg)}`) : send(chat, 'Использование: /broadcast текст'); }
    if (isAdmin(chat) && ['/setprice', '/setstock', '/sale', '/unsale', '/hit', '/promo', '/delpromo', '/order', '/stats', '/export'].includes(c)) return adminCmd(chat, text);
    if (c === '/lang' || c === '/settings') { const v = settingsView(u); return send(chat, v.text, v.kb); }
    if (c === '/catalog') return send(chat, t.cats, catsKb(u));
    if (c === '/cart') return showCart(chat, u);
    if (c === '/price') { const p = priceText(u); for (const x of p) await send(chat, x); return; }
    if (c === '/help') return send(chat, t.welcome(''), mainKb(u));
    if (c === '/id') return send(chat, `ID: <code>${chat}</code>`);
    return;
  }
  if (btnOf && ['support', 'search', 'promo'].includes(rt.step)) rt.step = null;
  if (rt.step === 'support') { await send(chat, '✅', { reply_markup: undefined }); for (const a of ADMINS) { await send(a, `💬 <b>${esc(u.name)}</b> (${chat}):`, ik([[{ text: '↩ Ответить', callback_data: 'ar:' + chat }]])); await call('copyMessage', { chat_id: a, from_chat_id: chat, message_id: m.message_id }); } return; }
  if (rt.step && rt.step.startsWith('reply:') && isAdmin(chat)) { const to = Number(rt.step.slice(6)); rt.step = null; await send(to, `💬 <b>${L[U(to).lang || 'ru'].managerReply}:</b>`); await call('copyMessage', { chat_id: to, from_chat_id: chat, message_id: m.message_id }); return send(chat, '✅ Отправлено'); }
  if (rt.step === 'broadcast' && isAdmin(chat)) { rt.step = null; return send(chat, `Отправлено: ${await broadcast(text)}`); }
  if (rt.step === 'search') { rt.step = null; return doSearch(chat, u, text); }
  if (rt.step === 'promo') { rt.step = null; const c = text.toUpperCase(); if (promos()[c]) { u.promo = c; save(); await send(chat, t.promoOk(promos()[c])); return showCart(chat, u); } return send(chat, t.promoBad); }
  if (rt.step === 'phone') { const ph = m.contact ? m.contact.phone_number : text; if (!/^\+?[\d\s()-]{7,}$/.test(ph)) return send(chat, t.badPhone); rt.draft.phone = ph; return advance(chat, u); }
  if (rt.step === 'addr') { if (!m.location && text.length < 3) return send(chat, t.askAddr); rt.draft.address = m.location ? `https://maps.google.com/?q=${m.location.latitude},${m.location.longitude}` : text.slice(0, 300); return advance(chat, u); }
  if (rt.step === 'note') { rt.draft.note = text.slice(0, 300); return advance(chat, u); }
  if (btnOf === 'catalog') return send(chat, t.cats, catsKb(u));
  if (btnOf === 'price') return send(chat, t.priceTitle, ik([...CAT.categories.map(c => [{ text: cname(c, u.lang), callback_data: 'plc:' + c.id }]), [{ text: t.priceFile, callback_data: 'plall' }]]));
  if (btnOf === 'search') { rt.step = 'search'; return send(chat, t.searchAsk); }
  if (btnOf === 'pick') { const v = finderMenu(u); return send(chat, v.text, v.kb); }
  if (btnOf === 'deals') { setList(chat, CAT.products.map(p => prod(p.id)).filter(p => p.hit || salePct(p)).map(p => p.id), t.dealsTitle); return showList(chat, u); }
  if (btnOf === 'cart') return showCart(chat, u);
  if (btnOf === 'fav') { setList(chat, u.fav.filter(prod), t.favTitle.replace(/<\/?b>/g, '')); return u.fav.length ? showList(chat, u) : send(chat, t.empty); }
  if (btnOf === 'orders') { const v = ordersView(u, chat); return send(chat, v.text, v.kb); }
  if (btnOf === 'contacts') { await sendLogo(chat, contacts(u), ik([[{ text: t.showMap, callback_data: 'map' }, ...(STORE.phone ? [{ text: t.shopContact, callback_data: 'cont' }] : [])]])); return; }
  if (btnOf === 'info') { const v = infoMenu(u); return send(chat, v.text, v.kb); }
  if (btnOf === 'settings') { const v = settingsView(u); return send(chat, v.text, v.kb); }
  if (btnOf === 'manager') { rt.step = 'support'; return send(chat, t.managerOn, { reply_markup: { keyboard: [[{ text: t.exit }]], resize_keyboard: true } }); }
  if (text) return doSearch(chat, u, text);
}
function doSearch(chat, u, q) {
  const t = lg(u), n = norm(q), m = n.match(/(\d{3})\D+(\d{2})\D+r?(\d{2}(?:\.\d)?)/), words = n.split(' ').filter(Boolean);
  const res = CAT.products.filter(p => m ? (p.w === m[1] && p.h === m[2] && p.d === m[3]) : words.every(w => norm(Object.values(p.name).join(' ') + ' ' + p.car.ru + ' ' + (p.sku || '')).includes(w))).map(p => p.id);
  setList(chat, res, '«' + q.slice(0, 30) + '»'); return showList(chat, u).then(() => res.length ? null : send(chat, t.sizeHint));
}

const SLOT = { asap: 'slotAsap', today: 'slotToday', tomorrow: 'slotTomorrow' };
const ed = (chat, msg, text, kb) => (msg.photo || msg.document || msg.caption) ? send(chat, text, kb) : edit(chat, msg.message_id, text, kb);
const touch = u => { u.cartTs = Date.now(); u.remindSent = false; };

async function onCallback(q) {
  const chat = q.message.chat.id, msg = q.message, mid = msg.message_id, [k, ...a] = q.data.split(':'), v = a[0], u = U(chat, q.from), rt = R(chat); u.id = chat;
  const ack = text => call('answerCallbackQuery', { callback_query_id: q.id, ...(text ? { text } : {}) });
  if (k === 'lang') { u.lang = v; save(); await ack(L[v].langSet); await welcome(chat, u, q.from); if (u.welcome) { u.welcome = false; await send(chat, L[v].welcomeBonus); } return; }
  if (!u.lang && isAdmin(chat) && ['ad', 'ao', 'as', 'ar', 'ab', 'ast', 'at', 'stat', 'ex', 'pr'].includes(k)) u.lang = 'ru';
  if (!u.lang) { await ack(); return send(chat, L.ru.chooseLang, langKb()); }
  const t = lg(u); await ack(k === 'a' || k === 'a4' ? t.added : undefined);
  switch (k) {
    case 'n': return;
    case 'cats': return ed(chat, msg, t.cats, catsKb(u));
    case 'c': { const c = CAT.categories.find(x => x.id === v); setList(chat, CAT.products.filter(p => p.cat === v).map(p => p.id), c ? cname(c, u.lang) : ''); return showList(chat, u, msg.photo ? null : mid); }
    case 'pg': rt.page = +v; return showList(chat, u, mid);
    case 'sort': rt.sort = rt.sort === v ? '' : v; rt.page = 1; return showList(chat, u, mid);
    case 'rg': rt.range = rt.range === v ? '' : v; rt.page = 1; return showList(chat, u, mid);
    case 'sn': rt.season = rt.season === v ? '' : v; rt.page = 1; return showList(chat, u, mid);
    case 'i': { const p = prod(v); return p ? sendCard(chat, u, p) : null; }
    case 'a': case 'a4': { const p = prod(v); if (!p || !avail(p)) return; u.cart[p.id] = Math.min((u.cart[p.id] || 0) + (k === 'a4' ? 4 : 1), 99); touch(u); save(); return editCard(chat, msg, u, p); }
    case 'f': { const id = +v; u.fav = u.fav.includes(id) ? u.fav.filter(x => x !== id) : [...u.fav, id]; save(); return editCard(chat, msg, u, prod(id)); }
    case 'nf': { const id = +v; u.alerts = u.alerts || []; if (!u.alerts.includes(id)) u.alerts.push(id); save(); return send(chat, t.notified); }
    case 'cmp': { rt.cmp = [...new Set([...(rt.cmp || []), +v])].slice(-3); return rt.cmp.length < 2 ? send(chat, t.cmpNeed) : send(chat, compareView(u, rt.cmp), ik([[{ text: t.cmpClear, callback_data: 'cmpx' }]])); }
    case 'cmpx': rt.cmp = []; return ed(chat, msg, '✅', ik([]));
    case 'cart': return showCart(chat, u);
    case 'cp': case 'cm': { const id = +v; u.cart[id] = (u.cart[id] || 0) + (k === 'cp' ? 1 : -1); if (u.cart[id] <= 0) delete u.cart[id]; if (u.cart[id] > 99) u.cart[id] = 99; touch(u); save(); return showCart(chat, u, mid); }
    case 'cx': u.cart = {}; u.promo = ''; save(); return showCart(chat, u, mid);
    case 'promo': rt.step = 'promo'; return send(chat, t.promoAsk);
    case 'co': if (!cartIds(u).length) return; rt.draft = {}; return advance(chat, u);
    case 'up': if (!rt.draft) return; rt.draft.phone = u.phone; return advance(chat, u);
    case 'ua': if (!rt.draft) return; rt.draft.address = u.address; return advance(chat, u);
    case 'dl': if (!rt.draft) return; rt.draft.delivery = v; return advance(chat, u);
    case 'sl': if (!rt.draft) return; rt.draft.slot = v; rt.draft.slotL = L.ru[SLOT[v]]; return advance(chat, u);
    case 'py': if (!rt.draft) return; rt.draft.pay = v; return advance(chat, u);
    case 'skip': if (!rt.draft) return; rt.draft.note = ''; return advance(chat, u);
    case 'pts': if (!rt.draft) return; rt.draft.usePoints = !rt.draft.usePoints; return edit(chat, mid, summary(u, rt.draft), sumKb(u, rt.draft));
    case 'ok': if (!rt.draft || !cartIds(u).length) return send(chat, t.cartEmpty, mainKb(u)); return placeOrder(chat, u, q.from);
    case 'no': rt.step = null; rt.draft = null; return send(chat, t.cancelled, mainKb(u));
    case 'rp': { const o = state.orders.find(x => x.id === +v && x.uid === chat); if (o) o.items.forEach(i => { if (prod(i.id) && avail(prod(i.id))) u.cart[i.id] = (u.cart[i.id] || 0) + i.qty; }); touch(u); save(); await send(chat, t.repeatDone); return showCart(chat, u); }
    case 'oc': { const o = state.orders.find(x => x.id === +v && x.uid === chat); if (!o) return; if (o.status !== 'new') return send(chat, t.cantCancel); await setStatus(o.id, 'cancelled'); await notifyAdmins(`❌ Клиент отменил заказ №${o.id}`); const ov = ordersView(u, chat); return edit(chat, mid, ov.text, ov.kb); }
    case 'rt': { const o = state.orders.find(x => x.id === +v && x.uid === chat), n = +a[1]; if (!o || !(n >= 1 && n <= 5)) return; o.rating = n; save(); if (n <= 3) await notifyAdmins(`⚠️ Низкая оценка ${'⭐'.repeat(n)} по заказу №${o.id} (${esc(o.user)}, ${esc(o.phone)})`); return ed(chat, msg, t.rateThanks, ik([])); }
    case 'fm': { const f = finderMenu(u); return ed(chat, msg, f.text, f.kb); }
    case 'pick': rt.pick = {}; { const s = pickStep(u, rt); return ed(chat, msg, s.text, s.kb); }
    case 'pw': case 'ph': { rt.pick = { ...(rt.pick || {}), [k[1]]: v }; const s = pickStep(u, rt); return edit(chat, mid, s.text, s.kb); }
    case 'pd': { const f = { ...rt.pick, d: v }; setList(chat, CAT.products.filter(p => p.w === f.w && p.h === f.h && p.d === f.d).map(p => p.id), t.pickRes(`${f.w}/${f.h} R${f.d}`)); return showList(chat, u, mid); }
    case 'fc': return edit(chat, mid, t.pickCar, ik([...chunk(CARS.map(c => ({ text: c, callback_data: 'fcar:' + c })), 3), [{ text: t.otherCar, callback_data: 'fcar:?' }]]));
    case 'fcar': {
      if (v === '?') { rt.step = 'support'; return send(chat, t.notFoundCar + '\n\n' + t.managerOn, { reply_markup: { keyboard: [[{ text: t.exit }]], resize_keyboard: true } }); }
      const ids = carIds(v);
      if (ids.length > 12) { const cs = CAT.categories.map(c => [c, ids.filter(id => prod(id).cat === c.id).length]).filter(x => x[1]); return ed(chat, msg, `🚗 <b>${esc(v)}</b>\n${t.pickCat}`, ik([...cs.map(([c, n]) => [{ text: `${cname(c, u.lang)} (${n})`, callback_data: `fcc:${v}:${c.id}` }]), [{ text: t.allParts, callback_data: `fcc:${v}:*` }]])); }
      setList(chat, ids, '🚗 ' + v); await showList(chat, u); return (u.cars || []).includes(v) ? null : send(chat, '👆', ik([[{ text: t.saveCar, callback_data: 'sv:' + v }]])); }
    case 'fcc': { const cat = a[1], ids = carIds(v).filter(id => cat === '*' || prod(id).cat === cat), c = CAT.categories.find(x => x.id === cat);
      setList(chat, ids, '🚗 ' + v + (c ? ' · ' + cname(c, u.lang) : '')); await showList(chat, u); return (u.cars || []).includes(v) ? null : send(chat, '👆', ik([[{ text: t.saveCar, callback_data: 'sv:' + v }]])); }
    case 'sv': u.cars = [...new Set([...(u.cars || []), v])].slice(-4); save(); return ed(chat, msg, t.carSaved, ik([]));
    case 'fs': return edit(chat, mid, t.pickSeason, ik([[{ text: t.sSummer, callback_data: 'fse:summer' }, { text: t.sWinter, callback_data: 'fse:winter' }, { text: t.sAll, callback_data: 'fse:all' }]]));
    case 'fse': setList(chat, CAT.products.filter(p => p.season === v).map(p => p.id), t.season[v]); return showList(chat, u, mid);
    case 'plc': { for (const x of priceText(u, v)) await send(chat, x); return; }
    case 'plall': return sendDoc(chat, priceCsv(u), 'megabaza-prices.csv', t.priceNote);
    case 'inf': return send(chat, v === 'faq' ? t.faq : t[v]);
    case 'inv': return send(chat, t.inviteText(`https://t.me/${BOT_NAME}?start=ref_${chat}`));
    case 'nt': u.mute = !u.mute; save(); { const s = settingsView(u); return edit(chat, mid, s.text, s.kb); }
    case 'del': return send(chat, t.deleteAsk, ik([[{ text: t.yes, callback_data: 'delok' }, { text: t.no, callback_data: 'n' }]]));
    case 'delok': { delete state.users[String(chat)]; RT.delete(chat); save(); return send(chat, t.deleted, { reply_markup: { remove_keyboard: true } }); }
    case 'map': return env('STORE_LAT') ? call('sendLocation', { chat_id: chat, latitude: +env('STORE_LAT'), longitude: +env('STORE_LON') }) : send(chat, '📍 ' + esc(STORE.address));
    case 'cont': return call('sendContact', { chat_id: chat, phone_number: STORE.phone.replace(/[^\d+]/g, ''), first_name: 'MEGABAZA' });
  }
  if (!isAdmin(chat)) return;
  switch (k) {
    case 'ad': return adminPanel(chat, mid);
    case 'ao': return adminOrders(chat, v);
    case 'as': await setStatus(v, a[1]); return send(chat, `№${v} → ${ST[a[1]]}`);
    case 'ar': rt.step = 'reply:' + v; return send(chat, '✍ Напишите ответ клиенту (можно фото/голос/файл):');
    case 'ab': rt.step = 'broadcast'; return send(chat, '📣 Напишите текст рассылки:');
    case 'ast': return adminStock(chat, mid, +v);
    case 'at': { const p = prod(v), was = avail(p); if (was) setOver(p.id, { in_stock: false }); else setOver(p.id, { in_stock: true, ...(p.stock === 0 ? { stock: 10 } : {}) }); if (!was) await restock(p.id); return adminStock(chat, mid, +a[1]); }
    case 'stat': return send(chat, statsText());
    case 'ex': return adminCmd(chat, '/export');
    case 'pr': return send(chat, '🎟 <b>Промокоды</b>\n' + (Object.entries(promos()).map(([c, p]) => `<code>${c}</code> — ${p}%`).join('\n') || '—') + '\n\n/promo КОД % · /delpromo КОД');
  }
}

async function onInline(q) {
  const u = U(q.from.id), l = u.lang || (['uz', 'en'].includes(q.from.language_code) ? q.from.language_code : 'ru'), qq = norm(q.query || ''), words = qq.split(' ').filter(Boolean);
  const res = CAT.products.map(p => prod(p.id)).filter(p => !words.length || words.every(w => norm(Object.values(p.name).join(' ') + ' ' + p.car.ru).includes(w))).slice(0, 12);
  return call('answerInlineQuery', { inline_query_id: q.id, cache_time: 30, is_personal: true, results: res.map(p => ({ type: 'article', id: String(p.id), title: nm(p, l), description: `${Number(p.price).toLocaleString('ru-RU')} ${L[l].cur} · ${avail(p) ? L[l].inStock : L[l].out}`, input_message_content: { message_text: `<b>${esc(nm(p, l))}</b>\n${money(p.price, l)}\n${esc(p.car[l] || p.car.ru)}`, parse_mode: 'HTML' }, reply_markup: BOT_NAME ? { inline_keyboard: [[{ text: '🛒 ' + L[l].btn.catalog, url: `https://t.me/${BOT_NAME}` }]] } : undefined })) });
}

/* ---------- фоновые задачи ---------- */
async function background() {
  const now = Date.now();
  for (const [k, u] of Object.entries(state.users)) if (!u.blocked && !u.mute && !u.remindSent && u.cartTs && now - u.cartTs > 864e5 && cartIds(u).length) { u.remindSent = true; await send(Number(k), L[u.lang || 'ru'].cartRemind, ik([[{ text: L[u.lang || 'ru'].toCart(Object.values(u.cart).reduce((x, y) => x + y, 0)), callback_data: 'cart' }]])); }
  const tz = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()), g = x => tz.find(p => p.type === x).value;
  const day = `${g('year')}-${g('month')}-${g('day')}`;
  if (+g('hour') === 20 && state.lastReport !== day && ADMINS.length) { state.lastReport = day; await notifyAdmins('🌙 Итоги дня\n' + statsText()); }
  save();
}

async function main() {
  if (!TOKEN) { console.error('Нужен BOT_TOKEN (получите у @BotFather)'); process.exit(1); }
  const me = await call('getMe', {}); if (!me) console.error('Telegram не отвечает или токен неверный'); else { BOT_NAME = me.username; console.log('Бот: @' + me.username); }
  if (!ADMINS.length) console.log('Внимание: ADMIN_IDS не задан — админ-функции и уведомления о заказах отключены.');
  await call('setMyCommands', { commands: [{ command: 'start', description: 'Start / Начать / Boshlash' }, { command: 'catalog', description: 'Catalog / Каталог / Katalog' }, { command: 'price', description: 'Price list / Прайс / Narxlar' }, { command: 'cart', description: 'Cart / Корзина / Savat' }, { command: 'lang', description: 'Settings / Настройки / Sozlamalar' }] });
  for (const [lc, d, s] of [['ru', 'Автозапчасти, шины и аксессуары. Подбор по автомобилю, заказ прямо в Telegram.', 'MEGABAZA — центр автозапчастей'], ['uz', "Avtoehtiyot qismlar, shinalar va aksessuarlar. Avtomobil bo'yicha tanlash, buyurtma Telegramda.", 'MEGABAZA — avtoehtiyot qismlar markazi'], ['en', 'Auto parts, tires and accessories. Find by car, order right in Telegram.', 'MEGABAZA — auto parts center']])
    { await call('setMyDescription', { description: d, language_code: lc }); await call('setMyShortDescription', { short_description: s, language_code: lc }); }
  setInterval(() => background().catch(console.error), Number(env('BG_INTERVAL_MS')) || 300000);
  let offset = 0; console.log('MEGABAZA bot запущен');
  for (;;) {
    try {
      const ups = await call('getUpdates', { offset, timeout: 30 }) || [];
      for (const up of ups) { offset = up.update_id + 1; try { if (up.message) await onMessage(up.message); else if (up.callback_query) await onCallback(up.callback_query); else if (up.inline_query) await onInline(up.inline_query); } catch (e) { console.error(e); } }
    } catch (e) { console.error(e.message); await new Promise(r => setTimeout(r, 3000)); }
  }
}
if (require.main === module) main(); else module.exports = { onMessage, onCallback };
