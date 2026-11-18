import {WIDTH,HEIGHT,WORLD,clamp,position} from './config.js';
export function followCamera(s,dt,snap=false){const p=position(s),lead=s.player.car?85:35;const tx=clamp(p.x+Math.cos(p.angle)*lead-WIDTH/2,0,WORLD-WIDTH),ty=clamp(p.y+Math.sin(p.angle)*lead-HEIGHT/2,0,WORLD-HEIGHT);const a=snap?1:1-Math.exp(-dt*5);s.camera.x+=(tx-s.camera.x)*a;s.camera.y+=(ty-s.camera.y)*a;}
export function visible(s,p,pad=90){return p.x>s.camera.x-pad&&p.x<s.camera.x+1280+pad&&p.y>s.camera.y-pad&&p.y<s.camera.y+720+pad;}
