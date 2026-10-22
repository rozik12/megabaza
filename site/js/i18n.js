// Русский / o'zbekcha. Статичные подписи — через data-i / data-ip, динамические — через t().
const DICT = {
 ru: {
  search:'Поиск: название, артикул, марка авто…', login:'Войти', profile:'Профиль', cart:'Корзина', admin:'Админ', all:'Все',
  hero1:'Автозапчасти', hero2:'в Ташкенте', hero3:'с доставкой', heroP:'Выберите товар, оформите заказ и задайте вопрос в чате — отвечаем быстро.',
  mycar:'Моя машина', anycar:'Любая машина', sort:'Сортировка', s_new:'Новинки', s_asc:'Сначала дешёвые', s_desc:'Сначала дорогие', s_name:'По названию',
  brand:'Бренд', allbrands:'Все бренды', instock:'Только в наличии', from:'Цена от', to:'до', reset:'Сбросить', found:'Найдено:',
  recent:'Вы смотрели', add:'В корзину', out:'Нет в наличии', left:'Осталось', pcs:'шт.', notify:'Сообщить о поступлении', notified:'Сообщим в чате, когда появится',
  wholesale:'Оптовая цена', details:'Подробнее', compare:'Сравнить', share:'Поделиться', copied:'Ссылка скопирована', ask:'Спросить в чате',
  analogs:'Похожие товары', reviews:'Отзывы', noreviews:'Отзывов пока нет', writerev:'Оставить отзыв', send:'Отправить', thanks:'Спасибо за отзыв!',
  sku:'Артикул', car:'Автомобиль', cmp_title:'Сравнение товаров', price:'Цена', stock:'Наличие', yes:'Есть', no:'Нет',
  cartTitle:'Корзина', empty:'Корзина пуста', total:'Итого', sub:'Товары', discount:'Скидка', deliveryFee:'Доставка', free:'бесплатно',
  delivery:'Доставка', pickup:'Самовывоз', pay:'Оплата', cash:'Наличными при получении', card:'Картой при получении', name:'Имя', phone:'Телефон, +998…',
  addr:'Адрес доставки', note:'Комментарий (необязательно)', promo:'Промокод', apply:'Применить', promoOk:'Скидка', promoBad:'Промокод не подошёл',
  order:'Оформить заказ', ordLogin:'Оформить как гость', orderErr:'Не удалось оформить заказ. Проверьте данные и наличие товаров.', needFields:'Заполните имя, телефон и адрес',
  orderOk:'Заказ принят! Мы скоро свяжемся.', added:'Добавлено в корзину',
  tabLogin:'Вход', tabReg:'Регистрация', email:'Почта', pass:'Пароль', regName:'Имя', cancel:'Отмена', create:'Создать аккаунт', magic:'Войти по ссылке на почту', magicSent:'Ссылка для входа отправлена на почту',
  forgot:'Забыли пароль?', resetSent:'Письмо для сброса пароля отправлено', newPass:'Введите новый пароль (не менее 6 символов)', passOk:'Пароль изменён',
  p_orders:'Заказы', p_favs:'Избранное', p_garage:'Гараж', p_prof:'Профиль', logout:'Выйти', save:'Сохранить', saved:'Сохранено', noOrders:'Заказов пока нет', noFavs:'Избранного нет', noCars:'Машин пока нет',
  repeat:'Повторить', order_n:'Заказ №', st_new:'Новый', st_processing:'В работе', st_done:'Выполнен', st_cancelled:'Отменён',
  make:'Марка', model:'Модель', year:'Год', vin:'VIN (необязательно)', addCar:'Добавить машину', pick:'Подобрать', del:'Удалить',
  chatTitle:'Чат с MEGABAZA', msg:'Сообщение…', attach:'Прикрепить фото', offHours:'Сейчас нерабочее время. Мы ответим утром — оставьте сообщение.', typing:'печатает…', chatLogin:'Войдите, чтобы написать нам',
  secDelivery:'Доставка и оплата', delivery1:'Доставка по Ташкенту', delivery1t:'Привезём в день заказа. Стоимость и порог бесплатной доставки показаны в корзине.', delivery2:'Самовывоз', delivery2t:'Заберите заказ в нашем магазине бесплатно.', delivery3:'Оплата', delivery3t:'Наличными или картой при получении.',
  secWhy:'Почему выбирают нас', why1:'Оригинал и проверенные аналоги', why2:'Подбор по вашему автомобилю', why3:'Гарантия на запчасти', why4:'Быстрые ответы в чате',
  secFaq:'Вопросы и ответы', q1:'Как подобрать деталь?', a1:'Добавьте машину в «Мой гараж» или напишите нам в чат — подскажем.', q2:'Есть ли гарантия?', a2:'Да, на запчасти действует гарантия. Условия — у менеджера и в договоре.', q3:'Можно вернуть товар?', a3:'Да, если деталь не подошла и не была в использовании. Подробности уточняйте в чате.', q4:'Как быстро доставите?', a4:'По Ташкенту — обычно в день заказа.',
  secContacts:'Контакты', hours:'Часы работы', call:'Позвонить', offline:'Нет интернета — показан сохранённый каталог', offer:'Оферта', privacy:'Политика конфиденциальности', rights:'Все права защищены', demo:'Демо-режим: база данных не подключена — вход, заказы и чат отключены.',
  deals:'Хиты и акции', s_summer:'☀️ Лето', s_winter:'❄️ Зима', s_all:'🌤 Всесезон', finder:'Подбор шин по размеру', f_w:'Ширина', f_h:'Профиль', f_d:'Диаметр', kit:'Комплект 4 шт. — скидка 5%', priceCsv:'Скачать прайс', openNow:'Открыто сейчас', closedNow:'Сейчас закрыто', slotAsap:'Как можно скорее', slotToday:'Сегодня', slotTomorrow:'Завтра',
  terms:'Я согласен(на) с', shipMore:'До бесплатной доставки осталось', shipFree:'Доставка бесплатная', startShopping:'Перейти в каталог', confirmMail:'Аккаунт создан. Мы отправили письмо — подтвердите почту и войдите.', welcomeUser:'Добро пожаловать! Аккаунт создан.', doneTitle:'Заказ принят!', doneN:'Номер заказа', doneUser:'Статус заказа смотрите в профиле → «Заказы». Менеджер скоро свяжется с вами.', doneGuest:'Менеджер скоро свяжется с вами. Создайте аккаунт, чтобы видеть историю заказов и копить удобство.', badEmail:'Проверьте адрес почты', badPass:'Пароль: не менее 8 символов', needTerms:'Нужно согласие с офертой', badName:'Введите имя (от 2 символов)', badPhone2:'Телефон: +998 XX XXX XX XX', pwWeak:'слабый', pwOk:'нормальный', pwStrong:'надёжный', btnProfile:'Мои заказы', maxStock:'Больше нет в наличии', removed:'Товар удалён', saveAddr:'Адрес сохранён в профиле',
  track:'Отследить заказ', trackBtn:'Проверить', orderNo:'Номер заказа', trackNone:'Заказ не найден. Проверьте номер и телефон.', trackDate:'Оформлен',
  promoBar:'🚚 Доставка по Ташкенту · Комплект из 4 шин — скидка 5% · Оплата при получении', catalogBtn:'Каталог', hitsTitle:'🔥 Хиты и акции', allGoods:'Все товары', footAbout:'Центр автозапчастей: шины, диски, аксессуары и шиномонтаж.', footHelp:'Помощь', footLegal:'Документы', mHome:'Главная', sl1t:'Шины с доставкой по Ташкенту', sl1d:'Выберите размер, оформите заказ за минуту, оплата при получении.', sl2t:'Комплект из 4 шин — скидка 5%', sl2d:'Скидка применяется автоматически в корзине.', sl3t:'Закажите в Telegram', sl3d:'Наш бот: каталог, прайс и заказ в пару нажатий.', slBtn:'Смотреть',
  kitS:'Комплект ×4 — скидка 5%', nothing:'Ничего не найдено', fav:'Избранное', err:'Ошибка, попробуйте ещё раз', needLogin:'Войдите в аккаунт'
 },
 uz: {
  search:"Qidiruv: nomi, artikul, avtomobil markasi…", login:'Kirish', profile:'Profil', cart:'Savat', admin:'Admin', all:'Hammasi',
  hero1:'Avtoehtiyot qismlar', hero2:'Toshkentda', hero3:'yetkazib berish bilan', heroP:"Tovarni tanlang, buyurtma bering va chatda savol bering — tez javob beramiz.",
  mycar:'Mening mashinam', anycar:'Istalgan mashina', sort:'Saralash', s_new:'Yangilar', s_asc:'Avval arzonlari', s_desc:'Avval qimmatlari', s_name:'Nomi bo‘yicha',
  brand:'Brend', allbrands:'Barcha brendlar', instock:'Faqat mavjudlari', from:'Narx dan', to:'gacha', reset:'Tozalash', found:'Topildi:',
  recent:'Ko‘rib chiqqanlaringiz', add:'Savatga', out:'Mavjud emas', left:'Qoldi', pcs:'dona', notify:'Kelganda xabar bering', notified:'Paydo bo‘lganda chatda xabar beramiz',
  wholesale:'Ulgurji narx', details:'Batafsil', compare:'Taqqoslash', share:'Ulashish', copied:'Havola nusxalandi', ask:'Chatda so‘rash',
  analogs:'O‘xshash tovarlar', reviews:'Sharhlar', noreviews:'Hozircha sharhlar yo‘q', writerev:'Sharh qoldirish', send:'Yuborish', thanks:'Sharhingiz uchun rahmat!',
  sku:'Artikul', car:'Avtomobil', cmp_title:'Tovarlarni taqqoslash', price:'Narx', stock:'Mavjudligi', yes:'Bor', no:'Yo‘q',
  cartTitle:'Savat', empty:'Savat bo‘sh', total:'Jami', sub:'Tovarlar', discount:'Chegirma', deliveryFee:'Yetkazib berish', free:'bepul',
  delivery:'Yetkazib berish', pickup:'O‘zi olib ketish', pay:'To‘lov', cash:'Olishda naqd', card:'Olishda karta bilan', name:'Ism', phone:'Telefon, +998…',
  addr:'Yetkazib berish manzili', note:'Izoh (ixtiyoriy)', promo:'Promokod', apply:'Qo‘llash', promoOk:'Chegirma', promoBad:'Promokod mos kelmadi',
  order:'Buyurtma berish', ordLogin:'Mehmon sifatida buyurtma', orderErr:'Buyurtma berilmadi. Ma’lumotlar va tovar mavjudligini tekshiring.', needFields:'Ism, telefon va manzilni to‘ldiring',
  orderOk:'Buyurtma qabul qilindi! Tez orada bog‘lanamiz.', added:'Savatga qo‘shildi',
  tabLogin:'Kirish', tabReg:'Ro‘yxatdan o‘tish', email:'Pochta', pass:'Parol', regName:'Ism', cancel:'Bekor qilish', create:'Akkaunt yaratish', magic:'Pochtadagi havola orqali kirish', magicSent:'Kirish havolasi pochtaga yuborildi',
  forgot:'Parolni unutdingizmi?', resetSent:'Parolni tiklash xati yuborildi', newPass:'Yangi parolni kiriting (kamida 6 belgi)', passOk:'Parol o‘zgartirildi',
  p_orders:'Buyurtmalar', p_favs:'Sevimlilar', p_garage:'Garaj', p_prof:'Profil', logout:'Chiqish', save:'Saqlash', saved:'Saqlandi', noOrders:'Buyurtmalar hali yo‘q', noFavs:'Sevimlilar yo‘q', noCars:'Mashinalar hali yo‘q',
  repeat:'Takrorlash', order_n:'Buyurtma №', st_new:'Yangi', st_processing:'Jarayonda', st_done:'Bajarildi', st_cancelled:'Bekor qilindi',
  make:'Marka', model:'Model', year:'Yil', vin:'VIN (ixtiyoriy)', addCar:'Mashina qo‘shish', pick:'Tanlash', del:'O‘chirish',
  chatTitle:'MEGABAZA bilan chat', msg:'Xabar…', attach:'Rasm biriktirish', offHours:'Hozir ish vaqti emas. Ertalab javob beramiz — xabar qoldiring.', typing:'yozmoqda…', chatLogin:'Yozish uchun akkauntga kiring',
  secDelivery:'Yetkazib berish va to‘lov', delivery1:'Toshkent bo‘ylab yetkazib berish', delivery1t:'Buyurtma kuni olib boramiz. Narxi va bepul yetkazish chegarasi savatda ko‘rsatilgan.', delivery2:'O‘zi olib ketish', delivery2t:'Buyurtmani do‘konimizdan bepul olib keting.', delivery3:'To‘lov', delivery3t:'Olishda naqd yoki karta bilan.',
  secWhy:'Nega bizni tanlashadi', why1:'Original va tekshirilgan analoglar', why2:'Avtomobilingizga mos tanlov', why3:'Ehtiyot qismlarga kafolat', why4:'Chatda tez javob',
  secFaq:'Savol-javoblar', q1:'Detalni qanday tanlayman?', a1:'«Mening garajim»ga mashinangizni qo‘shing yoki chatga yozing — maslahat beramiz.', q2:'Kafolat bormi?', a2:'Ha, ehtiyot qismlarga kafolat beriladi. Shartlar menejerda va shartnomada.', q3:'Tovarni qaytarish mumkinmi?', a3:'Ha, detal mos kelmasa va ishlatilmagan bo‘lsa. Tafsilotlar chatda.', q4:'Qanchada yetkazasiz?', a4:'Toshkent bo‘ylab odatda buyurtma kuni.',
  secContacts:'Aloqa', hours:'Ish vaqti', call:'Qo‘ng‘iroq', offline:'Internet yo‘q — saqlangan katalog ko‘rsatilmoqda', offer:'Oferta', privacy:'Maxfiylik siyosati', rights:'Barcha huquqlar himoyalangan', demo:'Demo rejim: baza ulanmagan — kirish, buyurtma va chat o‘chirilgan.',
  deals:'Xitlar va aksiyalar', s_summer:'☀️ Yoz', s_winter:'❄️ Qish', s_all:'🌤 Barcha fasl', finder:'O‘lcham bo‘yicha shina tanlash', f_w:'Kenglik', f_h:'Profil', f_d:'Diametr', kit:'4 dona komplekt — 5% chegirma', priceCsv:'Narxnomani yuklash', openNow:'Hozir ochiq', closedNow:'Hozir yopiq', slotAsap:'Imkon qadar tezroq', slotToday:'Bugun', slotTomorrow:'Ertaga',
  terms:'Men rozi bo‘laman:', shipMore:'Bepul yetkazishgacha qoldi', shipFree:'Yetkazib berish bepul', startShopping:'Katalogga o‘tish', confirmMail:'Akkaunt yaratildi. Pochtaga xat yubordik — pochtani tasdiqlang va kiring.', welcomeUser:'Xush kelibsiz! Akkaunt yaratildi.', doneTitle:'Buyurtma qabul qilindi!', doneN:'Buyurtma raqami', doneUser:'Buyurtma holatini profil → «Buyurtmalar»da ko‘rasiz. Menejer tez orada bog‘lanadi.', doneGuest:'Menejer tez orada bog‘lanadi. Buyurtmalar tarixini ko‘rish uchun akkaunt yarating.', badEmail:'Pochta manzilini tekshiring', badPass:'Parol: kamida 8 belgi', needTerms:'Oferta bilan rozilik kerak', badName:'Ismni kiriting (kamida 2 belgi)', badPhone2:'Telefon: +998 XX XXX XX XX', pwWeak:'kuchsiz', pwOk:'o‘rtacha', pwStrong:'ishonchli', btnProfile:'Buyurtmalarim', maxStock:'Omborda boshqa yo‘q', removed:'Tovar o‘chirildi', saveAddr:'Manzil profilda saqlandi',
  track:'Buyurtmani kuzatish', trackBtn:'Tekshirish', orderNo:'Buyurtma raqami', trackNone:'Buyurtma topilmadi. Raqam va telefonni tekshiring.', trackDate:'Rasmiylashtirilgan',
  promoBar:'🚚 Toshkent bo‘ylab yetkazib berish · 4 ta shina komplektiga 5% chegirma · Olishda to‘lov', catalogBtn:'Katalog', hitsTitle:'🔥 Xitlar va aksiyalar', allGoods:'Barcha tovarlar', footAbout:'Avtoehtiyot qismlar markazi: shinalar, disklar, aksessuarlar va shina o‘rnatish.', footHelp:'Yordam', footLegal:'Hujjatlar', mHome:'Bosh sahifa', sl1t:'Toshkent bo‘ylab shinalar yetkazib berish', sl1d:'O‘lchamni tanlang, bir daqiqada buyurtma bering, olishda to‘lov.', sl2t:'4 ta shina komplekti — 5% chegirma', sl2d:'Chegirma savatda avtomatik qo‘llanadi.', sl3t:'Telegramda buyurtma bering', sl3d:'Botimiz: katalog, narxlar va buyurtma bir necha bosishda.', slBtn:'Ko‘rish',
  kitS:'4 ta komplekt — 5% chegirma', nothing:'Hech narsa topilmadi', fav:'Sevimlilar', err:'Xatolik, qayta urinib ko‘ring', needLogin:'Akkauntga kiring'
 }
};
let LANG = (() => { try { return localStorage.getItem('lang'); } catch { return null; } })() || ((navigator.language || '').startsWith('uz') ? 'uz' : 'ru');
const t = k => (DICT[LANG] && DICT[LANG][k]) || DICT.ru[k] || k;
function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll('[data-i]').forEach(e => e.textContent = t(e.dataset.i));
  root.querySelectorAll('[data-ip]').forEach(e => e.placeholder = t(e.dataset.ip));
}
function setLang(l) { LANG = l; try { localStorage.setItem('lang', l); } catch {} applyI18n(); }
