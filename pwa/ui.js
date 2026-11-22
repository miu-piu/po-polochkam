/* По полочкам UI Kit v1 — single outline icon set; inlined, no CDN/offline safe.
   Geometric paths follow the MIT-licensed Lucide icon vocabulary. */
(()=>{
'use strict';
const icons={
 'layers-3':'<path d="m12.83 2.18 8 4a2 2 0 0 1 0 3.64l-8 4a2 2 0 0 1-1.66 0l-8-4a2 2 0 0 1 0-3.64l8-4a2 2 0 0 1 1.66 0Z"/><path d="m2 12 9.17 4.59a2 2 0 0 0 1.66 0L22 12"/><path d="m2 17 9.17 4.59a2 2 0 0 0 1.66 0L22 17"/>',
 'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
 'plus':'<path d="M12 5v14M5 12h14"/>',
 'star':'<path d="m12 2 3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77 5.82 21.01 7 14.13l-5-4.87 6.91-1L12 2Z"/>',
 'clock-3':'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 'chevron-left':'<path d="m15 18-6-6 6-6"/>',
 'chevron-right':'<path d="m9 18 6-6-6-6"/>',
 'arrow-up':'<path d="M12 19V5m-7 7 7-7 7 7"/>',
 'arrow-down':'<path d="M12 5v14m-7-7 7 7 7-7"/>',
 'x':'<path d="M18 6 6 18M6 6l12 12"/>',
 'trash-2':'<path d="M3 6h18m-2 0-1 14H6L5 6m3 0V4h8v2M10 10v7m4-7v7"/>',
 'copy':'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
 'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
 'share-2':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/>',
 'circle-help':'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3m0 4h.01"/>',
 'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
 'printer':'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
 'image':'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
 'check':'<path d="m20 6-11 11-5-5"/>',
 'package':'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/>',
 'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 'list-plus':'<path d="M3 6h9M3 12h9M3 18h9M18 9v6m-3-3h6"/>',
 'upload':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
 'pencil':'<path d="m15 5 4 4M4 20l4.5-1 11-11a2.83 2.83 0 0 0-4-4l-11 11L4 20Z"/>',
 'arrow-up-down':'<path d="M7 15V3m-4 4 4-4 4 4M17 9v12m-4-4 4 4 4-4"/>',
 'panels-top-left':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/>'
};
const NS='http://www.w3.org/2000/svg';
function icon(name,size=20){const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width',size);svg.setAttribute('height',size);svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('class','ui-icon');svg.setAttribute('aria-hidden','true');svg.innerHTML=icons[name]||icons.package;return svg;}
function decorate(root=document){const nodes=[];if(root.nodeType===1&&root.hasAttribute('data-icon')&&!root.hasAttribute('data-icon-ready'))nodes.push(root);if(root.querySelectorAll)nodes.push(...root.querySelectorAll('[data-icon]:not([data-icon-ready])'));for(const el of nodes){el.setAttribute('data-icon-ready','');el.prepend(icon(el.getAttribute('data-icon'),Number(el.getAttribute('data-icon-size')||20)));}}
function init(){decorate();const observer=new MutationObserver(ms=>{for(const m of ms)for(const node of m.addedNodes)if(node.nodeType===1)decorate(node);});observer.observe(document.body,{childList:true,subtree:true});}
window.PP_UI={icon,decorate};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

