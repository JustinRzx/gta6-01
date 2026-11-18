import {STEP,position} from './config.js';
import {missionTarget} from './missions.js';
export function drawMinimap(ctx,s){const x=1038,y=493,w=214,h=194,scale=.105,p=position(s);ctx.save();ctx.fillStyle='#091b25ed';ctx.fillRect(x,y,w,h);ctx.beginPath();ctx.rect(x+5,y+5,w-10,h-10);ctx.clip();const mx=v=>x+w/2+(v-p.x)*scale,my=v=>y+h/2+(v-p.y)*scale;
 ctx.fillStyle='#1e3540';for(const b of s.city.blocks)ctx.fillRect(mx(b.x),my(b.y),b.w*scale,b.h*scale);
 ctx.strokeStyle='#a4bdc3';ctx.lineWidth=4;for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(mx(i*STEP),y);ctx.lineTo(mx(i*STEP),y+h);ctx.stroke();ctx.beginPath();ctx.moveTo(x,my(i*STEP));ctx.lineTo(x+w,my(i*STEP));ctx.stroke();}
 for(const c of s.cars)if(c.type==='police'){ctx.fillStyle='#ff4e65';ctx.beginPath();ctx.arc(mx(c.x),my(c.y),4,0,7);ctx.fill();}
 const t=missionTarget(s);ctx.fillStyle='#ffd36a';ctx.save();ctx.translate(Math.max(x+12,Math.min(x+w-12,mx(t.x))),Math.max(y+12,Math.min(y+h-12,my(t.y))));ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.restore();
 ctx.translate(x+w/2,y+h/2);ctx.rotate(p.angle);ctx.fillStyle='#83ffe6';ctx.strokeStyle='#07141e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-8,-7);ctx.lineTo(-4,0);ctx.lineTo(-8,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.strokeStyle='#81979a';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);}
