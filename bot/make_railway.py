# Собирает railway.ts — единый файл для Railway Functions (Bun): каталог и логотип внутри, состояние в памяти.
import re,base64,io
from PIL import Image
s=open('bot.js').read(); cat=open('catalog.json',encoding='utf8').read()
im=Image.open('logo.png').convert('RGB').resize((480,480)); b=io.BytesIO(); im.save(b,'JPEG',quality=88); logo=base64.b64encode(b.getvalue()).decode()
emb=f"""const CAT = {cat};
const LOGO = () => Buffer.from('{logo}', 'base64');
const LOGO_TYPE = ['image/jpeg', 'logo.jpg'];
const loadState = () => null;
const writeState = (s) => {{}};"""
s=re.sub(r"/\*FS_BEGIN\*/.*?/\*FS_END\*/",lambda m:emb,s,flags=re.S)
s=s.replace("if (require.main === module) main(); else module.exports = { onMessage, onCallback };","Bun.serve({ port: Number(Bun.env.PORT) || 3000, fetch: () => new Response('MEGABAZA bot ok') });\nmain();")
open('railway.ts','w',encoding='utf8').write('// @ts-nocheck\n'+s); print(len(s)//1024,'KB')
