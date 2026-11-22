/* По полочкам v3. Всё работает локально: картотека, интерактивные слоты, печать PDF/PNG. */
(()=>{
'use strict';
const MM={w:75,h:120},W=600,H=960;
const $=id=>document.getElementById(id);
const CATALOG=Array.isArray(window.LABEL_CATALOG)?window.LABEL_CATALOG:[];
const ALIASES={провод:'кабели зарядки переходники usb',провода:'кабели',шнур:'кабели',крупа:'крупы макароны гречка рис',шкаф:'хранение',шапка:'шапки',ботинки:'обувь',дети:'детское ребенка',ребенок:'детское',маленькое:'мало на вырост',памперсы:'подгузники',елка:'елочные новый год',пес:'собака',кастрюля:'кухня посуда',носки:'носки одежда'};
const ICONS={"Кухня":"kitchen","продукт":"food","Круп":"food","Макарон":"food","Детск":"toy","игруш":"toy","Одежд":"clothes","шап":"clothes","шарф":"clothes","перчат":"clothes","бель":"clothes","обув":"shoe","Кабел":"plug","электрон":"plug","Быт":"clean","Убор":"clean","Стир":"clean","Уход":"heart","Космет":"heart","Аптеч":"heart","Документ":"document","деньг":"document","Собак":"paw","животн":"paw","Праздн":"gift","Хобб":"star","Инструмент":"tools","ремонт":"tools","книг":"book","литерат":"book","подар":"gift","праздн":"gift","путеш":"suitcase","заряд":"plug"};
const ICON_OPTIONS=[['auto','Автоматически','подбор'],['none','Без значка','нет пусто'],['box','Коробка','хранение шкаф'],['kitchen','Кухня','посуда кастрюля'],['food','Продукты','еда крупы бакалея макароны'],['clothes','Одежда','футболка вещи'],['shoe','Обувь','ботинки сапоги'],['toy','Игрушки','детское конструктор'],['plug','Техника','электроника кабели'],['clean','Уборка','моющие средства'],['heart','Уход','косметика здоровье'],['document','Документы','бумаги договоры'],['paw','Животные','собака лапа'],['star','Хобби','звезда интересы'],['tools','Инструменты','ремонт ключ'],['book','Книги','чтение тетради'],['gift','Подарки','праздники банты'],['suitcase','Поездки','чемодан путешествие']];
const state={cat:'Все',query:'',sheets:[],sheetIndex:0,activeSlot:0,marked:new Set(),favorites:new Set(),recent:[],manualSlot:false};
const canvas=$('preview'),ctx=canvas.getContext('2d');
let installPrompt=null,toastTimer=null,undoState=null,activeDialog=null,dialogOrigin=null,previousInert=null;
function uid(){return (globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);}
function newSheet(mode='triple'){return {id:uid(),mode,labels:[null,null,null]};}
function norm(s){return String(s||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
function cleanLabel(l){if(!l||typeof l.title!=='string')return null;return {title:l.title.slice(0,160),detail:String(l.detail||'').slice(0,100),icon:ICON_OPTIONS.some(x=>x[0]===l.icon)?l.icon:'auto',category:String(l.category||'').slice(0,100),image:typeof l.image==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(l.image)&&l.image.length<=210000?l.image:null};}
function filled(l){return !!(l&&l.title&&l.title.trim());}
function sheet(){return state.sheets[state.sheetIndex];}
function sheetFilled(s){return s.labels.some(filled);}
function countLabels(){return state.sheets.reduce((n,s)=>n+s.labels.filter(filled).length,0);}
function usableSheets(){return state.sheets.filter(sheetFilled);}
function restore(){
 try{
  const o=JSON.parse(localStorage.getItem('pp_labels_v3')||'null');
  if(o&&Array.isArray(o.sheets)){
   state.sheets=o.sheets.slice(0,120).filter(x=>x&&['triple','portrait','landscape'].includes(x.mode)&&Array.isArray(x.labels)).map(x=>({id:x.id||uid(),mode:x.mode,labels:[0,1,2].map(i=>cleanLabel(x.labels[i]))}));
   state.sheetIndex=Math.max(0,Math.min(Number(o.sheetIndex)||0,state.sheets.length-1));
   state.activeSlot=Math.max(0,Math.min(Number(o.activeSlot)||0,2));
   if(Array.isArray(o.favorites))state.favorites=new Set(o.favorites.filter(x=>typeof x==='string'));
   if(Array.isArray(o.recent))state.recent=o.recent.filter(x=>x&&typeof x.title==='string').slice(0,25);
  }else{
   const old=JSON.parse(localStorage.getItem('pp_labels_v2')||'null');
   if(old&&Array.isArray(old.queue)&&old.queue.length){const mode=['triple','portrait','landscape'].includes(old.mode)?old.mode:'triple',batch=mode==='triple'?3:1;for(let i=0;i<old.queue.length;i+=batch){const s=newSheet(mode);old.queue.slice(i,i+batch).forEach((l,j)=>{s.labels[j]=cleanLabel(l);});state.sheets.push(s);} }
  }
 }catch(e){console.warn('Не удалось восстановить черновик',e);}
 if(!state.sheets.length)state.sheets=[newSheet()];if(sheet().mode!=='triple')state.activeSlot=0;
}
function save(){try{localStorage.setItem('pp_labels_v3',JSON.stringify({sheets:state.sheets,sheetIndex:state.sheetIndex,activeSlot:state.activeSlot,favorites:[...state.favorites],recent:state.recent}));}catch(e){console.warn('Сохранение недоступно',e);}}
function toast(s,withUndo=false){
 const el=$('toast');$('toastText').textContent=s;$('undoBtn').hidden=!withUndo;el.hidden=false;
 if(!withUndo)undoState=null;
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{el.hidden=true;undoState=null;},withUndo?8000:2600);
}
function snapshot(){return {sheets:JSON.parse(JSON.stringify(state.sheets)),sheetIndex:state.sheetIndex,activeSlot:state.activeSlot};}
function destructive(message,action){undoState=snapshot();action();save();refreshSheet();toast(message,true);}
function undoDestructive(){if(!undoState)return;const last=undoState;undoState=null;state.sheets=last.sheets;state.sheetIndex=last.sheetIndex;state.activeSlot=last.activeSlot;state.manualSlot=false;save();refreshSheet();toast('Изменение отменено');}
function onMobile(){return window.matchMedia('(max-width: 760px)').matches;}
// Never activate a software keyboard except when a person explicitly taps a text field.
function blurTextField(){
 const el=document.activeElement;
 if(el&&el.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]'))el.blur();
}
function setMobileView(view,focus=false){
 if(!['library','studio','print'].includes(view))return;
 $('appShell').dataset.mobileView=view;
 document.querySelectorAll('#mobileNav button[data-view]').forEach(b=>{
   if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 if(onMobile()){
   blurTextField();
   window.scrollTo(0,0);
   if(focus){const target=view==='library'?$('libraryTitle'):view==='studio'?$('studioTitle'):$('printTitle');target.focus({preventScroll:true});}
 }
}
function currentLabel(){return sheet().labels[sheet().mode==='triple'?state.activeSlot:0];}
function iconFor(label){if(label&&label.icon&&label.icon!=='auto')return label.icon;const title=norm(label?.title||'');for(const [k,v] of Object.entries(ICONS))if(title.includes(norm(k)))return v;const category=norm(label?.category||'');for(const [k,v] of Object.entries(ICONS))if(category.includes(norm(k)))return v;return 'box';}
function remember(item){state.recent=[{id:item.id||item.title,title:item.title,category:item.category||'',sub:item.sub||''},...state.recent.filter(x=>x.title!==item.title)].slice(0,25);}
function iconThumbnail(icon,size=34){const c=document.createElement('canvas');c.width=80;c.height=80;c.className='entry-thumb';c.style.width=size+'px';c.style.height=size+'px';const g=c.getContext('2d');drawIcon(g,icon==='auto'?'box':icon,40,40,55);return c;}
function chooseCategory(cat){state.cat=cat;renderCategories();renderLibrary();}
function renderCategories(){const categories=['Все','☆ Избранное','Недавние',...new Set(CATALOG.map(x=>x.category))];const box=$('categories');box.replaceChildren();for(const cat of categories){const b=document.createElement('button');b.type='button';b.className='chip category'+(state.cat===cat?' active':'');b.textContent=cat==='☆ Избранное'?'Избранное':cat;if(cat==='☆ Избранное')b.dataset.icon='star';if(cat==='Недавние')b.dataset.icon='clock-3';b.setAttribute('aria-pressed',String(state.cat===cat));b.addEventListener('click',()=>chooseCategory(cat));box.appendChild(b);}}
function matches(item,q){if(!q)return true;const s=norm([item.title,item.sub,item.category].join(' '));if(s.includes(q))return true;const expanded=ALIASES[q];return !!(expanded&&expanded.split(' ').some(w=>s.includes(norm(w))));}
function renderLibrary(){
 const q=norm(state.query);let rows=state.cat==='☆ Избранное'?CATALOG.filter(x=>state.favorites.has(x.id)):state.cat==='Недавние'?state.recent:CATALOG.filter(x=>state.cat==='Все'||x.category===state.cat);
 rows=rows.filter(x=>matches(x,q));if(q)rows.sort((a,b)=>{const score=x=>norm(x.title)===q?0:norm(x.title).startsWith(q)?1:2;return score(a)-score(b)});
 $('resultsTitle').textContent=state.cat==='Все'?'Готовые названия':state.cat;$('resultsCount').textContent=`${rows.length} вариантов`;
 const list=$('libraryList');list.replaceChildren();const exact=CATALOG.some(x=>norm(x.title)===q);
 if(state.query.trim()&&!exact){const row=document.createElement('div');row.className='entry';const b=document.createElement('button');b.className='entry-name';b.textContent=`Создать «${state.query.trim()}»`;b.dataset.icon='plus';b.addEventListener('click',()=>applyLabel({title:state.query.trim(),category:''}));row.appendChild(b);list.appendChild(row);}
 if(!rows.length&&!q){const e=document.createElement('div');e.className='queue-empty';e.textContent=state.cat==='☆ Избранное'?'Здесь будут отмеченные звёздочкой названия':state.cat==='Недавние'?'Выбранные названия появятся здесь':'Пока нет вариантов';list.appendChild(e);}
 const frag=document.createDocumentFragment();for(const item of rows.slice(0,200)){
  const row=document.createElement('div');row.className='entry';row.setAttribute('role','listitem');
  const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label',`Выбрать ${item.title} для объединения`);check.title='Отметить для объединения';check.checked=state.marked.has(item.id);check.addEventListener('change',()=>{if(check.checked)state.marked.add(item.id);else state.marked.delete(item.id);updateMarked();});
  const thumb=iconThumbnail(iconFor(item),26);
  const label=document.createElement('button');label.type='button';label.className='entry-name';label.title='В активную наклейку';const name=document.createElement('span');name.textContent=item.title;label.appendChild(name);if(item.sub){const sub=document.createElement('small');sub.textContent=item.sub;label.appendChild(sub);}label.addEventListener('click',()=>applyLabel(item));
  const fav=document.createElement('button');fav.type='button';fav.className='btn btn--icon fav-toggle'+(state.favorites.has(item.id)?' active':'');fav.dataset.icon='star';fav.setAttribute('aria-label',state.favorites.has(item.id)?'Убрать из избранного':'В избранное');fav.title=fav.getAttribute('aria-label');fav.addEventListener('click',()=>{
 if(state.favorites.has(item.id))state.favorites.delete(item.id);else state.favorites.add(item.id);
 save();renderLibrary();const candidate=[...$('libraryList').querySelectorAll('.fav-toggle')].find(b=>b.dataset.itemId===item.id);
 (candidate||$('libraryTitle')).focus({preventScroll:true});
});fav.dataset.itemId=item.id;
  const add=document.createElement('button');add.type='button';add.className='btn btn--icon add-mini';add.dataset.icon='plus';add.title='В следующее свободное место';add.setAttribute('aria-label',`Добавить ${item.title} в следующее свободное место`);add.addEventListener('click',()=>applyLabel(item,true));
  const checkWrap=document.createElement('label');checkWrap.className='entry-check';checkWrap.appendChild(check);row.append(checkWrap,thumb,label,fav,add);frag.appendChild(row);
 }
 list.appendChild(frag);if(rows.length>200){const h=document.createElement('div');h.className='queue-empty';h.textContent=`Ещё ${rows.length-200} вариантов. Уточни поиск.`;list.appendChild(h);}updateMarked();
}
function updateMarked(){const n=state.marked.size;$('combineBtn').disabled=n<2;$('markedCount').textContent=n?`(${n})`:'';}
function mobileGoStudio(){if(onMobile())setMobileView('studio',true);}
function fillSlot(item,at,auto=false){const s=sheet();const slot=s.mode==='triple'?at:0;s.labels[slot]={title:String(item.title||'').trim().slice(0,160),detail:String(item.detail||'').slice(0,100),icon:item.icon||'auto',category:item.category||'',image:item.image||null};state.activeSlot=slot;if(s.mode==='triple'&&auto){const next=s.labels.findIndex((l,i)=>i>slot&&!filled(l));if(next>=0)state.activeSlot=next;}save();refreshSheet();}
function firstFree(s){return s.mode==='triple'?s.labels.findIndex(l=>!filled(l)):filled(s.labels[0])?-1:0;}
function applyLabel(item,auto=false){
 if(!String(item.title||'').trim()){toast('Сначала введи название');return;}
 if(!auto&&state.manualSlot){fillSlot(item,state.activeSlot,false);}
 else {let i=firstFree(sheet());if(i<0){if(state.sheets.length>=120){toast('Достигнут предел 120 листов');return;}state.sheets.push(newSheet(sheet().mode));state.sheetIndex=state.sheets.length-1;i=0;}fillSlot(item,i,true);}
 state.manualSlot=false;remember(item);save();renderLibrary();toast('Наклейка добавлена');mobileGoStudio();
}
function combineMarked(){const items=CATALOG.filter(x=>state.marked.has(x.id));if(items.length<2)return;const title=items.map(x=>x.title).join(' · ');state.marked.clear();applyLabel({title,detail:'',icon:'auto',category:items[0].category});}
function renderEditor(){const l=currentLabel()||{};$('editorSlot').textContent=sheet().mode==='triple'?`№ ${state.activeSlot+1}`:'на листе';$('titleInput').value=l.title||'';$('detailInput').value=l.detail||'';$('iconSelect').value=l.icon||'auto';$('labelImageStatus').textContent=l.image?'Своя картинка добавлена. При печати она заменит стандартный значок.':'Без своей картинки · используется выбранный значок';$('removeLabelImage').hidden=!l.image;}
function syncEditor(){const l={title:$('titleInput').value,detail:$('detailInput').value,icon:$('iconSelect').value,category:currentLabel()?.category||'',image:currentLabel()?.image||null};sheet().labels[sheet().mode==='triple'?state.activeSlot:0]=(l.title||l.detail)?l:null;save();renderPreview();renderSheetList();updateSheetMeta();}
function selectSlot(i,returnTo=null){
 const s=sheet();state.activeSlot=s.mode==='triple'?Math.max(0,Math.min(2,i)):0;state.manualSlot=true;save();renderPreview();renderEditor();updateSheetMeta();
 if(returnTo==='canvas')$('slotOverlay').children[state.activeSlot]?.focus({preventScroll:true});
 else if(returnTo==='bar')$('slotButtons').children[state.activeSlot]?.focus({preventScroll:true});
}
function renderPreview(){
 const s=sheet(),wide=s.mode==='landscape';canvas.width=wide?H:W;canvas.height=wide?W:H;$('previewPaper').classList.toggle('landscape',wide);
 renderSurface(ctx,s.labels,s.mode,true);const overlay=$('slotOverlay');overlay.replaceChildren();const bar=$('slotButtons');bar.replaceChildren();const count=s.mode==='triple'?3:1;
 for(let i=0;i<count;i++){
  if(s.mode==='triple'){const hit=document.createElement('button');hit.type='button';hit.className='slot-hit'+(i===state.activeSlot?' active':'');hit.style.top=`${i/3*100}%`;hit.style.height='33.33334%';hit.title=`Редактировать наклейку ${i+1}`;hit.setAttribute('aria-label',`Редактировать наклейку ${i+1}`);hit.addEventListener('click',()=>selectSlot(i,'canvas'));const tag=document.createElement('span');tag.className='slot-num';tag.textContent=String(i+1);hit.appendChild(tag);overlay.appendChild(hit);}
  const button=document.createElement('button');button.type='button';button.className='chip slot-button'+(i===state.activeSlot?' active':'')+(filled(s.labels[i])?' filled':'');button.textContent=s.mode==='triple'?String(i+1):'1';button.setAttribute('aria-pressed',String(i===state.activeSlot));button.setAttribute('aria-label',`Наклейка ${i+1}${filled(s.labels[i])?' заполнена':''}`);button.addEventListener('click',()=>selectSlot(i,'bar'));bar.appendChild(button);
 }
 $('slotLegend').textContent=s.mode==='triple'?`Редактируется наклейка ${state.activeSlot+1}`:'Редактируется весь лист';
 $('moveUp').disabled=s.mode!=='triple'||state.activeSlot===0;$('moveDown').disabled=s.mode!=='triple'||state.activeSlot===2;$('duplicateSlot').disabled=!filled(currentLabel());$('clearSlot').disabled=!currentLabel();
 $('modeHint').textContent=s.mode==='triple'?'Три отдельных области 75 × 40 мм. Нажми на любую.':s.mode==='portrait'?'Одна большая наклейка 75 × 120 мм.':'Текст повёрнут горизонтально внутри листа 75 × 120 мм.';
 document.querySelectorAll('.mode').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===s.mode)));
}
function updateSheetMeta(){const s=sheet();$('sheetNumber').textContent=`Лист ${state.sheetIndex+1} из ${state.sheets.length}`;$('prevSheet').disabled=state.sheetIndex===0;$('nextSheet').disabled=state.sheetIndex===state.sheets.length-1;$('deleteSheet').disabled=state.sheets.length===1&&!sheetFilled(s);$('clearSheet').disabled=!sheetFilled(s);$('fillNext').textContent=s.mode==='triple'?'Следующая пустая':'Новый лист';}
function renderSheetList(){
 const list=$('queueList');list.replaceChildren();state.sheets.forEach((s,i)=>{const row=document.createElement('div');row.className='queued'+(i===state.sheetIndex?' active':'');const n=document.createElement('span');n.className='queued-num';n.textContent=String(i+1);const main=document.createElement('button');main.type='button';main.className='queued-main';const b=document.createElement('strong');b.textContent=s.mode==='triple'?'3 на листе':s.mode==='portrait'?'1 вертикальная':'1 горизонтальная';const sm=document.createElement('small');sm.textContent=s.labels.filter(filled).map(x=>x.title).join(' · ')||'Пустой лист';main.append(b,sm);main.addEventListener('click',()=>goSheet(i));row.append(n,main);
 for(const [text,title,action,disabled] of [['↑','Поднять лист',()=>moveSheet(i,-1),i===0],['↓','Опустить лист',()=>moveSheet(i,1),i===state.sheets.length-1],['×','Удалить лист',()=>deleteSheet(i),state.sheets.length===1&&!sheetFilled(s)]]){const bt=document.createElement('button');bt.type='button';bt.className='btn btn--icon queue-action'+(text==='×'?' danger':'');bt.dataset.icon=text==='↑'?'arrow-up':text==='↓'?'arrow-down':'trash-2';bt.title=title;bt.setAttribute('aria-label',`${title} ${i+1}`);bt.disabled=disabled;bt.addEventListener('click',action);row.appendChild(bt);}list.appendChild(row);});
 $('queueCount').textContent=String(countLabels());$('pageCount').textContent=`${usableSheets().length} листов · ${countLabels()} наклеек`;
 $('pdfBtn').disabled=!usableSheets().length;$('pngBtn').disabled=!sheetFilled(sheet());$('shareBtn').disabled=!usableSheets().length;
 $('quickPdfBtn').disabled=!usableSheets().length;$('studioPageCount').textContent=String(usableSheets().length);
}
function refreshSheet(){renderPreview();renderEditor();renderSheetList();updateSheetMeta();}
function goSheet(i){if(i<0||i>=state.sheets.length)return;state.sheetIndex=i;state.activeSlot=0;state.manualSlot=false;save();refreshSheet();}
function addSheet(mode=sheet().mode){if(state.sheets.length>=120){toast('Максимум 120 листов');return;}state.sheets.push(newSheet(mode));goSheet(state.sheets.length-1);toast('Создан новый лист');}

function planBatch(items){
 if(!Array.isArray(items)||!items.length)return {error:'Список пуст.'};
 const draft=JSON.parse(JSON.stringify(state.sheets));
 const firstExisting=draft.length;
 let firstImported=-1,addedPages=0;
 for(const item of items){
  const mode=item.format;
  if(!['triple','portrait','landscape'].includes(mode)||!item.title?.trim())return {error:'Неверный формат или пустое название.'};
  let target=draft[draft.length-1],slot=-1;
  // Only reuse the last empty sheet, or free places in the last triple sheet.
  if(target&&!target.labels.some(l=>l?.title?.trim())){target.mode=mode;target.labels=[null,null,null];slot=0;}
  else if(mode==='triple'&&target?.mode==='triple')slot=target.labels.findIndex(l=>!l?.title?.trim());
  if(slot<0){if(draft.length>=120)return {error:'Превышен лимит 120 листов. Сохраните текущую партию и очистите готовые листы.'};target=newSheet(mode);draft.push(target);slot=0;addedPages++;}
  if(firstImported<0)firstImported=draft.length-1;
  target.labels[slot]={title:item.title,detail:item.detail||'',icon:item.icon||'auto',category:item.category||'',image:item.image||null};
 }
 return {draft,firstImported,addedPages,totalPages:draft.filter(s=>s.labels.some(l=>l?.title?.trim())).length};
}
function simulateBatch(items){const result=planBatch(items);return result.error?{error:result.error}:{addedPages:result.addedPages,totalPages:result.totalPages};}
function persistDraft(next){
 try{
  const payload=JSON.stringify({sheets:next,sheetIndex:state.sheetIndex,activeSlot:state.activeSlot,favorites:[...state.favorites],recent:state.recent});
  if(payload.length>3600000)throw Error('Слишком много картинок для локального хранилища. Разделите импорт на партии или уменьшите картинки.');
  localStorage.setItem('pp_labels_v3',payload);
  return null;
 }catch(e){return e.message.includes('Слишком много')?e.message:'Недостаточно места для сохранения. Сократите количество или размер изображений.';}
}
function appendBatch(items){
 const result=planBatch(items);if(result.error)return {error:result.error};
 // Persist once before swapping the in-memory state: failed imports cannot corrupt drafts.
 const beforeSheet=state.sheetIndex,beforeSlot=state.activeSlot;
 state.sheetIndex=result.firstImported;state.activeSlot=0;
 const error=persistDraft(result.draft);
 if(error){state.sheetIndex=beforeSheet;state.activeSlot=beforeSlot;return {error};}
 state.sheets=result.draft;state.manualSlot=false;refreshSheet();
 return {totalPages:result.totalPages,addedPages:result.addedPages};
}
function setCurrentImage(src){
 const s=sheet(),idx=s.mode==='triple'?state.activeSlot:0;
 const before=s.labels[idx];s.labels[idx]={...(before||{title:'',detail:'',icon:'auto',category:''}),image:src};
 const error=persistDraft(state.sheets);
 if(error){s.labels[idx]=before;return {error};}
 refreshSheet();return {ok:true};
}
function modeUpdate(mode){if(!['triple','portrait','landscape'].includes(mode))return;const s=sheet();if(s.mode===mode)return;
 if(s.mode==='triple'&&mode!=='triple'&&s.labels.filter(filled).length>1){addSheet(mode);toast('Создан новый лист — заполненный сохранён');return;}
 if(mode!=='triple'){const existing=s.labels.find(filled);s.labels=[existing||null,null,null];state.activeSlot=0;}
 s.mode=mode;save();refreshSheet();}
function moveSheet(i,d){const j=i+d;if(j<0||j>=state.sheets.length)return;[state.sheets[i],state.sheets[j]]=[state.sheets[j],state.sheets[i]];if(state.sheetIndex===i)state.sheetIndex=j;else if(state.sheetIndex===j)state.sheetIndex=i;save();refreshSheet();}
function deleteSheet(i){if(!state.sheets[i])return;destructive('Лист удалён',()=>{
 if(state.sheets.length===1){state.sheets=[newSheet(sheet().mode)];state.sheetIndex=0;}
 else{state.sheets.splice(i,1);if(i<state.sheetIndex)state.sheetIndex--;state.sheetIndex=Math.max(0,Math.min(state.sheetIndex,state.sheets.length-1));}
 state.activeSlot=0;state.manualSlot=false;
});}
function clearSlot(){if(!currentLabel())return;destructive('Наклейка очищена',()=>{sheet().labels[state.activeSlot]=null;});}
function clearSheet(){if(!sheetFilled(sheet()))return;destructive('Лист очищен',()=>{sheet().labels=[null,null,null];state.activeSlot=0;});}
function swapSlots(d){if(sheet().mode!=='triple')return;const i=state.activeSlot,j=i+d;if(j<0||j>2)return;[sheet().labels[i],sheet().labels[j]]=[sheet().labels[j],sheet().labels[i]];state.activeSlot=j;save();refreshSheet();}
function nextFree(){blurTextField();const s=sheet();if(s.mode!=='triple'){addSheet(s.mode);return;}const f=firstFree(s);if(f===-1){addSheet(s.mode);}else selectSlot(f);}
function duplicateSlot(){const l=currentLabel();if(!filled(l)){toast('Сначала заполни наклейку');return;}const copy={...l};const s=sheet();let index=-1;if(s.mode==='triple')index=s.labels.findIndex((v,i)=>i!==state.activeSlot&&!filled(v));if(index>=0){s.labels[index]=copy;state.activeSlot=index;save();refreshSheet();}else{addSheet(s.mode);fillSlot(copy,0,false);}toast('Наклейка продублирована');}
function clearAll(){if(countLabels()&&!confirm('Очистить все подготовленные листы? Действие можно отменить.'))return;destructive('Все листы очищены',()=>{state.sheets=[newSheet()];state.sheetIndex=0;state.activeSlot=0;});}
function newCustom(){const text=$('search').value.trim();if(!state.manualSlot&&filled(currentLabel())){const free=firstFree(sheet());if(free>=0)state.activeSlot=free;else addSheet(sheet().mode);}sheet().labels[state.activeSlot]={title:text,detail:'',icon:'auto',category:''};state.manualSlot=true;save();refreshSheet();mobileGoStudio();blurTextField();}
function dialogFocusable(){if(!activeDialog)return [];return [...activeDialog.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hidden&&el.getClientRects().length>0);}
function openDialog(id){
 const dialog=$(id);if(!dialog||!dialog.hidden)return;
 if(activeDialog)closeDialog(activeDialog.id);
 dialogOrigin=document.activeElement;blurTextField();activeDialog=dialog;dialog.hidden=false;
 previousInert=new Map();
 for(const el of document.body.children){if(el!==dialog&&el.tagName!=='SCRIPT'){previousInert.set(el,el.inert);el.inert=true;}}
 document.body.classList.add('dialog-open');
 const first=dialog.querySelector('.close-dialog')||dialogFocusable()[0];first?.focus({preventScroll:true});
}
function closeDialog(id){
 const dialog=$(id);if(!dialog||dialog.hidden)return;
 dialog.hidden=true;
 if(activeDialog!==dialog)return;
 for(const [el,value] of previousInert||[])el.inert=value;
 previousInert=null;activeDialog=null;document.body.classList.remove('dialog-open');
 if(dialogOrigin?.isConnected)dialogOrigin.focus({preventScroll:true});dialogOrigin=null;
}
function dialogKeys(e){
 if(!activeDialog)return;
 if(e.key==='Escape'){e.preventDefault();closeDialog(activeDialog.id);return;}
 if(e.key!=='Tab')return;
 const focusables=dialogFocusable();if(!focusables.length){e.preventDefault();return;}
 const first=focusables[0],last=focusables[focusables.length-1];
 if(e.shiftKey&&(document.activeElement===first||!activeDialog.contains(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!activeDialog.contains(document.activeElement))){e.preventDefault();first.focus();}
}
function renderIconGrid(q=''){const grid=$('iconGrid');grid.replaceChildren();for(const [key,name,aliases] of ICON_OPTIONS){if(q&&!norm(key+' '+name+' '+aliases).includes(norm(q)))continue;const b=document.createElement('button');b.type='button';b.className='icon-card';if(key!=='none')b.appendChild(iconThumbnail(key,37));else{const blank=document.createElement('div');blank.style.height='37px';blank.textContent='—';b.appendChild(blank);}const t=document.createElement('span');t.textContent=name;b.appendChild(t);b.addEventListener('click',()=>{$('iconSelect').value=key;syncEditor();closeDialog('iconDialog');});grid.appendChild(b);}if(!grid.childNodes.length)grid.textContent='Иконки не найдены';}
function drawIcon(g,name,x,y,s){if(name==='none')return;g.save();g.translate(x,y);g.scale(s/100,s/100);g.strokeStyle='#18231c';g.fillStyle='#18231c';g.lineWidth=5.5;g.lineCap='round';g.lineJoin='round';const line=(...points)=>{g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke()};const rect=(x,y,w,h,r=3)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.stroke()};const circle=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,2*Math.PI);g.stroke()};switch(name){
case 'kitchen':rect(-36,-12,72,50,8);line(-40,-15,40,-15);line(-18,-22,-10,-30,10,-30,18,-22);line(-27,40,-27,47);line(27,40,27,47);break;
case 'clothes':line(-21,-35,-40,-20,-30,3,-17,-5,-17,39,17,39,17,-5,30,3,40,-20,21,-35,12,-30,-12,-30,-21,-35);break;
case 'toy':rect(-36,-15,33,33,3);rect(4,-15,33,33,3);rect(-16,20,33,26,3);line(-20,-2,-20,7);line(20,-2,20,7);break;
case 'plug':line(-15,-40,-15,-12,15,-12,15,-40);line(-23,-12,23,-12);line(-23,-12,-23,0);g.beginPath();g.arc(0,0,23,Math.PI,0,true);g.stroke();line(0,23,0,41);break;
case 'clean':line(-31,-30,12,-30,12,-13,25,-13,25,40,-23,40,-23,-13,0,-13);line(-31,-30,-31,-18);line(-11,-39,17,-39);line(17,-39,17,-30);line(24,-35,36,-38);break;
case 'heart':g.beginPath();g.moveTo(0,33);g.bezierCurveTo(-54,8,-43,-35,-12,-29);g.bezierCurveTo(0,-26,0,-13,0,-13);g.bezierCurveTo(0,-13,0,-26,12,-29);g.bezierCurveTo(43,-35,54,8,0,33);g.stroke();break;
case 'document':rect(-29,-42,58,84,3);line(-16,-22,16,-22);line(-16,-6,16,-6);line(-16,10,14,10);line(-16,26,6,26);break;
case 'paw':for(const [px,py,r] of [[-25,-16,9],[-8,-31,9],[13,-31,9],[30,-14,9]])circle(px,py,r);g.beginPath();g.moveTo(-25,25);g.bezierCurveTo(-31,6,-13,1,0,7);g.bezierCurveTo(13,1,31,6,25,25);g.bezierCurveTo(20,42,7,34,0,32);g.bezierCurveTo(-7,34,-20,42,-25,25);g.stroke();break;
case 'star':{const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?18:42;pts.push(Math.cos(a)*r,Math.sin(a)*r);}line(...pts,...pts.slice(0,2));break;}
case 'tools':line(-38,30,16,-24);circle(-36,33,8);line(10,-31,24,-44,38,-33,27,-18,10,-31);break;
case 'food':rect(-27,-26,54,65,5);line(-28,-15,28,-15);line(-18,-4,12,-4);line(-18,9,8,9);line(-20,-33,20,-33);break;
case 'shoe':line(-39,12,-17,12,-9,-11,8,-1,18,10,35,16,39,30,-37,30,-39,12);line(-33,24,34,24);break;
case 'book':rect(-39,-35,37,72,4);rect(2,-35,37,72,4);line(0,-34,0,38);line(-28,-23,-12,-23);line(12,-23,29,-23);break;
case 'gift':rect(-40,-17,80,54,4);line(-43,-17,43,-17);line(0,-29,0,37);line(-43,-28,43,-28);g.beginPath();g.ellipse(-14,-35,16,8,.4,0,2*Math.PI);g.ellipse(14,-35,16,8,-.4,0,2*Math.PI);g.stroke();break;
case 'suitcase':rect(-38,-23,76,64,6);line(-15,-23,-15,-35,15,-35,15,-23);line(-21,-11,-21,30);line(21,-11,21,30);break;
default:rect(-38,-19,76,59,5);line(-38,-19,0,1,38,-19);line(0,1,0,40);line(-38,-19,-18,-39,18,-39,38,-19);}
g.restore();}
function textLines(g,text,maxW,maxLines,font,maxFont,minFont){const words=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);if(!words.length)return {lines:[],size:font};for(let size=maxFont;size>=minFont;size-=2){g.font=`750 ${size}px Arial, sans-serif`;const lines=[];let line='';let overflow=false;for(const w of words){let maybe=line?line+' '+w:w;if(g.measureText(maybe).width<=maxW){line=maybe;continue;}if(line){lines.push(line);line='';}if(g.measureText(w).width<=maxW){line=w;continue;}let part='';for(const c of [...w]){if(g.measureText(part+c).width>maxW&&part){lines.push(part);part=c;}else part+=c;}line=part;if(lines.length>maxLines){overflow=true;break;}}if(line)lines.push(line);if(!overflow&&lines.length<=maxLines)return {lines,size};}g.font=`750 ${minFont}px Arial, sans-serif`;const lines=[];let line='';for(const w of words){if(g.measureText(line?line+' '+w:w).width>maxW&&line){lines.push(line);line=w;}else line=line?line+' '+w:w;}if(line)lines.push(line);return {lines:lines.slice(0,maxLines),size:minFont};}
function drawLabel(g,label,x,y,w,h,mode){if(!label?.title?.trim())return;const title=label.title.trim().toLocaleUpperCase('ru-RU'), detail=(label.detail||'').trim();const icon=iconFor(label);const small=h<=340;const landscape=mode==='landscape';g.save();g.translate(x,y);g.fillStyle='#080c09';g.textBaseline='middle';
if(small){const haveIcon=icon!=='none',haveImage=!!label.image,haveGraphic=haveImage||haveIcon;if(haveImage){window.PPBulk?.preloadImage(label.image).catch(()=>{});window.PPBulk?.paintImage(g,label.image,70,h/2,100,120);}else if(haveIcon)drawIcon(g,icon,71,h/2,68);const tx=haveGraphic?137:30;const area=w-tx-28;const ft=textLines(g,title,area,4,48,50,19);const detailSize=24;const titleH=ft.lines.length*(ft.size*1.17);const groupH=titleH+(detail?detailSize*1.45+10:0);let ty=(h-groupH)/2+ft.size*.55;g.textAlign='left';g.font=`750 ${ft.size}px Arial, sans-serif`;ft.lines.forEach(t=>{g.fillText(t,tx,ty);ty+=ft.size*1.17});if(detail){g.fillStyle='#333b34';g.font=`400 ${detailSize}px Arial, sans-serif`;const subs=textLines(g,detail,area,2,detailSize,detailSize,17);subs.lines.forEach(t=>{g.fillText(t,tx,ty+4);ty+=detailSize*1.15});}}
else if(landscape){const haveIcon=icon!=='none',haveImage=!!label.image;if(haveImage){window.PPBulk?.preloadImage(label.image).catch(()=>{});window.PPBulk?.paintImage(g,label.image,170,h/2,235,230);}else if(haveIcon)drawIcon(g,icon,178,h/2,150);const tx=(haveIcon||haveImage)?320:60,area=w-tx-65;const ft=textLines(g,title,area,3,75,82,40);let groupH=ft.lines.length*ft.size*1.13+(detail?55:0);let ty=(h-groupH)/2+ft.size/2;g.font=`750 ${ft.size}px Arial, sans-serif`;g.textAlign='left';for(const t of ft.lines){g.fillText(t,tx,ty);ty+=ft.size*1.13;}if(detail){g.font='400 35px Arial, sans-serif';g.fillStyle='#343a35';g.fillText(detail.slice(0,80),tx,ty+12,area);}}
else{const haveIcon=icon!=='none',haveImage=!!label.image;if(haveImage){window.PPBulk?.preloadImage(label.image).catch(()=>{});window.PPBulk?.paintImage(g,label.image,w/2,h*.30,275,260);}else if(haveIcon)drawIcon(g,icon,w/2,h*.30,175);const ft=textLines(g,title,w-90,4,76,84,38);g.font=`750 ${ft.size}px Arial, sans-serif`;g.textAlign='center';let ty=h*((haveIcon||haveImage)?.54:.42)-(ft.lines.length-1)*ft.size*.56;for(const t of ft.lines){g.fillText(t,w/2,ty);ty+=ft.size*1.14;}if(detail){g.fillStyle='#323d35';g.font='400 35px Arial, sans-serif';const sub=textLines(g,detail,w-95,2,35,35,23);for(const t of sub.lines){g.fillText(t,w/2,ty+38);ty+=43;}}}
g.restore();}
function renderSurface(g,labels,mode,previewOnly=false){const isWide=mode==='landscape',width=isWide?H:W,height=isWide?W:H;g.fillStyle='white';g.fillRect(0,0,width,height);if(mode==='triple'){
 for(let i=0;i<3;i++){if(labels[i])drawLabel(g,labels[i],0,i*320,W,320,mode);else if(previewOnly){g.fillStyle='#8d7a68';g.textAlign='center';g.textBaseline='middle';g.font='500 29px Arial, sans-serif';g.fillText('НАКЛЕЙКА '+(i+1)+' · нажми для ввода',W/2,i*320+160);}}
 if(previewOnly){g.strokeStyle='#cfc8bb';g.setLineDash([9,9]);g.lineWidth=2;for(const y of [320,640]){g.beginPath();g.moveTo(5,y);g.lineTo(595,y);g.stroke();}g.setLineDash([]);}else{g.strokeStyle='#bdbdbd';g.lineWidth=1;g.setLineDash([9,9]);for(const y of [320,640]){g.beginPath();g.moveTo(2,y);g.lineTo(598,y);g.stroke();}g.setLineDash([]);}
 }else if(labels[0])drawLabel(g,labels[0],0,0,width,height,mode);else if(previewOnly){g.fillStyle='#b9b1a9';g.font='400 30px Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('Выбери или напиши название',width/2,height/2);}
}
function physicalPage(items,mode){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:false});if(mode==='landscape'){g.save();g.translate(W,0);g.rotate(Math.PI/2);renderSurface(g,items,mode,false);g.restore();}else renderSurface(g,items,mode,false);return c;}
const te=new TextEncoder();function ascii(s){return te.encode(s);}function buildPdf(canvases){const blobs=[],lengths=[];const objects=[];const pages=[];const positions=[];let pos=0;const push=(data)=>{const v=typeof data==='string'?ascii(data):data;blobs.push(v);pos+=v.length;};const obj=(n,body)=>{positions[n]=pos;push(`${n} 0 obj\n`);body();push('\nendobj\n');};const imgData=canvases.map(c=>{const data=c.toDataURL('image/jpeg',.99).split(',')[1];const bin=atob(data);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes;});const maxObj=2+canvases.length*3;
push('%PDF-1.4\n%PPWA\n');obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>push(`<< /Type /Pages /Count ${canvases.length} /Kids [${canvases.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`));for(let i=0;i<canvases.length;i++){const pid=3+i*3,contentId=pid+1,imageId=pid+2,c=canvases[i],jpeg=imgData[i];const pw=(MM.w*72/25.4).toFixed(4),ph=(MM.h*72/25.4).toFixed(4);obj(pid,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));const commands=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im0 Do\nQ\n`;obj(contentId,()=>{push(`<< /Length ${ascii(commands).length} >>\nstream\n`);push(commands);push('endstream');});obj(imageId,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);push('\nendstream');});}
const xref=pos;push(`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`);for(let i=1;i<=maxObj;i++)push(String(positions[i]).padStart(10,'0')+' 00000 n \n');push(`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(blobs,{type:'application/pdf'});}
function download(blob,filename){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();/* Safari may finish a blob download asynchronously. */setTimeout(()=>URL.revokeObjectURL(url),60000);}
function makeFilename(ext){return `По-полочкам_75x120_${new Date().toISOString().slice(0,10)}.${ext}`;}
async function pdfBlob(){const sheets=usableSheets();if(!sheets.length)throw Error('Нет заполненных наклеек');await Promise.all(sheets.flatMap(s=>s.labels.filter(x=>x?.image).map(x=>window.PPBulk.preloadImage(x.image))));return buildPdf(sheets.map(s=>physicalPage(s.labels,s.mode)));}
async function toPng(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('PNG не создан')),'image/png'));}
async function exportPdf(){try{download(await pdfBlob(),makeFilename('pdf'));toast('PDF подготовлен — открой его в Label Expert');}catch(e){toast(e.message);}}
async function exportPng(){try{if(!sheetFilled(sheet()))throw Error('Этот лист пуст');await Promise.all(sheet().labels.filter(x=>x?.image).map(x=>window.PPBulk.preloadImage(x.image)));const b=await toPng(physicalPage(sheet().labels,sheet().mode));download(b,makeFilename('png'));toast('PNG текущего листа сохранён');}catch(e){toast(e.message);}}
async function sharePdf(){try{const blob=await pdfBlob();const file=new File([blob],makeFilename('pdf'),{type:'application/pdf'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'По полочкам — наклейки'});}else{download(blob,file.name);toast('Поделиться недоступно — PDF скачан');}}catch(e){if(e.name!=='AbortError')toast(e.message);}}
function init(){
 restore();
 $('catalogCount').textContent=`${CATALOG.length} названий`;
 for(const [key,name] of ICON_OPTIONS){if(key==='auto'||key==='none')continue;const o=document.createElement('option');o.value=key;o.textContent=name;$('iconSelect').appendChild(o);}
 $('undoBtn').addEventListener('click',undoDestructive);
 document.querySelectorAll('#mobileNav button[data-view]').forEach(b=>b.addEventListener('click',()=>setMobileView(b.dataset.view,true)));
 $('openLibraryBtn').addEventListener('click',()=>setMobileView('library',true));
 $('openPrintBtn').addEventListener('click',()=>{if(onMobile())setMobileView('print',true);else {$('printTitle').scrollIntoView({behavior:'smooth',block:'start'});$('printTitle').focus({preventScroll:true});}});
 $('quickPdfBtn').addEventListener('click',exportPdf);
 document.addEventListener('keydown',dialogKeys,true);
 // Safari may restore focus on browser history navigation; don't restore the keyboard.
 window.addEventListener('pageshow',()=>blurTextField());
 $('search').addEventListener('input',e=>{state.query=e.target.value;renderLibrary();});
 $('combineBtn').addEventListener('click',combineMarked);
 $('customBtn').addEventListener('click',newCustom);
 $('titleInput').addEventListener('input',syncEditor);
 $('detailInput').addEventListener('input',syncEditor);
 $('iconSelect').addEventListener('change',syncEditor);
 $('pickIconBtn').addEventListener('click',()=>{renderIconGrid();$('iconSearch').value='';openDialog('iconDialog');});
 $('iconSearch').addEventListener('input',e=>renderIconGrid(e.target.value));
 $('closeIconBtn').addEventListener('click',()=>closeDialog('iconDialog'));
 $('helpBtn').addEventListener('click',()=>openDialog('helpDialog'));
 $('closeHelpBtn').addEventListener('click',()=>closeDialog('helpDialog'));
 for(const id of ['iconDialog','helpDialog'])$(id).addEventListener('click',e=>{if(e.target===$(id))closeDialog(id);});

 $('prevSheet').addEventListener('click',()=>goSheet(state.sheetIndex-1));
 $('nextSheet').addEventListener('click',()=>goSheet(state.sheetIndex+1));
 $('newSheet').addEventListener('click',()=>addSheet());
 $('deleteSheet').addEventListener('click',()=>deleteSheet(state.sheetIndex));
 $('duplicateSlot').addEventListener('click',duplicateSlot);
 $('moveUp').addEventListener('click',()=>swapSlots(-1));
 $('moveDown').addEventListener('click',()=>swapSlots(1));
 $('clearSlot').addEventListener('click',clearSlot);
 $('clearSheet').addEventListener('click',clearSheet);
 $('fillNext').addEventListener('click',nextFree);
 $('clearQueue').addEventListener('click',clearAll);
 $('pdfBtn').addEventListener('click',exportPdf);
 $('pngBtn').addEventListener('click',exportPng);
 $('shareBtn').addEventListener('click',sharePdf);
 document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>modeUpdate(b.dataset.mode)));
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false;});
 $('installBtn').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true;}});
 renderCategories();renderLibrary();refreshSheet();
 if(window.PPBulk)window.PPBulk.init({openDialog,closeDialog,simulate:simulateBatch,append:appendBatch,setImage:setCurrentImage,previewChanged:()=>renderPreview(),goStudio:mobileGoStudio,notify:toast});
 if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
init();
if(location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='about:')window.__PP_TEST__={state,physicalPage,pdfBlob,usableSheets,goSheet,applyLabel,modeUpdate,addSheet,selectSlot,fillSlot,clearAll,setMobileView,undoDestructive,appendBatch,simulateBatch};
})();

