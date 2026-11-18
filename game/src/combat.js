import {distance} from './config.js';
import {addCrime} from './wanted.js';
export function updateCombat(s,input,dt){s.punch=Math.max(0,s.punch-dt);if(!s.player.car&&(input.take('f')||input.take('click'))&&s.punch===0){s.punch=.35;const target=s.people.find(p=>!p.down&&distance(p,s.player)<85);if(target){target.down=8;addCrime(s,1);s.money+=15;}}}
