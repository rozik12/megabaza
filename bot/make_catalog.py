# Генератор catalog.json (3 языка). Цены и совместимость — ОБРАЗЕЦ: замените реальным прайсом. Запуск: python3 make_catalog.py
import json
SEA={'summer':('летняя','yozgi','summer'),'winter':('зимняя','qishki','winter'),'all':('всесезонная','barcha fasllar uchun','all-season')}
C=lambda ru,uz,en:dict(ru=ru,uz=uz,en=en)
UNI=C('Универсальный','Universal','Universal')
P=[]; nid=[0]
def nxt(): nid[0]+=1; return nid[0]
BASE={13:370,14:440,15:520,16:640,17:810,18:980}
def tire(cat,w,h,d,season,cars,stock=10,hit=False,new=False,old=None,pos=None):
    s=SEA[season]; size=f'{w}/{h} R{d}' if cat!='tires_lt' else f'{w}/{h} R{d}C'
    price=round(BASE[d]*(1+(int(w)-175)/400)*(1.1 if season=='winter' else 1.08 if season=='all' else 1)*(1.25 if cat=='tires_lt' else 1.15 if cat=='tires_suv' else 1))*1000
    price=int(round(price/10000)*10000)
    P.append(dict(id=nxt(),cat=cat,price=price,stock=stock,w=w,h=h,d=str(d),season=season,hit=hit,new=new,old=old and int(old),
      name=C(f'Шина {size} {s[0]}',f'{size} {s[1]} shina',f'{size} {s[2]} tire'),car=C(cars,cars,cars) if isinstance(cars,str) else cars,
      desc=C('Новая шина. Гарантия, подбор и монтаж в магазине.',"Yangi shina. Kafolat, tanlash va o'rnatish do'konda.",'New tire. Warranty, fitting advice and mounting in store.')))
car=lambda t:t
tire('tires_car','155','70',13,'summer','Chevrolet Matiz / Spark',20)
tire('tires_car','175','70',13,'summer','Chevrolet Damas / Nexia (старые)',20)
tire('tires_car','175','65',14,'summer','Chevrolet Spark / Nexia',14)
tire('tires_car','185','60',14,'summer','Chevrolet Nexia',12)
tire('tires_car','185','65',15,'summer','Chevrolet Nexia 3 / Cobalt',16,hit=True)
tire('tires_car','185','65',15,'winter','Chevrolet Nexia 3 / Cobalt',8)
tire('tires_car','195','65',15,'summer','Chevrolet Cobalt / Gentra',14)
tire('tires_car','195','65',15,'all','Chevrolet Cobalt / Gentra',12,hit=True)
tire('tires_car','205','60',15,'summer','Chevrolet Gentra / Lacetti',10)
tire('tires_car','205','55',16,'summer','Chevrolet Lacetti / Gentra',10,hit=True)
tire('tires_car','205','55',16,'winter','Chevrolet Lacetti / Gentra',6)
tire('tires_car','215','60',16,'summer','Chevrolet Malibu',0)
tire('tires_car','215','55',17,'summer','Chevrolet Malibu',8,new=True)
tire('tires_car','225','45',17,'summer','Chevrolet Malibu / седаны',6)
tire('tires_car','235','45',18,'summer','Chevrolet Malibu / седаны',4,new=True)
tire('tires_lt','195','75',16,'all','Микроавтобусы',14)
tire('tires_lt','205','75',16,'all','Фургоны, пикапы',10)
tire('tires_lt','215','75',16,'all','Фургоны, пикапы',9)
tire('tires_lt','235','65',16,'all','Микроавтобусы, фургоны',7)
tire('tires_suv','215','65',16,'all','Chevrolet Tracker / кроссоверы',10)
tire('tires_suv','235','65',17,'all','Кроссоверы / SUV',10,hit=True)
tire('tires_suv','235','60',17,'all','Chevrolet Captiva',8)
tire('tires_suv','265','65',17,'all','Внедорожники',6)
tire('tires_suv','255','55',18,'all','Chevrolet Captiva / SUV',5,new=True)
def truck(size,pos,price,w=None,h=None,d=None,stock=8,hit=False):
    ps={'steer':('рулевая','rul','steer'),'drive':('ведущая','yetaklovchi','drive'),'uni':('универсальная','universal','universal'),'trailer':('прицепная','tirkama','trailer')}[pos]
    P.append(dict(id=nxt(),cat='tires_truck',price=price,stock=stock,w=w,h=h,d=d,season='all',hit=hit,new=False,old=None,
      name=C(f'Шина {size} {ps[0]}',f'{size} {ps[1]} shina',f'{size} {ps[2]} truck tire'),car=C('Грузовики, тягачи','Yuk mashinalari, tyagachlar','Trucks, tractors'),
      desc=C('Грузовая шина для магистральных и городских перевозок.','Magistral va shahar tashuvlari uchun yuk shinasi.','Truck tire for long-haul and city freight.')))
truck('275/70 R22.5','steer',2900000,'275','70','22.5')
truck('295/80 R22.5','steer',3100000,'295','80','22.5',hit=True)
truck('295/80 R22.5','drive',3200000,'295','80','22.5')
truck('315/80 R22.5','drive',3400000,'315','80','22.5',hit=True)
truck('385/65 R22.5','trailer',3300000,'385','65','22.5')
truck('8.25 R20','uni',2300000)
truck('9.00 R20','uni',2450000)
truck('10.00 R20','uni',2500000)
truck('11.00 R20','uni',2600000)
truck('12.00 R20','uni',3000000)
def simple(cat,ru,uz,en,price,cars,stock,dru,duz,den,**k):
    P.append(dict(id=nxt(),cat=cat,price=price,stock=stock,w=None,h=None,d=None,season=None,hit=k.get('hit',False),new=k.get('new',False),old=k.get('old'),name=C(ru,uz,en),car=cars,desc=C(dru,duz,den)))
for d,p in [(13,320),(14,350),(15,380),(16,430)]:
    simple('disks',f'Диск штампованный R{d}',f'R{d} shtamplangan disk',f'R{d} steel wheel',p*1000,UNI,16,'Штампованный диск.','Shtamplangan disk.','Steel wheel.')
for d,p in [(15,780),(16,900),(17,1100)]:
    simple('disks',f'Диск литой R{d}',f'R{d} quyma disk',f'R{d} alloy wheel',p*1000,UNI,8,'Литой диск.','Quyma disk.','Alloy wheel.',new=(d==17))
simple('accessories','Камера для шины R13','R13 shina kamerasi','Inner tube R13',75000,C('Легковые','Yengil','Passenger'),30,'Камера для легковых шин.','Yengil shinalar kamerasi.','Inner tube for passenger tires.')
simple('accessories','Камера для шины R15','R15 shina kamerasi','Inner tube R15',85000,C('Легковые','Yengil','Passenger'),30,'Камера для легковых шин.','Yengil shinalar kamerasi.','Inner tube for passenger tires.')
simple('accessories','Вентиль бескамерный (4 шт.)','Kamerasiz ventil (4 dona)','Tubeless valve (4 pcs)',25000,UNI,50,'Комплект из 4 вентилей.','4 ta ventil to‘plami.','Set of 4 valves.')
simple('accessories','Балансировочные грузики (упаковка)','Balans yuklari (qadoq)','Wheel weights (pack)',60000,UNI,40,'Набор грузиков для балансировки.','Balanslash uchun yuklar to‘plami.','Weight set for wheel balancing.')
simple('accessories','Герметик для шин','Shina germetigi','Tire sealant',70000,UNI,25,'Быстрый ремонт проколов.','Teshilishlarni tez ta’mirlash.','Quick puncture repair.')
simple('accessories','Колёсные болты (комплект 20 шт.)','G‘ildirak boltlari (20 dona)','Wheel bolts (20 pcs)',140000,UNI,18,'Комплект крепежа.','Mahkamlash to‘plami.','Fastener set.')
simple('accessories','Насос автомобильный','Avtomobil nasosi','Car tire pump',180000,UNI,12,'Компрессор 12 В.','12 V kompressor.','12 V compressor.',new=True)
simple('services','Шиномонтаж (4 колеса)','Shina o‘rnatish (4 g‘ildirak)','Tire fitting (4 wheels)',120000,UNI,None,'Монтаж и демонтаж 4 колёс R13–R17.','4 ta g‘ildirak R13–R17 o‘rnatish va yechish.','Mounting/demounting of 4 wheels R13–R17.',hit=True)
simple('services','Балансировка (4 колеса)','Balanslash (4 g‘ildirak)','Wheel balancing (4 wheels)',80000,UNI,None,'Балансировка 4 колёс.','4 ta g‘ildirakni balanslash.','Balancing of 4 wheels.')
simple('services','Ремонт прокола','Teshilishni ta’mirlash','Puncture repair',40000,UNI,None,'Ремонт бескамерной шины.','Kamerasiz shinani ta’mirlash.','Tubeless tire repair.')
simple('services','Хранение шин (сезон)','Shinalarni saqlash (mavsum)','Tire storage (season)',200000,UNI,None,'Сезонное хранение комплекта шин.','Shinalar to‘plamini mavsumiy saqlash.','Seasonal storage of a tire set.')
# акции: старая цена выше текущей
for p in P:
    if p['id'] in (7,10,23): p['old']=int(p['price']*1.12/1000)*1000
cats=[('tires_car',C('Шины для легковых','Yengil avtomobil shinalari','Passenger car tires')),('tires_lt',C('Микроавтобус и пикап','Mikroavtobus va pikap','Van & pickup')),('tires_suv',C('Внедорожные шины','Yo‘ldan tashqari shinalar','SUV / off-road tires')),('tires_truck',C('Грузовые шины','Yuk shinalari','Truck tires')),('disks',C('Диски','Disklar','Wheels')),('accessories',C('Камеры, вентили, аксессуары','Kameralar, ventillar, aksessuarlar','Tubes, valves, accessories')),('services',C('Услуги','Xizmatlar','Services'))]
json.dump(dict(categories=[dict(id=i,name=n) for i,n in cats],products=P),open('catalog.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(P),'products')
