import {installPickerEvents} from './picker-events.js?v=1.3.0';
import {matchingTerms,termKey} from './vocabulary.js?v=1.6.1';
let activePicker=null,initialized=false,layoutFrame=0;
function repositionPicker(){
  if(layoutFrame||!activePicker)return;
  layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;activePicker?.position();});
}
function initializeDismiss(){
  if(initialized)return;initialized=true;
  installPickerEvents({document,window,getActive:()=>activePicker,close:closePicker,reposition:repositionPicker});
}
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export function closePicker(){activePicker?.close();}
// A picker supplements the original input, preserving multiline editing and Enter navigation.
export function attachCombo(input,{label,getOptions,onChange}){
  initializeDismiss();
  input.removeAttribute('list');
  const row=el('div','combo-row');input.replaceWith(row);row.append(input);
  const toggle=el('button','combo-toggle','⌄');toggle.type='button';toggle.setAttribute('aria-label',`Elegir ${label}`);toggle.title=`Buscar o agregar: ${label}`;toggle.setAttribute('aria-haspopup','listbox');toggle.setAttribute('aria-expanded','false');row.append(toggle);
  const panel=el('div','value-picker');panel.id=`${input.id}-picker`;panel.setAttribute('popover','auto');toggle.setAttribute('aria-controls',panel.id);
  const heading=el('div','picker-heading',label);const search=el('input','picker-search');search.type='search';search.placeholder='Buscar o escribir una opción nueva…';search.setAttribute('aria-label',`Buscar opciones para ${label}`);search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-expanded','false');search.autocomplete='off';
  const list=el('div','picker-options');list.id=`${panel.id}-options`;list.setAttribute('role','listbox');list.setAttribute('aria-label',`Opciones para ${label}`);search.setAttribute('aria-controls',list.id);
  const status=el('p','picker-status');status.setAttribute('role','status');const help=el('p','picker-help','Enter: elegir · Esc: cerrar · Las opciones nuevas se conservan al guardar la ficha.');
  panel.append(heading,search,list,status,help);row.append(panel);
  let opened=false,buttons=[],active=-1;
  const setActive=index=>{active=index;buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===index)));if(buttons[index]){search.setAttribute('aria-activedescendant',buttons[index].id);buttons[index].scrollIntoView({block:'nearest'});}else search.removeAttribute('aria-activedescendant');};
  const finish=()=>{opened=false;toggle.setAttribute('aria-expanded','false');search.setAttribute('aria-expanded','false');if(activePicker?.panel===panel)activePicker=null;};
  function close(){if(!opened)return;if(typeof panel.hidePopover==='function')panel.hidePopover();else panel.hidden=true;finish();}
  function choose(value){input.value=value;onChange(value);close();input.focus({preventScroll:true});}
  function draw(){
    const options=getOptions(),query=search.value.trim(),matches=matchingTerms(options,query),exact=options.find(v=>termKey(v)===termKey(query));
    buttons=[];list.replaceChildren();
    const add=(text,value,cls='')=>{const b=el('button',`picker-option ${cls}`,text);b.type='button';b.tabIndex=-1;b.id=`${panel.id}-option-${buttons.length}`;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.title=value;b.onclick=()=>choose(value);buttons.push(b);list.append(b);};
    matches.slice(0,80).forEach(v=>add(v,v));
    if(query&&!exact)add(`＋ Agregar «${query}»`,query,'picker-create');
    add('Vaciar campo','','picker-clear');
    status.textContent=matches.length?`${matches.length} opciones${matches.length>80?' · Se muestran las primeras 80; afiná la búsqueda.':''}`:(query?'No hay opciones coincidentes. Podés agregar la que escribiste.':'Todavía no hay opciones. Escribí para agregar la primera.');
    setActive(-1);
  }
  function position(){
    const rect=row.getBoundingClientRect(),viewport=window.visualViewport,viewportLeft=viewport?.offsetLeft||0,viewportTop=viewport?.offsetTop||0,viewportWidth=viewport?.width||window.innerWidth,viewportHeight=viewport?.height||window.innerHeight,width=Math.min(Math.max(rect.width,300),viewportWidth-24),height=Math.min(365,viewportHeight-24);
    panel.style.width=`${width}px`;panel.style.maxHeight=`${height}px`;panel.style.left=`${Math.max(viewportLeft+12,Math.min(rect.left,viewportLeft+viewportWidth-width-12))}px`;
    const actual=panel.getBoundingClientRect().height||height;panel.style.top=`${Math.max(viewportTop+12,Math.min(rect.bottom+6,viewportTop+viewportHeight-actual-12))}px`;
  }
  function open(){
    if(input.readOnly||input.disabled)return;closePicker();opened=true;activePicker={panel,row,close,position};search.value='';draw();
    if(typeof panel.showPopover==='function')panel.showPopover();else panel.hidden=false;
    toggle.setAttribute('aria-expanded','true');search.setAttribute('aria-expanded','true');position();search.focus({preventScroll:true});
  }
  if(typeof panel.showPopover!=='function')panel.hidden=true;
  toggle.disabled=input.readOnly||input.disabled;
  toggle.onclick=()=>opened?close():open();
  search.oninput=()=>{draw();position();};
  search.onkeydown=e=>{
    if(e.isComposing)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();input.focus({preventScroll:true});}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();setActive(active<0?(e.key==='ArrowDown'?0:buttons.length-1):(active+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length);}
    else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(active>=0)buttons[active]?.click();else if(search.value.trim()){const exact=getOptions().find(v=>termKey(v)===termKey(search.value));choose(exact||matchingTerms(getOptions(),search.value)[0]||search.value.trim());}else if(buttons.length>1)buttons[0].click();}
    else if(e.key==='Tab')close();
  };
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&(e.altKey||input.tagName!=='TEXTAREA')){e.preventDefault();e.stopPropagation();open();}});
  panel.addEventListener('toggle',e=>{if(e.newState==='closed'&&!panel.matches(':popover-open'))finish();});
  // Native popovers close on outside clicks and when another picker opens.
  return {close,refresh(){toggle.disabled=input.readOnly||input.disabled;if(opened){draw();position();}}};
}
