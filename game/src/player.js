import {blocked} from './city.js';
import {distance} from './config.js';
import {addCrime} from './wanted.js';
export function updatePlayer(s,input,dt){const p=s.player;
 if(input.take('e')){if(p.car){const c=p.car;for(const side of [1,-1]){const x=c.x+Math.cos(c.angle+Math.PI/2)*85*side,y=c.y+Math.sin(c.angle+Math.PI/2)*85*side;if(!blocked(s.city,x,y)){p.x=x;p.y=y;p.angle=c.angle;c.speed=0;p.car=null;break;}}}else{const c=s.cars.filter(c=>distance(p,c)<130).sort((a,b)=>distance(p,a)-distance(p,b))[0];if(c){p.car=c;c.type=c.type==='police'?'police':'player';if(!c.stolen){c.stolen=true;addCrime(s,1);s.toast='VEHICLE TAKEN · Police notified';s.toastTime=3;}}}}
 if(p.car)return;
 let x=(input.down('d','arrowright')?1:0)-(input.down('a','arrowleft')?1:0),y=(input.down('s','arrowdown')?1:0)-(input.down('w','arrowup')?1:0);if(x||y){const n=Math.hypot(x,y),v=input.down('shift')?215:145;p.angle=Math.atan2(y,x);x=x/n*v*dt;y=y/n*v*dt;if(!blocked(s.city,p.x+x,p.y))p.x+=x;if(!blocked(s.city,p.x,p.y+y))p.y+=y;p.walk+=dt*10;}
}
