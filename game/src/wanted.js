import {distance,position} from './config.js';
export function addCrime(s,amount){if(s.crimeCooldown>0)return;s.wanted=Math.min(5,s.wanted+amount);s.heat=22;s.crimeCooldown=2;}
export function updateWanted(s,dt){s.crimeCooldown=Math.max(0,s.crimeCooldown-dt);if(!s.wanted)return;const seen=s.cars.some(c=>c.type==='police'&&c!==s.player.car&&distance(c,position(s))<650);s.heat-=dt*(seen?.15:1);if(s.heat<=0){s.wanted--;s.heat=14;}}
