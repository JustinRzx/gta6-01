import {blocked} from './city.js';
import {clamp,distance} from './config.js';
import {addCrime} from './wanted.js';
export function drive(s,input,dt){const c=s.player.car;if(!c)return;
 const throttle=(input.down('w','arrowup')?1:0)-(input.down('s','arrowdown')?1:0);
 c.speed+=throttle*(c.speed*throttle<0?330:180)*dt;c.speed*=Math.pow(input.down(' ')?0.08:throttle?0.97:0.5,dt);c.speed=clamp(c.speed,-95,480);
 const steer=(input.down('d','arrowright')?1:0)-(input.down('a','arrowleft')?1:0);c.angle+=steer*clamp(c.speed/140,-1,1)*1.8*dt;
 const nx=c.x+Math.cos(c.angle)*c.speed*dt,ny=c.y+Math.sin(c.angle)*c.speed*dt;
 if(blocked(s.city,nx,ny,49)){if(Math.abs(c.speed)>130)s.health-=Math.min(12,Math.abs(c.speed)*.015);c.speed=-c.speed*.12;}else{c.x=nx;c.y=ny;}
 for(const o of s.cars)if(o!==c&&distance(c,o)<110){if(Math.abs(c.speed)>80&&o.type==='police')addCrime(s,2);const a=Math.atan2(c.y-o.y,c.x-o.x);c.x+=Math.cos(a)*3;c.y+=Math.sin(a)*3;o.speed*=.8;c.speed*=.95;}
 for(const p of s.people)if(!p.down&&distance(c,p)<58&&Math.abs(c.speed)>85){p.down=7;addCrime(s,1);s.health=Math.max(0,s.health-1);}
}
