export function createInput(canvas,onInteract){
 const keys=new Set(),pressed=new Set();let mouse={x:640,y:360};
 addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const k=e.key.toLowerCase();if(!keys.has(k))pressed.add(k);keys.add(k);onInteract();});
 addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 addEventListener('blur',()=>keys.clear());
 canvas.addEventListener('pointerdown',()=>{pressed.add('click');onInteract();});
 canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse={x:(e.clientX-r.left)*1280/r.width,y:(e.clientY-r.top)*720/r.height};});
 return {keys,pressed,get mouse(){return mouse;},down(...a){return a.some(k=>keys.has(k));},take(k){return pressed.delete(k);},clear(){pressed.clear();}};
}
