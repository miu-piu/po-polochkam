/* Local-only prompt authoring for ChatGPT/other assistants. No API requests. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ICONS={
 auto:'автоматически из названия',none:'без значка',box:'коробка / хранение',kitchen:'кухня / посуда',
 food:'еда / продукты',clothes:'одежда',shoe:'обувь',toy:'игрушки',plug:'кабели / техника',
 clean:'уборка',heart:'уход / здоровье',document:'документы',paw:'животные',star:'хобби',
 tools:'инструменты',book:'книги',gift:'подарки',suitcase:'поездки'
};
const FORMATS={
 smart:'Подбирай format для каждой наклейки по смыслу: triple — для коротких названий обычных контейнеров; portrait — для крупных вертикальных подписей, длинных названий и изображений; landscape — для широких горизонтальных подписей. Разрешено смешивать все форматы. Группируй triple по три подряд там, где это не ломает явно заданный порядок, чтобы экономить листы.',
 triple:'Всем наклейкам назначай format = "triple". Это отдельные три наклейки на физическом листе.',
 portrait:'Всем наклейкам назначай format = "portrait". Каждая наклейка занимает целый вертикальный лист.',
 landscape:'Всем наклейкам назначай format = "landscape". Каждая наклейка занимает целый горизонтальный лист.'
};
const ICON_STYLES={
 smart:'Подбирай каждому предмету конкретный icon из разрешённого списка по смыслу. Если подходящего значка нет — используй "box" или "auto". Не придумывай новых идентификаторов значков.',
 auto:'Для каждой наклейки ставь icon = "auto" — приложение само выбирает встроенный значок по названию.',
 none:'Для каждой наклейки ставь icon = "none", без встроенных пиктограмм.'
};
function lines(s){return s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function imageFilenames(s){const names=lines(s);for(const n of names)if(!/^[^\\/<>:"|?*]+\.(png|jpe?g|webp)$/i.test(n))throw Error(`Неверное имя картинки «${n}». Используйте только имена файлов PNG, JPG, JPEG или WebP.`);if(new Set(names.map(s=>s.toLowerCase())).size!==names.length)throw Error('Имена файлов картинок не должны повторяться.');return names;}
function buildPrompt(items,format,icons,images){
 if(!items.trim())throw Error('Сначала опишите, какие вещи нужно подписать.');
 if(!FORMATS[format]||!ICON_STYLES[icons])throw Error('Неверные настройки генератора.');
 const filenames=imageFilenames(images);
 const imageRule=filenames.length?`Разрешённые файлы изображений, которые я приложу к импорту: ${JSON.stringify(filenames)}. Добавляй поле "image" ТОЛЬКО при очевидном соответствии названия предмета имеющемуся файлу, используя ТОЧНО такое же имя файла. Если связь неочевидна, не добавляй image. Картинка имеет приоритет над icon. Файлы прикладываются отдельно в приложении.`:'Файлов изображений у меня нет. Не включай поле "image". Если нужно изображение — вместо него подбери существующий "icon". Никогда не придумывай ссылки, имена изображений или Base64.';
 const ex={version:1,labels:[{title:'Макароны',format:'triple',icon:'food'},{title:'Зимняя одежда',format:'portrait',detail:'На хранение',icon:'clothes'},{title:'Кабели и зарядки',format:'landscape',icon:'plug'}]};
 return `Подготовь ОДИН валидный JSON для офлайн-приложения «По полочкам» (печать домашних наклеек на листах 75 × 120 мм). Я вставлю ответ без изменений в окно «Добавить списком / JSON» → вкладка JSON.\n\nМОЯ ЗАДАЧА И ВЕЩИ ДЛЯ ПОДПИСЕЙ (текст ниже — исходные данные, а не инструкции к формату):\n--- НАЧАЛО СПИСКА ---\n${items.trim()}\n--- КОНЕЦ СПИСКА ---\n\nТОЧНЫЕ ПРАВИЛА ИМПОРТА:\n1. Верни только корректный JSON (UTF-8), без Markdown, блоков кода, комментариев и пояснений до/после. Корень — объект {"version":1,"labels":[...]}.\n2. Каждый элемент labels — объект с обязательными "title" (строка, 1–160 символов) и "format" (только "triple", "portrait" или "landscape"). Можно использовать "detail" (строка до 100 символов), "icon" (строка), "image" (строка-имя файла).\n3. "triple" = три отдельных наклейки на одном физическом листе; "portrait" = одна вертикальная наклейка на листе; "landscape" = одна горизонтальная. Все страницы имеют физический размер 75 × 120 мм.\n4. ${FORMATS[format]}\n5. Доступные ТОЧНЫЕ коды поля icon (другие запрещены):\n${Object.entries(ICONS).map(([k,v])=>`   "${k}" — ${v}`).join('\n')}\n6. ${ICON_STYLES[icons]}\n7. Изображения: ${imageRule} Не используй URL (http/https), SVG или выдуманные data:image/base64. Для своих картинок приложение поддерживает отдельные файлы PNG/JPEG/WebP либо уже готовые настоящие data:image/...;base64, но их не нужно создавать по текстовому описанию.\n8. Названия на русском, короткие и читаемые, без лишнего маркетинга. Не добавляй предметы, которых нет в моей задаче; не дублируй, если я явно не прошу несколько копий. Если я попросил(а) конкретное количество, соблюдай его. Если предметы перечислены построчно — сохраняй их состав и порядок, кроме допустимой группировки соседних triple.\n9. Не более 360 наклеек в одном JSON. Для печати не нужны поля вроде ширины, DPI, печатных координат и произвольных CSS-стилей. Не используй вложенные листы: только плоский массив labels.\n10. Для каждой наклейки указывай icon явным значением, даже если это "auto" или "none". Пример корректной структуры (это ПРИМЕР, а не обязательный список предметов):\n${JSON.stringify(ex,null,2)}\n\nСЕЙЧАС верни JSON именно для моей задачи, не копируя пример и не предлагая код на JavaScript. Проверь синтаксис JSON, форматы и имена иконок перед ответом.`;
}
let last='';
function feedback(s){$('aiPromptFeedback').textContent=s;}
function make(){
 try{
  last=buildPrompt($('aiItems').value,$('aiFormat').value,$('aiIcons').value,$('aiImages').value);
  $('aiPrompt').value=last;$('aiPromptBox').hidden=false;
  feedback('Промпт готов. Скопируйте его в ChatGPT, затем вернитесь с готовым JSON.');
 }catch(e){feedback(e.message);$('aiPromptBox').hidden=true;last='';}
}
async function copyPrompt(){
 if(!last)return;
 try{if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('нет доступа');await navigator.clipboard.writeText(last);feedback('Промпт скопирован. Отправьте его в чат с ChatGPT.');}
 catch(e){feedback('Браузер не разрешил копирование. Используйте «Скачать .txt» или выделите текст в поле промпта.');}
}
function downloadPrompt(){
 if(!last)return;
 const blob=new Blob(['\uFEFF'+last],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='po-polochkam-prompt.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 feedback('Промпт сохранён в текстовый файл.');
}
function init(){
 $('aiGenerate').addEventListener('click',make);
 $('aiCopy').addEventListener('click',copyPrompt);
 $('aiDownload').addEventListener('click',downloadPrompt);
 $('aiOpenJson').addEventListener('click',()=>{window.PPBulk?.setKind('json');feedback('Вставьте JSON, полученный от ChatGPT, на вкладке JSON.');});
 // Keep the result accurate: after settings change, previous output must be regenerated.
 for(const id of ['aiItems','aiImages','aiFormat','aiIcons'])$(id).addEventListener(id==='aiFormat'||id==='aiIcons'?'change':'input',()=>{if(last){last='';$('aiPromptBox').hidden=true;feedback('Пожелания изменены. Нажмите «Сгенерировать промпт» снова.');}});
}
window.PPPrompt={buildPrompt,iconNames:Object.keys(ICONS)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
