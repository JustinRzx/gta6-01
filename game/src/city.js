import {STEP,ROAD,SIDE,WORLD} from './config.js';
import {random} from './random.js';
export function createCity(seed){
 const rng=random(seed),blocks=[],buildings=[];
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const bx=x*STEP+ROAD/2+SIDE,by=y*STEP+ROAD/2+SIDE,size=STEP-ROAD-SIDE*2;
  const kind=(x===5&&y===3)||(x+y*3)%7===2?'park':(x+y*2)%9===4?'parking':'buildings';
  const block={x:bx,y:by,w:size,h:size,kind,trees:[]};blocks.push(block);
  if(kind==='buildings'){
   const inset=14;const split=(x+y)%3===0;
   for(let i=0;i<(split?2:1);i++)buildings.push({x:bx+inset+i*(size/2),y:by+inset,w:split?size/2-24:size-28,h:size-28,color:['#637778','#65717b','#8b8174','#6a8182'][Math.floor(rng()*4)],height:12+rng()*14,label:['CALDER BANK','WESTERN UNION','HOTEL / 24','MERCURY STUDIOS','PORT AUTHORITY','THE ASTER'][Math.floor(rng()*6)]});
  }else if(kind==='park')for(let i=0;i<15;i++)block.trees.push({x:bx+25+rng()*(size-50),y:by+25+rng()*(size-50),r:21+rng()*12});
 }
 return {blocks,buildings,seed};
}
export function blocked(city,x,y,r=18){return x<r||y<r||x>WORLD-r||y>WORLD-r||city.buildings.some(b=>x>b.x-r&&x<b.x+b.w+r&&y>b.y-r&&y<b.y+b.h+r);}
export function sidewalkPoint(x,y){let a=Math.round(x/STEP)*STEP,b=Math.round(y/STEP)*STEP;return Math.abs(x-a)>ROAD/2&&Math.abs(y-b)>ROAD/2;}
