# Импорт прайс-листа автозапчастей (pricelist.xlsx) -> bot/catalog.json, site/products.json, products-import.xlsx
# Запуск из корня репозитория: python3 tools/import_pricelist.py [путь_к_xlsx]
import sys, json, collections, openpyxl
src = sys.argv[1] if len(sys.argv) > 1 else 'pricelist.xlsx'
ws = openpyxl.load_workbook(src)['Прайс']
CATS = {  # ru -> (id, uz, en)
 'Двигатель': ('engine', 'Dvigatel', 'Engine'), 'Подвеска': ('suspension', 'Osma (podveska)', 'Suspension'),
 'Тормозная система': ('brakes', 'Tormoz tizimi', 'Brakes'), 'Электрика': ('electrics', 'Elektr jihozlari', 'Electrical'),
 'Кузов и оптика': ('body', 'Kuzov va optika', 'Body & lights'), 'Рулевое управление': ('steering', 'Rul boshqaruvi', 'Steering'),
 'Фильтры': ('filters', 'Filtrlar', 'Filters'), 'Зажигание': ('ignition', "O‘t oldirish", 'Ignition'),
 'Охлаждение': ('cooling', 'Sovutish', 'Cooling'), 'Трансмиссия': ('transmission', 'Transmissiya', 'Transmission'),
 'Масла и жидкости': ('fluids', 'Moylar va suyuqliklar', 'Oils & fluids')}
TR = {  # ru -> (uz, en)
 'Комплект ГРМ (ремень + ролики)': ('GRM komplekti (kamar + roliklar)', 'Timing kit (belt + rollers)'), 'Подушка двигателя': ("Dvigatel yostig‘i", 'Engine mount'),
 'Помпа водяная': ('Suv nasosi (pompa)', 'Water pump'), 'Прокладка ГБЦ': ('GBS prokladkasi', 'Cylinder head gasket'),
 'Прокладка клапанной крышки': ("Klapan qopqog‘i prokladkasi", 'Valve cover gasket'), 'Ремень ГРМ': ('GRM kamari', 'Timing belt'),
 'Ремень генератора': ('Generator kamari', 'Alternator belt'), 'Ролик натяжителя ГРМ': ('GRM taranglovchi roligi', 'Timing belt tensioner'),
 'Сальник коленвала передний': ('Tirsakli val oldingi salnigi', 'Crankshaft front seal'), 'Термостат': ('Termostat', 'Thermostat'),
 'Катушка зажигания': ("O‘t oldirish g‘altagi", 'Ignition coil'), 'Провода высоковольтные (комплект)': ('Yuqori kuchlanishli simlar (komplekt)', 'High-voltage ignition wires (set)'),
 'Свечи зажигания (комплект 4 шт)': ('Svechalar (4 dona komplekt)', 'Spark plugs (set of 4)'), 'Зеркало боковое левое': ('Yon oyna (chap)', 'Side mirror, left'),
 'Фара передняя левая': ('Old fara (chap)', 'Headlight, front left'), 'Фонарь задний правый': ("Orqa chiroq (o‘ng)", 'Tail light, rear right'),
 'Щётки стеклоочистителя (пара)': ("Shisha tozalagich cho‘tkalari (juft)", 'Wiper blades (pair)'), 'Масло моторное 5W-30, 4 л': ('Dvigatel moyi 5W-30, 4 l', 'Engine oil 5W-30, 4 L'),
 'Масло трансмиссионное 75W-90, 1 л': ('Transmissiya moyi 75W-90, 1 l', 'Transmission oil 75W-90, 1 L'), 'Антифриз G12, 5 л': ('Antifriz G12, 5 l', 'Antifreeze G12, 5 L'),
 'Бачок расширительный': ('Kengaytirish bachogi', 'Coolant expansion tank'), 'Радиатор охлаждения': ('Sovutish radiatori', 'Radiator'),
 'Амортизатор задний': ('Orqa amortizator', 'Shock absorber, rear'), 'Амортизатор передний': ('Old amortizator', 'Shock absorber, front'),
 'Втулка стабилизатора': ('Stabilizator vtulkasi', 'Stabilizer bushing'), 'Опора амортизатора передняя': ('Old amortizator tayanchi', 'Front strut mount'),
 'Подшипник ступицы передний': ('Old stupitsa podshipnigi', 'Front wheel bearing (hub)'), 'Пружина передней подвески': ('Old osma prujinasi', 'Front coil spring'),
 'Пыльник амортизатора с отбойником': ('Amortizator changyutgichi (otboynik bilan)', 'Strut boot with bump stop'), 'Рычаг передний нижний': ('Old pastki richag', 'Front lower control arm'),
 'Сайлентблок рычага': ('Richag saylentbloki', 'Control arm bushing'), 'Стойка стабилизатора': ('Stabilizator tayanchi (stoyka)', 'Stabilizer link'),
 'Ступица задняя в сборе': ("Orqa stupitsa (yig‘ma)", 'Rear hub assembly'), 'Шаровая опора': ('Sharovoy tayanch', 'Ball joint'),
 'Наконечник рулевой тяги': ('Rul tortqisi uchligi', 'Tie rod end'), 'Насос гидроусилителя': ('Gidrokuchaytirgich nasosi', 'Power steering pump'),
 'Пыльник рулевой рейки': ('Rul reykasi changyutgichi', 'Steering rack boot'), 'Рулевая тяга': ('Rul tortqisi', 'Tie rod'),
 'Барабан тормозной задний': ('Orqa tormoz barabani', 'Rear brake drum'), 'Главный тормозной цилиндр': ('Bosh tormoz silindri', 'Brake master cylinder'),
 'Диск тормозной передний': ('Old tormoz diski', 'Front brake disc'), 'Колодки тормозные задние': ('Orqa tormoz kolodkalari', 'Rear brake pads'),
 'Колодки тормозные передние': ('Old tormoz kolodkalari', 'Front brake pads'), 'Тормозная жидкость DOT-4, 1 л': ('Tormoz suyuqligi DOT-4, 1 l', 'Brake fluid DOT-4, 1 L'),
 'Цилиндр тормозной задний': ('Orqa tormoz silindri', 'Rear brake wheel cylinder'), 'Шланг тормозной передний': ('Old tormoz shlangi', 'Front brake hose'),
 'Пыльник ШРУСа': ('SHRUS changyutgichi', 'CV joint boot'), 'Сцепление в сборе (корзина, диск, выжимной)': ('Ilashish komplekti (korzina, disk, siqish podshipnigi)', 'Clutch kit (cover, disc, release bearing)'),
 'ШРУС наружный': ('Tashqi SHRUS', 'Outer CV joint'), 'Фильтр воздушный': ('Havo filtri', 'Air filter'), 'Фильтр масляный': ('Moy filtri', 'Oil filter'),
 'Фильтр салона': ('Salon filtri', 'Cabin filter'), 'Фильтр топливный': ("Yoqilg‘i filtri", 'Fuel filter'), 'Аккумулятор 60 Ач': ('Akkumulyator 60 Ah', 'Battery 60 Ah'),
 'Генератор': ('Generator', 'Alternator'), 'Датчик кислорода (лямбда-зонд)': ('Kislorod datchigi (lambda-zond)', 'Oxygen sensor (lambda)'),
 'Датчик положения коленвала': ('Tirsakli val holati datchigi', 'Crankshaft position sensor'), 'Датчик температуры охлаждающей жидкости': ('Sovutish suyuqligi harorati datchigi', 'Coolant temperature sensor'),
 'Лампа фары H4': ('Fara lampasi H4', 'Headlight bulb H4'), 'Стартер': ('Starter', 'Starter')}
HITS = {'Фильтр масляный', 'Фильтр воздушный', 'Фильтр салона', 'Колодки тормозные передние', 'Масло моторное 5W-30, 4 л', 'Свечи зажигания (комплект 4 шт)', 'Щётки стеклоочистителя (пара)', 'Амортизатор передний'}
rows = []
for r in range(5, ws.max_row + 1):
    v = [ws.cell(r, c).value for c in range(1, 10)]
    if v[3] and isinstance(v[8], (int, float)): rows.append(v)
miss = {v[3] for v in rows if v[3] not in TR}; assert not miss, miss
miss = {v[4] for v in rows if v[4] not in CATS}; assert not miss, miss
C = lambda ru, uz, en: dict(ru=ru, uz=uz, en=en)
prods = []
for i, (n, sku, _ph, name, cat, car, brand, unit, price) in enumerate(rows, 1):
    uz, en = TR[name]
    prods.append(dict(id=i, cat=CATS[cat][0], price=int(price), stock=None, w=None, h=None, d=None, season=None, hit=name in HITS, new=False, old=None, sku=sku, brand=brand,
        name=C(name, uz, en), car=C(car, car, car),
        desc=C(f'Артикул {sku}. Производитель: {brand}. Подходит: {car}.', f'Artikul {sku}. Ishlab chiqaruvchi: {brand}. Mos: {car}.', f'SKU {sku}. Brand: {brand}. Fits: {car}.')))

# ---------- шины (pricelist-tires.xlsx) ----------
import re, os
TCATS = [('tires_car', 'Шины легковые', 'Yengil avtomobil shinalari', 'Passenger car tires'), ('tires_suv', 'Шины Кроссовер / SUV', 'Krossover / SUV shinalari', 'Crossover / SUV tires'),
 ('tires_offroad', 'Шины внедорожные (A/T, M/T)', "Yo‘ldan tashqari shinalar (A/T, M/T)", 'Off-road tires (A/T, M/T)'), ('tires_lt', 'Шины лёгкогрузовые', 'Yengil yuk shinalari', 'Light truck tires'),
 ('tires_truck', 'Шины грузовые', 'Yuk shinalari', 'Truck tires'), ('tires_rf', 'Шины Run-flat', 'Run-flat shinalari', 'Run-flat tires'),
 ('tires_moto', 'Мотошины', 'Mototsikl shinalari', 'Motorcycle tires'), ('tires_agro', 'Шины для сельхозтехники', 'Qishloq xo‘jaligi shinalari', 'Agricultural tires')]
SEA = {'Летняя': ('летняя', 'yozgi', 'summer', 'summer'), 'Зимняя': ('зимняя', 'qishki', 'winter', 'winter'), 'Всесезонная': ('всесезонная', 'barcha fasllar uchun', 'all-season', 'all')}
AXLE = {'рулевая': ('рулевая', 'rul', 'steer'), 'ведущая': ('ведущая', 'yetaklovchi', 'drive'), 'прицепная': ('прицепная', 'tirkama', 'trailer'), 'универсальная': ('универсальная', 'universal', 'universal')}
CLS = {'Эконом': ('Эконом', 'Ekonom', 'Economy'), 'Средний': ('Средний', "O‘rta", 'Mid-range'), 'Премиум': ('Премиум', 'Premium', 'Premium')}
tprods = []
if os.path.exists('pricelist-tires.xlsx'):
    tw = openpyxl.load_workbook('pricelist-tires.xlsx')['Шины']
    for r in range(5, tw.max_row + 1):
        v = [tw.cell(r, c).value for c in range(1, 12)]
        if not v[4] or not isinstance(v[9], (int, float)): continue
        _, _, vid, sea, size, fits, cls, brand, axle, price = v[:10]
        S = SEA[sea]; kind = vid.split(':')[0].strip(); sub = vid.split(':')[1].strip() if ':' in vid else ''
        if kind == 'Легковые': cid = 'tires_car'
        elif kind.startswith('Кроссовер'): cid = 'tires_suv'
        elif kind.startswith('Внедорожные'): cid = 'tires_offroad'
        elif kind.startswith('Лёгкогрузовые'): cid = 'tires_lt'
        elif kind == 'Грузовые': cid = 'tires_truck'
        elif kind.startswith('Run-flat'): cid = 'tires_rf'
        elif kind == 'Мото': cid = 'tires_moto'
        else: cid = 'tires_agro'
        ex = ['', '', '']
        if cid in ('tires_car', 'tires_suv') and 'Зимние' in sub:
            if 'нешип' in sub: ex = [' нешипованная', ' shipsiz', ' studless']
            elif 'шип' in sub: ex = [' шипованная', ' shipli', ' studded']
        if cid == 'tires_offroad':
            tag = 'A/T' if 'A/T' in vid else 'M/T'; ru, uz, en = f'Шина {brand} {size} {tag}', f'{brand} {size} {tag} shina', f'{brand} {size} {tag} tire'
        elif cid == 'tires_lt': ru, uz, en = f'Шина {brand} {size} (лёгкогрузовая)', f'{brand} {size} (yengil yuk) shina', f'{brand} {size} (light truck) tire'
        elif cid == 'tires_truck':
            a2 = AXLE.get(axle or '', ('', '', '')); ru, uz, en = f'Шина {brand} {size} {a2[0]}'.strip(), f'{brand} {size} {a2[1]} shina'.replace('  ', ' '), f'{brand} {size} {a2[2]} truck tire'.replace('  ', ' ')
        elif cid == 'tires_rf': ru, uz, en = f'Шина {brand} {size} Run-flat {S[0]}', f'{brand} {size} Run-flat {S[1]} shina', f'{brand} {size} Run-flat {S[2]} tire'
        elif cid == 'tires_moto': ru, uz, en = f'Мотошина {brand} {size}', f'Mototsikl shinasi {brand} {size}', f'Motorcycle tire {brand} {size}'
        elif cid == 'tires_agro': ru, uz, en = f'Шина {brand} {size} ({fits})', f'{brand} {size} ({fits}) shina', f'{brand} {size} ({fits}) tire'
        else: ru, uz, en = f'Шина {brand} {size} {S[0]}{ex[0]}', f'{brand} {size} {S[1]}{ex[1]} shina', f'{brand} {size} {S[2]}{ex[2]} tire'
        m = re.match(r'^(\d{3})/(\d{2,3})\s*R(\d{2}(?:\.\d)?)C?$', size.strip()); w, h, d = (m.group(1), m.group(2), m.group(3)) if m else (None, None, None)
        c3 = CLS.get(cls, None); desc = ('Класс: %s. ' % c3[0] if c3 else '') + f'Подходит для: {fits}.'
        tprods.append(dict(cat=cid, price=int(price), cls=(c3[0] if c3 else ''), w=w, h=h, d=d, season=S[3], brand=brand, name=C(ru, uz, en), car=C(fits, fits, fits),
            desc=C(desc, ('Sinf: %s. ' % c3[1] if c3 else '') + f'Mos: {fits}.', ('Class: %s. ' % c3[2] if c3 else '') + f'Fits: {fits}.')))
for i, tp in enumerate(tprods, 1):
    tp.update(id=len(prods) + i, stock=None, hit=False, new=False, old=None, sku='TR-%04d' % i); 
prods += tprods

cats = [dict(id=i, name=C(r, u, e)) for i, r, u, e in TCATS if any(p['cat'] == i for p in prods)] + [dict(id=v[0], name=C(k, v[1], v[2])) for k, v in CATS.items()]
json.dump(dict(categories=cats, products=prods), open('bot/catalog.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(dict(currency='сум', categories=[dict(id=c['id'], name=c['name']['ru']) for c in cats],
    products=[dict(id=p['id'], cat=p['cat'], name=p['name']['ru'], brand=p['brand'], car=p['car']['ru'], sku=p['sku'], price=p['price'], **({'badge': 'Хит'} if p['hit'] else {}), **({'cls': p['cls']} if p.get('cls') else {})) for p in prods]),
    open('site/products.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
wb = openpyxl.Workbook(); w = wb.active; w.append(['name', 'category', 'price', 'car', 'brand', 'sku', 'stock', 'description', 'old_price', 'wholesale_price', 'badge'])
for p in prods: w.append([p['name']['ru'], p['cat'], p['price'], p['car']['ru'], p['brand'], p['sku'], None, p['desc']['ru'], None, None, 'Хит' if p['hit'] else None])
wb.save('products-import.xlsx')
print(len(prods), 'товаров;', len(cats), 'разделов;', sum(p['hit'] for p in prods), 'хитов')
