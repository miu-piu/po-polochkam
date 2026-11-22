/* По полочкам — batch import, mixed sheet formats, local image assets. No external services. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MODES=['triple','portrait','landscape'];
const MODE_NAMES={triple:'3 на листе',portrait:'1 вертикальная',landscape:'1 горизонтальная'};
const ICONS=new Set(['auto','none','box','kitchen','food','clothes','shoe','toy','plug','clean','heart','document','paw','star','tools','book','gift','suitcase']);
const IMAGE_PATTERN=/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/i;
const MAX_BATCH=360, MAX_FILE=12*1024*1024, MAX_EMBEDDED=1500000, MAX_SAVED_IMAGE=210000;
let bridge=null,kind='list',fileMap=new Map(),parsed=[],busy=false;
const imageCache=new Map();
const isImageFilename=s=>/^[^\\/<>:"|?*]+\.(?:png|jpg|jpeg|webp)$/i.test(s);
function checkedLabel(item,format,index){
 if(typeof item==='string')item={title:item};
 if(!item||typeof item!=='object'||Array.isArray(item))throw Error(`Наклейка № ${index}: ожидается строка или объект.`);
 const title=String(item.title??item.name??'').trim();
 if(!title||title.length>160)throw Error(`Наклейка № ${index}: название должно быть от 1 до 160 символов.`);
 const detail=String(item.detail??item.subtitle??'').trim();
 if(detail.length>100)throw Error(`Наклейка № ${index}: подпись не должна превышать 100 символов.`);
 const mode=item.format??format;
 if(!MODES.includes(mode))throw Error(`Наклейка № ${index}: неизвестный формат «${String(mode)}». Используйте triple, portrait или landscape.`);
 const icon=item.icon??'auto';
 if(!ICONS.has(icon))throw Error(`Наклейка № ${index}: неизвестный значок «${String(icon)}».`);
 const image=item.image??null;
 if(image!==null&&typeof image!=='string')throw Error(`Наклейка № ${index}: image должен быть строкой — именем файла или data:image/...;base64.`);
 if(image!==null&&!(IMAGE_PATTERN.test(image)||isImageFilename(image)))throw Error(`Наклейка № ${index}: image должен содержать PNG/JPEG/WebP в base64 или имя файла (например, photo.png). Внешние ссылки не поддерживаются.`);
 if(image&&image.length>MAX_EMBEDDED)throw Error(`Наклейка № ${index}: изображение слишком большое для JSON. Прикрепите файл изображения отдельно.`);
 if(image&&isImageFilename(image)&&!fileMap.has(image.toLowerCase()))throw Error(`Наклейка № ${index}: добавьте файл «${image}» кнопкой «Выбрать JSON и картинки».`);
 return {title,detail,icon,category:String(item.category??'').slice(0,100),format:mode,image};
}
function parseBatch(){
 let input=[],defaultFormat='triple';
 if(kind==='list'){
  defaultFormat=$('bulkListFormat').value;
  input=$('bulkLines').value.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
 }else{
  const str=$('bulkJson').value.trim().replace(/^\uFEFF/,'');
  if(!str)throw Error('Вставьте JSON или выберите файл .json.');
  let data;
  try{data=JSON.parse(str)}catch(e){throw Error(`Ошибка JSON: ${e.message}`)}
  if(Array.isArray(data))input=data;
  else if(data&&typeof data==='object'){
   defaultFormat=data.defaultFormat??'triple';
   input=data.labels??data.items;
  }
  if(!Array.isArray(input))throw Error('Ожидается массив наклеек или объект с полем "labels": [...].');
 }
 if(!MODES.includes(defaultFormat))throw Error('Неизвестный defaultFormat. Используйте triple, portrait или landscape.');
 if(!input.length)throw Error('Список пуст. Добавьте хотя бы одну наклейку.');
 if(input.length>MAX_BATCH)throw Error(`Максимум ${MAX_BATCH} наклеек за один импорт.`);
 return input.map((x,i)=>checkedLabel(x,defaultFormat,i+1));
}
function neededPages(items){
 let pages=0,slots=0,current=null;
 for(const x of items){
  if(x.format==='triple'){
   if(current!=='triple'||slots===3){pages++;slots=0;current='triple';}
   slots++;
  }else{pages++;current=x.format;slots=1;}
 }
 return pages;
}
function paintImage(g,src,cx,cy,width,height){
 const rec=imageCache.get(src);
 if(!rec||!rec.ready)return false;
 const img=rec.img;
 const ratio=Math.min(width/img.naturalWidth,height/img.naturalHeight);
 const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
 g.save();g.filter='grayscale(1) contrast(1.12)';g.drawImage(img,cx-w/2,cy-h/2,w,h);g.restore();return true;
}
function preloadImage(src){
 if(!src)return Promise.resolve();
 if(imageCache.has(src))return imageCache.get(src).promise;
 const rec={img:new Image(),ready:false,promise:null};
 rec.promise=new Promise((resolve,reject)=>{
  rec.img.onload=()=>{rec.ready=true;resolve();bridge?.previewChanged();};
  rec.img.onerror=()=>{imageCache.delete(src);reject(new Error('Не удалось открыть изображение наклейки.'))};
  rec.img.src=src;
 });
 imageCache.set(src,rec);
 return rec.promise;
}
async function normalizeImage(src){
 if(!IMAGE_PATTERN.test(src)||src.length>MAX_EMBEDDED)throw Error('Изображение должно быть PNG, JPEG или WebP в формате data:image/...;base64 (до 1,5 МБ текста).');
 const img=new Image();
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Изображение повреждено или не поддерживается браузером.'));img.src=src;});
 if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>24000000)throw Error('Изображение слишком большое: разрешено до 24 миллионов пикселей.');
 const k=Math.min(1,360/Math.max(img.naturalWidth,img.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*k));canvas.height=Math.max(1,Math.round(img.naturalHeight*k));
 const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,canvas.width,canvas.height);
 let output=canvas.toDataURL(src.startsWith('data:image/png')?'image/png':'image/jpeg',.83);
 if(output.length>MAX_SAVED_IMAGE){ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);output=canvas.toDataURL('image/jpeg',.74);}
 if(output.length>MAX_SAVED_IMAGE)throw Error('Картинка слишком сложная для офлайн-хранения. Попробуйте уменьшить её.');
 await preloadImage(output);
 return output;
}
async function imageDataFromFile(file){
 if(!file||!/^image\/(?:png|jpeg|webp)$/.test(file.type)||file.size>MAX_FILE)throw Error('Допускаются картинки PNG, JPEG и WebP размером до 12 МБ.');
 const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('Не удалось прочитать файл изображения.'));r.onload=()=>resolve(r.result);r.readAsDataURL(file);});
 if(data.length>MAX_EMBEDDED){ // Decode large local file directly, then normalize through a temporary image.
  const img=new Image();const temp=URL.createObjectURL(file);
  try{
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=temp;});
   if(img.naturalWidth*img.naturalHeight>24000000)throw Error('Изображение слишком большое по разрешению.');
   const scale=Math.min(1,360/Math.max(img.naturalWidth,img.naturalHeight));
   const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
   return await normalizeImage(c.toDataURL('image/jpeg',.82));
  }finally{URL.revokeObjectURL(temp)}
 }
 return await normalizeImage(data);
}
function inflect(n,one,few,many){const v=n%100;if(v>=11&&v<=14)return many;const d=n%10;return d===1?one:d>=2&&d<=4?few:many;}
function displayPreview(){
 const out=$('bulkPreview'),button=$('bulkApply');
 try{
  parsed=parseBatch();
  const pages=neededPages(parsed),parts=Object.entries({triple:'3 на листе',portrait:'Вертикальных',landscape:'Горизонтальных'}).map(([key,label])=>[parsed.filter(x=>x.format===key).length,label]).filter(([n])=>n>0).map(([n,label])=>`${label}: ${n}`);
  const planning=bridge?.simulate(parsed);
  if(planning?.error)throw Error(planning.error);
  out.className='batch-preview good';
  out.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=`${parsed.length} ${inflect(parsed.length,'наклейка','наклейки','наклеек')} · ${pages} ${inflect(pages,'лист','листа','листов')} в новом наборе`;
  const sub=document.createElement('p');sub.textContent=`${parts.join(' · ')}. ${planning?.addedPages!==undefined?`После импорта будет ${planning.totalPages} ${inflect(planning.totalPages,'лист','листа','листов')}.`:''}`;
  const list=document.createElement('ol');list.className='batch-preview-list';
  for(const x of parsed.slice(0,6)){const li=document.createElement('li');li.textContent=`${x.title} — ${MODE_NAMES[x.format]}${x.image?' · картинка':x.icon!=='auto'?' · значок':''}`;list.appendChild(li)}
  if(parsed.length>6){const li=document.createElement('li');li.textContent=`…и ещё ${parsed.length-6}`;list.appendChild(li)}
  out.append(heading,sub,list);
  button.disabled=busy;
 }catch(e){parsed=[];out.className='batch-preview error';out.textContent=e.message;button.disabled=true;}
}
function setKind(next){
 if(!['list','json','ai'].includes(next))return;
 kind=next;
 $('bulkListPane').hidden=next!=='list';$('bulkJsonPane').hidden=next!=='json';$('bulkAiPane').hidden=next!=='ai';
 $('bulkFileArea').hidden=next==='ai';$('bulkImportActions').hidden=next==='ai';
 for(const b of document.querySelectorAll('#bulkTabs button'))b.setAttribute('aria-pressed',String(b.dataset.kind===next));
 if(next!=='ai')displayPreview();
}
async function onFilesChanged(){
 const files=[...$('bulkFiles').files];
 if(!files.length)return;
 const map=new Map();let json=null;
 for(const f of files){
  if(f.name.toLowerCase().endsWith('.json')){if(json)throw Error('Выберите только один JSON-файл.');if(f.size>5*1024*1024)throw Error('JSON-файл слишком большой (максимум 5 МБ).');json=f;}
  else if(/\.(png|jpe?g|webp)$/i.test(f.name)){if(f.size>MAX_FILE)throw Error(`Файл «${f.name}» слишком большой (12 МБ максимум).`);map.set(f.name.toLowerCase(),f);}
  else throw Error(`Неподдерживаемый файл «${f.name}».`);
 }
 fileMap=map;
 $('bulkFileName').textContent=`Выбрано файлов: ${files.length}${json?' · '+json.name:''}`;
 if(json){$('bulkJson').value=await json.text();setKind('json');}
 else displayPreview();
}
async function commit(){
 if(busy)return;const batch=parseBatch();
 if(!bridge)throw Error('Редактор ещё не готов.');
 busy=true;$('bulkApply').disabled=true;$('bulkApply').textContent='Подготовка…';
 try{
  const items=[];
  for(let i=0;i<batch.length;i++){
   const x={...batch[i]};
   if(x.image){
    try{x.image=await (isImageFilename(x.image)?imageDataFromFile(fileMap.get(x.image.toLowerCase())):normalizeImage(x.image))}
    catch(e){throw Error(`Наклейка № ${i+1} «${x.title}»: ${e.message}`)}
   }
   items.push(x);
  }
  const result=bridge.append(items);
  if(result.error)throw Error(result.error);
  bridge.closeDialog('bulkDialog');
  bridge.goStudio();
  bridge.notify(`Добавлено ${items.length} ${inflect(items.length,'наклейка','наклейки','наклеек')} · всего ${result.totalPages} ${inflect(result.totalPages,'лист','листа','листов')}`);
 }finally{busy=false;$('bulkApply').textContent='Добавить наклейки';$('bulkApply').disabled=false;}
}
function init(handlers){
 bridge=handlers;
 $('bulkOpenBtn').addEventListener('click',()=>{displayPreview();bridge.openDialog('bulkDialog')});
 $('bulkCloseBtn').addEventListener('click',()=>bridge.closeDialog('bulkDialog'));
 $('bulkDialog').addEventListener('click',e=>{if(e.target===$('bulkDialog'))bridge.closeDialog('bulkDialog')});
 for(const button of document.querySelectorAll('#bulkTabs button'))button.addEventListener('click',()=>setKind(button.dataset.kind));
 for(const id of ['bulkLines','bulkJson'])$(id).addEventListener('input',displayPreview);
 $('bulkListFormat').addEventListener('change',displayPreview);
 $('bulkFiles').addEventListener('change',()=>onFilesChanged().catch(e=>{fileMap.clear();$('bulkFileName').textContent=e.message;displayPreview()}));
 $('bulkExample').addEventListener('click',()=>{
  $('bulkJson').value=JSON.stringify({version:1,labels:[
   {title:'Макароны',format:'triple',icon:'food'},
   {title:'Крупы',format:'triple',detail:'На каждый день',icon:'food'},
   {title:'Зимняя одежда',format:'portrait',icon:'clothes'},
   {title:'Кабели и зарядки',format:'landscape',icon:'plug'}
  ]},null,2);setKind('json');
 });
 $('bulkApply').addEventListener('click',()=>commit().catch(e=>{const out=$('bulkPreview');out.className='batch-preview error';out.textContent=e.message}));
 $('labelImageFile').addEventListener('change',async()=>{
  const file=$('labelImageFile').files?.[0];if(!file)return;
  try{const src=await imageDataFromFile(file);const result=bridge.setImage(src);if(result.error)throw Error(result.error);bridge.notify('Картинка добавлена');}
  catch(e){bridge.notify(e.message)}finally{$('labelImageFile').value=''}
 });
 $('removeLabelImage').addEventListener('click',()=>{const r=bridge.setImage(null);if(r.error)bridge.notify(r.error);else bridge.notify('Картинка удалена');});
 setKind('list');
}
window.PPBulk={init,preloadImage,paintImage,setKind};
})();
