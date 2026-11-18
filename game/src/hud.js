import {objective,missionTarget} from './missions.js';
import {distance,position} from './config.js';
import {drawMinimap} from './minimap.js';

const PANELS={identity:[28,26,385,82],wanted:[846,26,406,82],objective:[28,125,540,85],speed:[842,548,172,100],controls:[28,650,740,37],toast:[365,580,450,42],map:[1038,493,214,194]};
function panel(c,rect){const [x,y,w,h]=rect;c.fillStyle='#091923ed';c.fillRect(x,y,w,h);c.fillStyle='#efc46b';c.fillRect(x,y,3,h);}
function text(c,s,panelName,string,x,y,font,color,align='left'){
 c.font=font;c.fillStyle=color;c.textAlign=align;
 const m=c.measureText(string),left=x-(align==='right'?m.width:align==='center'?m.width/2:0);
 const bounds=[left,y-m.actualBoundingBoxAscent,m.width,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent];
 const [px,py,pw,ph]=PANELS[panelName];
 s.hudTextBounds.push({string,panel:panelName,bounds,inside:bounds[0]>=px+5&&bounds[1]>=py+5&&bounds[0]+bounds[2]<=px+pw-5&&bounds[1]+bounds[3]<=py+ph-5});
 c.fillText(string,x,y);c.textAlign='left';
}
export function drawHUD(c,s){
 s.hudTextBounds=[];s.hudPanels=PANELS;
 panel(c,PANELS.identity);
 text(c,s,'identity','CALDER',45,59,'bold 25px Arial','#e8efeb');
 text(c,s,'identity','HEAT & CONCRETE',46,80,'11px Arial','#a0b4bb');
 text(c,s,'identity','$'+Math.floor(s.money).toLocaleString('en-US'),395,60,'bold 25px Arial','#eff3e9','right');
 c.fillStyle='#29424b';c.fillRect(250,78,145,8);c.fillStyle=s.health>30?'#88d8af':'#f36d71';c.fillRect(250,78,145*Math.max(0,s.health)/100,8);
 panel(c,PANELS.wanted);
 for(let i=0;i<5;i++)text(c,s,'wanted','★',1006+i*44,60,'bold 26px Arial',i<s.wanted?'#ffd477':'#34434a');
 text(c,s,'wanted',s.wanted?'WANTED':'CLEAR',865,57,'bold 12px Arial',s.wanted?'#ffb18d':'#9db7ba');
 text(c,s,'wanted',s.wanted?'Evade patrols to lose your heat':'CALDER CITY · 16:42',865,88,'11px Arial','#9db7ba');
 panel(c,PANELS.objective);
 text(c,s,'objective',s.mission.active?'ACTIVE CONTRACT':'STREET CONTACT',45,149,'bold 10px Arial','#e5bf74');
 text(c,s,'objective',objective(s),45,184,'18px Arial','#f0f3ed');
 text(c,s,'objective',Math.round(distance(position(s),missionTarget(s)))+' m'+(s.mission.time?'  /  '+Math.ceil(s.mission.time)+'s':''),548,149,'12px Arial','#b0c7c9','right');
 drawMinimap(c,s);
 // Include map labels in the same bounding-box audit as every other HUD string.
 text(c,s,'map','N',1232,512,'bold 12px Arial','#e5eff1');
 text(c,s,'map','CALDER / STREET MAP',1047,678,'10px Arial','#e5eff1');
 if(s.player.car){
  panel(c,PANELS.speed);
  text(c,s,'speed',String(Math.round(Math.min(170,Math.abs(s.player.car.speed)*.354))),988,604,'bold 49px Arial','#ecf5ee','right');
  text(c,s,'speed','D / CALDER GT',857,630,'10px Arial','#afc8cb');
  text(c,s,'speed','KM/H',998,630,'10px Arial','#afc8cb','right');
 }
 panel(c,PANELS.controls);
 text(c,s,'controls',s.player.car?'WASD  Drive    SPACE  Brake    E  Exit vehicle    ESC  Pause':'WASD  Walk    SHIFT  Run    E  Enter vehicle    F / CLICK  Punch    ESC  Pause',44,673,'12px Arial','#d9e4df');
 if(s.toastTime>0){panel(c,PANELS.toast);text(c,s,'toast',s.toast,383,606,'bold 13px Arial','#f3d38b');}
}
export function drawMenu(c,s){c.fillStyle='#06121bdc';c.fillRect(0,0,1280,720);c.fillStyle='#f0cc82';c.font='bold 13px Arial';c.fillText('AN OPEN CITY. A CLEAN GETAWAY.',120,218);c.font='bold 92px Arial';c.fillStyle='#edf1e6';c.fillText('CALDER',112,312);c.font='26px Arial';c.fillText('HEAT & CONCRETE',120,353);c.font='18px Arial';c.fillStyle='#a8bdc0';c.fillText('Take a car. Work the streets. Stay ahead of the sirens.',120,409);c.fillStyle='#f1ca7b';c.fillRect(120,454,300,58);c.fillStyle='#15232b';c.font='bold 17px Arial';c.fillText(s.started?'RESUME  /  ENTER':'ENTER THE CITY  /  ENTER',140,490);c.fillStyle='#b5c7c7';c.font='13px Arial';c.fillText('WASD move · E enter / exit · F punch · SPACE brake · ESC pause',120,553);c.fillText('Progress saves automatically. Headphones recommended.',120,580);}
