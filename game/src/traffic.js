import {STEP,WORLD,distance} from './config.js';
export function updateTraffic(s,dt){
 for(const c of s.cars){if(c===s.player.car||c.type==='police'||c.type==='parked'||c.type==='player')continue;
 const dx=Math.cos(c.angle),dy=Math.sin(c.angle);let stop=false;
 for(const o of s.cars){if(c===o)continue;const xx=o.x-c.x,yy=o.y-c.y,along=xx*dx+yy*dy,cross=Math.abs(xx*dy-yy*dx);if(along>0&&along<195&&cross<69){stop=true;break;}}
 const axis=Math.abs(dx)>.5?c.x:c.y,near=((axis%STEP)+STEP)%STEP;const approach=dx+dy>0?near>STEP-205&&near<STEP-80:near<205&&near>80;
 if(approach){const junction={x:Math.round(c.x/STEP)*STEP,y:Math.round(c.y/STEP)*STEP};for(const o of s.cars)if(o!==c&&Math.abs(Math.sin(o.angle-c.angle))>.5&&distance(o,junction)<180){stop=true;break;}}
 c.speed+=( (stop?0:100)-c.speed)*Math.min(1,dt*4);let nx=c.x+dx*c.speed*dt,ny=c.y+dy*c.speed*dt;
 if(nx<80)nx=WORLD-130;if(nx>WORLD-80)nx=130;if(ny<80)ny=WORLD-130;if(ny>WORLD-80)ny=130;
 if(!s.cars.some(o=>o!==c&&Math.hypot(o.x-nx,o.y-ny)<115)){c.x=nx;c.y=ny;}else c.speed=0;
 }
}
