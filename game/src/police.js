import {STEP,position,distance} from './config.js';
import {makeCar} from './vehicles.js';
import {blocked} from './city.js';
export function updatePolice(s,dt){const p=position(s);const cops=s.cars.filter(c=>c.type==='police'&&c!==s.player.car);
 if(s.wanted&&cops.length<s.wanted+1){const horizontal=Math.abs(Math.cos(p.angle))>.6;const x=horizontal?p.x-650:Math.round(p.x/STEP)*STEP-44,y=horizontal?Math.round(p.y/STEP)*STEP+44:p.y-650;if(!s.cars.some(c=>distance(c,{x,y})<160))s.cars.push(makeCar(x,y,p.angle,'police'));}
 for(const c of cops){if(!s.wanted){c.speed*=.96;continue;}let tx=p.x,ty=p.y;const onHorizontal=Math.abs(c.y-Math.round(c.y/STEP)*STEP)<95;const onVertical=Math.abs(c.x-Math.round(c.x/STEP)*STEP)<95;
 if(onHorizontal&&!onVertical)ty=Math.round(c.y/STEP)*STEP+44;if(onVertical&&!onHorizontal)tx=Math.round(c.x/STEP)*STEP-44;
 const target=Math.atan2(ty-c.y,tx-c.x),diff=Math.atan2(Math.sin(target-c.angle),Math.cos(target-c.angle));c.angle+=Math.max(-dt*1.7,Math.min(dt*1.7,diff));c.speed+=(Math.min(340,70+distance(c,p)*.45)-c.speed)*dt;
 let stop=s.cars.some(o=>o!==c&&distance(o,c)<145&&(o.x-c.x)*Math.cos(c.angle)+(o.y-c.y)*Math.sin(c.angle)>0);if(stop)c.speed*=Math.pow(.1,dt);
 const x=c.x+Math.cos(c.angle)*c.speed*dt,y=c.y+Math.sin(c.angle)*c.speed*dt;if(!blocked(s.city,x,y,46)){c.x=x;c.y=y;}else{c.angle+=dt*2;c.speed=25;}
 if(distance(c,p)<115){s.health-=dt*3;}
 }
}
