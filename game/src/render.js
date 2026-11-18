import {STEP,ROAD,WORLD} from './config.js';
import {visible} from './camera.js';
import {drawCar,drawPerson,shadow} from './sprites.js';
import {missionTarget} from './missions.js';
import {drawHUD,drawMenu} from './hud.js';
export function createRenderer(canvas,assets){const c=canvas.getContext('2d');const road=c.createPattern(assets.road,'repeat'),pavement=c.createPattern(assets.pavement,'repeat');
 function tree(x,y,r){shadow(c,x,y,r,r*.6);c.fillStyle='#294e40';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='#3f6d4b';c.beginPath();c.arc(x-5,y-6,r*.78,0,7);c.fill();c.fillStyle='#63814f';c.beginPath();c.arc(x-9,y-10,r*.4,0,7);c.fill();}
 return s=>{c.clearRect(0,0,1280,720);c.save();c.translate(-s.camera.x,-s.camera.y);c.fillStyle=pavement;c.fillRect(0,0,WORLD,WORLD);
 // The texture carries the asphalt grain; painted lane dashes establish travel directions.
 c.fillStyle=road;for(let i=0;i<=8;i++){c.fillRect(i*STEP-95,0,190,WORLD);c.fillRect(0,i*STEP-95,WORLD,190);}
 c.fillStyle='#23333777';for(let i=0;i<=8;i++){c.fillRect(i*STEP-95,0,190,WORLD);c.fillRect(0,i*STEP-95,WORLD,190);}
 for(let y=0;y<=8;y++)for(let x=0;x<=8;x++){const xx=x*STEP,yy=y*STEP;if(!visible(s,{x:xx,y:yy},200))continue;c.fillStyle='#424c4b';c.fillRect(xx-94,yy-94,188,188);c.fillStyle='#e3ddc4b0';for(let n=-75;n<80;n+=25){c.fillRect(xx+n,yy-119,13,23);c.fillRect(xx+n,yy+96,13,23);c.fillRect(xx-119,yy+n,23,13);c.fillRect(xx+96,yy+n,23,13);}c.fillStyle='#e3b875';for(const a of [-1,1]){c.fillRect(xx+a*108-4,yy-128,8,22);c.fillStyle='#1d3437';c.fillRect(xx+a*108-5,yy-126,10,14);c.fillStyle='#78c5a0';c.fillRect(xx+a*108-2,yy-124,4,4);}}
 for(const b of s.city.blocks){if(!visible(s,{x:b.x+b.w/2,y:b.y+b.h/2},300))continue;if(b.kind==='park'){c.fillStyle='#53734c';c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle='#c1b89a';c.fillRect(b.x+b.w/2-16,b.y,32,b.h);c.fillRect(b.x,b.y+b.h/2-15,b.w,30);c.fillStyle='#6f9690';c.beginPath();c.ellipse(b.x+b.w*.73,b.y+b.h*.7,54,38,0,0,7);c.fill();for(const t of b.trees)tree(t.x,t.y,t.r);}if(b.kind==='parking'){c.fillStyle='#53605e';c.fillRect(b.x,b.y,b.w,b.h);c.strokeStyle='#d6d0af';c.lineWidth=2;for(let i=0;i<6;i++){c.strokeRect(b.x+12+i*52,b.y+15,48,100);c.strokeRect(b.x+12+i*52,b.y+b.h-115,48,100);}c.font='bold 36px Arial';c.fillStyle='#c6d3c1';c.fillText('P',b.x+b.w/2-12,b.y+b.h/2+12);}}
  for(const b of s.city.buildings){if(!visible(s,{x:b.x+b.w/2,y:b.y+b.h/2},350))continue;c.fillStyle='#101f285c';c.fillRect(b.x+15,b.y+20,b.w+12,b.h+12);c.fillStyle='#344b52';c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle=b.color;c.fillRect(b.x-6,b.y-8,b.w,b.h);c.fillStyle='#243b43';for(let i=0;i<3;i++){c.fillRect(b.x+24+i*44,b.y+28,28,38);c.fillStyle='#91b5b2';c.fillRect(b.x+27+i*44,b.y+31,22,29);c.fillStyle='#243b43';}c.fillStyle='#35494b';c.fillRect(b.x+b.w-76,b.y+b.h-81,52,50);c.font='bold 13px Arial';c.fillStyle='#d7ded1';c.fillText(b.label,b.x+22,b.y+b.h-28);c.fillStyle='#bf8f5b';c.fillRect(b.x+20,b.y+b.h-5,80,12);}
 // Street furniture adds useful scale without obscuring the pavement walkers.
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){const x=col*STEP+285,y=row*STEP+139;if(!visible(s,{x,y},160))continue;c.fillStyle='#445c57';c.fillRect(x,y-9,55,12);c.fillStyle='#b8a57c';for(let n=0;n<3;n++)c.fillRect(x,y-9+n*4,55,2);c.fillStyle='#244a4b';c.fillRect(x+95,y-24,19,28);c.fillStyle='#a6d8d0';c.fillRect(x+99,y-21,11,14);}
 c.fillStyle='#c6d3cb88';c.font='bold 13px Arial';for(let row=1;row<8;row++){c.fillText(['','CALDER STREET','ASTER BOULEVARD','MERCURY AVENUE','PORT ROAD'][row%4]||'WESTERN AVENUE',s.camera.x+570,row*STEP-72);}
 const target=missionTarget(s);if(visible(s,target,100)){const pulse=1+Math.sin(s.time*3)*.08;c.save();c.translate(target.x,target.y);c.shadowColor='#ffc653';c.shadowBlur=28;c.strokeStyle='#ffdb80';c.lineWidth=4;c.beginPath();c.ellipse(0,0,49*pulse,28*pulse,0,0,7);c.stroke();c.fillStyle='#ffcd5b2a';c.fill();c.translate(0,-57);c.rotate(Math.PI/4);c.fillStyle='#ffcf66';c.fillRect(-13,-13,26,26);c.restore();}
 const entities=[...s.cars.filter(p=>visible(s,p)),...s.people.filter(p=>visible(s,p,30))];if(!s.player.car)entities.push({...s.player,player:true});entities.sort((a,b)=>a.y-b.y);for(const p of entities){if(p.length)drawCar(c,assets,p,s.time);else drawPerson(c,assets,p,p.player);}
 if(s.punch>0){c.strokeStyle='#ffe7a9';c.lineWidth=6;c.beginPath();c.arc(s.player.x,s.player.y,42,s.player.angle-.6,s.player.angle+.6);c.stroke();}c.restore();
 // A subtle edge vignette keeps the street at the centre of attention.
 const v=c.createRadialGradient(640,340,280,640,340,790);v.addColorStop(0,'#071a2100');v.addColorStop(1,'#071a214f');c.fillStyle=v;c.fillRect(0,0,1280,720);drawHUD(c,s);if(s.paused||!s.started)drawMenu(c,s);
 };
}
