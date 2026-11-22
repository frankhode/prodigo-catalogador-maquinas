import test from 'node:test';import assert from 'node:assert/strict';
import {installPickerEvents} from '../assets/picker-events.js';
function setup(){
  const document=new EventTarget(),window=new EventTarget();window.visualViewport=new EventTarget();
  const field={},panel={},outside={};let active={row:{contains:target=>target===field||target===panel},panel:{contains:target=>target===panel}},closed=0,repositioned=0;
  const cleanup=installPickerEvents({document,window,getActive:()=>active,close:()=>{closed++;active=null;},reposition:()=>repositioned++});
  const send=(type,target)=>{const event=new Event(type);Object.defineProperty(event,'target',{value:target});document.dispatchEvent(event);};
  return {document,window,field,panel,outside,cleanup,send,get closed(){return closed;},get repositioned(){return repositioned;}};
}
test('dialog scroll generated while opening repositions the picker without dismissing it',()=>{const x=setup();x.send('scroll',x.outside);assert.equal(x.closed,0);assert.equal(x.repositioned,1);x.send('pointerdown',x.field);assert.equal(x.closed,0);});
test('mobile keyboard and viewport resize keep the picker open',()=>{const x=setup();x.window.dispatchEvent(new Event('resize'));x.window.visualViewport.dispatchEvent(new Event('resize'));x.window.visualViewport.dispatchEvent(new Event('scroll'));assert.equal(x.closed,0);assert.equal(x.repositioned,3);});
test('scroll inside options stays independent and outside click still dismisses',()=>{const x=setup();x.send('scroll',x.panel);x.send('pointerdown',x.panel);assert.equal(x.closed,0);assert.equal(x.repositioned,0);x.send('pointerdown',x.outside);assert.equal(x.closed,1);x.send('scroll',x.outside);assert.equal(x.repositioned,0);});
test('event handlers can be disposed without retaining previous pickers',()=>{const x=setup();x.cleanup();x.send('pointerdown',x.outside);x.window.dispatchEvent(new Event('resize'));assert.equal(x.closed,0);assert.equal(x.repositioned,0);});
