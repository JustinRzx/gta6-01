import {STEP} from './config.js';
import {random} from './random.js';

export function createPedestrians(seed){
 const rng=random(seed+90),people=[];
 for(let row=0;row<8;row++)for(let col=0;col<8;col++)for(let n=0;n<24;n++){
  people.push({blockX:col*STEP,blockY:row*STEP,phase:rng()*4,offset:(rng()-.5)*20,pace:(.019+rng()*.015)*(rng()<.5?-1:1),skin:Math.floor(rng()*4),x:0,y:0,angle:0,walk:rng()*5,down:0,crossing:n===0});
 }
 for(const p of people)placePedestrian(p);return people;
}
function placePedestrian(p){
 if(p.crossing){p.x=p.blockX+((p.phase/4)*240-120);p.y=p.blockY+108+p.offset*.3;p.angle=p.pace>0?0:Math.PI;return;}
 const a=127+p.offset,b=533-p.offset,edge=Math.floor(p.phase),f=p.phase-edge;
 const coords=[[a+(b-a)*f,a,0],[b,a+(b-a)*f,Math.PI/2],[b-(b-a)*f,b,Math.PI],[a,b-(b-a)*f,-Math.PI/2]][edge];
 p.x=p.blockX+coords[0];p.y=p.blockY+coords[1];p.angle=coords[2]+(p.pace<0?Math.PI:0);
}
export function updatePedestrians(s,dt){for(const p of s.people){if(p.down){p.down=Math.max(0,p.down-dt);continue;}p.phase=(p.phase+p.pace*dt+4)%4;p.walk+=dt*6;placePedestrian(p);}}
