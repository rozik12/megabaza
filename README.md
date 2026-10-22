# MEGABAZA — демо магазина

- `site/index.html` — сайт (каталог, поиск, корзина → оформление в Telegram-боте). Цвета из логотипа: фон #232237, красный #FE2127.
- `site/products.json` — каталог (сейчас примеры; заменить реальными товарами и ценами).
- `bot/bot.js` — Telegram-бот без зависимостей (Node 18+): каталог, корзина, приём корзины с сайта, заказ → в чат админа.

Запуск:
    python3 -m http.server 8000        # сайт: http://localhost:8000/site/
    BOT_TOKEN=... ADMIN_CHAT_ID=... node bot/bot.js

Токен — у @BotFather; ADMIN_CHAT_ID — id чата, куда слать заказы. После создания бота впишите его username в `BOT` в `site/index.html`.

## Запуск (Supabase + Vercel)

1. Создайте проект на supabase.com → SQL Editor → выполните по очереди `supabase/schema.sql`, затем `supabase/schema2.sql`.
2. Впишите `url` и `anonKey` (Project Settings → API) в `site/config.js`. Домен — в `siteUrl`, `robots.txt`, `sitemap.xml`.
3. Зарегистрируйтесь на сайте и сделайте себя админом (SQL Editor):
   `update public.profiles set role='admin' where id = (select id from auth.users where email='ваша@почта');`
4. `/admin.html`: дашборд, чат, заказы, товары (фото, импорт из Excel), клиенты, промокоды, баннеры, настройки, рассылка, Telegram-уведомления, журнал.
5. Vercel: папка `site/` (Root Directory = `site`), сборка не нужна.
6. Бот: `BOT_TOKEN=... SUPABASE_URL=... SUPABASE_ANON_KEY=... node bot/bot.js` — заказы бота попадают в админку.
