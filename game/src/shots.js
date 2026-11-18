import {makeCar} from './vehicles.js';
import {followCamera} from './camera.js';
import {updateTraffic} from './traffic.js';
import {updatePedestrians} from './pedestrians.js';
export function stageShot(s,name){s.started=true;s.paused=false;s.money={chase:18450,drive:3270,foot:840,mission:6920}[name]||840;s.wanted=name==='chase'?4:0;s.heat=24;s.mission.active=true;s.mission.time=name==='chase'?74:name==='drive'?112:96;
 const locations={chase:{x:1400,y:704,angle:0},drive:{x:4040,y:2024,angle:0},foot:{x:1080,y:4085,angle:0},mission:{x:4040,y:4664,angle:0}};const p=locations[name]||locations.foot;Object.assign(s.player,p);s.stagedDistrict={x:p.x,y:p.y,blockX:Math.floor(p.x/660),blockY:Math.floor(p.y/660)};s.mission.target={x:p.x+350,y:p.y-125,title:name==='drive'?'Deliver the package to the docks':name==='foot'?'Walk to the payphone on Calder Street':'Pick up the package at the marker'};
 if(name==='mission')s.mission.target={x:p.x+200,y:p.y+81,title:'Pick up the package at the marker'};
 if(name==='foot')s.mission.target.y=p.y;
 if(name!=='foot'){const car=makeCar(p.x,p.y,p.angle,'player');car.speed=name==='chase'?305:name==='drive'?148:0;s.player.car=car;s.cars.push(car);}
 followCamera(s,0,true);
 // Replace only nearby traffic with deliberate, non-overlapping lane occupancy.
 const left=s.camera.x,right=left+1280,top=s.camera.y,bottom=top+720;s.cars=s.cars.filter(c=>c===s.player.car||c.x<left-100||c.x>right+100||c.y<top-100||c.y>bottom+100);
 const base=Math.round(p.y/660)*660;
 if(name==='chase'){for(let i=0;i<3;i++){const c=makeCar(p.x-170-i*155,p.y,0,'police');c.speed=280;s.cars.push(c);}s.cars.push(makeCar(p.x-280,base-44,Math.PI),makeCar(p.x+320,base-44,Math.PI),makeCar(p.x+535,base+44));}
 else{for(let i=0;i<4;i++){const c=makeCar(left+140+i*255,base-44,Math.PI);c.speed=i<2?0:80;s.cars.push(c);}s.cars.push(makeCar(Math.round(p.x/660)*660-44,base-215,Math.PI/2));}
 if(name==='foot'){s.mission.time=0;s.mission.active=false;s.cars.push(makeCar(p.x+30,base+80,0,'parked'),makeCar(p.x+240,base+80,0,'parked'));}
 if(name==='mission')s.cars.push(makeCar(p.x+200,base+80,0,'parked'));
 s.shot=name;
}
export function advanceShot(s){for(let i=0;i<24;i++){s.time+=1/60;updatePedestrians(s,1/60);updateTraffic(s,1/60);if(s.shot==='chase'){s.player.car.x+=s.player.car.speed/60;for(const c of s.cars)if(c.type==='police')c.x+=c.speed/60;}followCamera(s,1/60);} }
export function countVisibleEntities(s){const inFrame=p=>p.x>=s.camera.x&&p.x<=s.camera.x+1280&&p.y>=s.camera.y&&p.y<=s.camera.y+720;return {police:s.cars.filter(c=>c.type==='police'&&inFrame(c)).length,pedestrians:s.people.filter(inFrame).length,traffic:s.cars.filter(c=>c!==s.player.car&&c.type!=='police'&&inFrame(c)).length};}
