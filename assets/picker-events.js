// Scroll and viewport changes can be caused by the same click that opens a
// picker. They must only reposition it; outside pointer presses dismiss it.
export function installPickerEvents({document,window,getActive,close,reposition}){
  const pointer=e=>{const active=getActive();if(active&&!active.row.contains(e.target))close();};
  const scroll=e=>{const active=getActive();if(active&&!active.panel.contains(e.target))reposition();};
  const resize=()=>{if(getActive())reposition();};
  document.addEventListener('pointerdown',pointer,{capture:true});
  document.addEventListener('scroll',scroll,{capture:true});
  window.addEventListener('resize',resize);
  window.visualViewport?.addEventListener('resize',resize);
  window.visualViewport?.addEventListener('scroll',resize);
  return ()=>{
    document.removeEventListener('pointerdown',pointer,{capture:true});
    document.removeEventListener('scroll',scroll,{capture:true});
    window.removeEventListener('resize',resize);
    window.visualViewport?.removeEventListener('resize',resize);
    window.visualViewport?.removeEventListener('scroll',resize);
  };
}
