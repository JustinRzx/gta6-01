import {distance,position} from './config.js';
export const JOBS=[{x:925,y:1200,title:'Walk to the payphone on Calder Street'},{x:1840,y:2105,title:'Pick up the package at the marker'},{x:3425,y:2765,title:'Deliver the package to the docks'}];
export function missionTarget(s){return s.mission.target||JOBS[s.mission.job%JOBS.length];}
export function updateMissions(s,dt){const m=s.mission;if(m.time>0){m.time-=dt;if(m.time<=0){m.active=false;s.toast='JOB EXPIRED · Return to the contact';s.toastTime=4;}}
 if(distance(position(s),missionTarget(s))<95){if(!m.active){m.active=true;m.target={...JOBS[(m.job+1)%JOBS.length]};m.time=150;s.toast='JOB ACCEPTED · Keep moving';}else{s.money+=650+m.job*125;m.job++;m.active=false;m.target=null;m.time=0;s.toast='DELIVERY COMPLETE · +$'+(650+(m.job-1)*125);}s.toastTime=4;}
}
export function objective(s){return s.wanted>=3?'Lose the police':missionTarget(s).title;}
