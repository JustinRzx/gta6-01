import {loadAssets} from './assets.js';
import {createCity} from './city.js';
import {createInput} from './input.js';
import {createVehicles} from './vehicles.js';
import {createPedestrians,updatePedestrians} from './pedestrians.js';
import {updatePlayer} from './player.js';
import {drive} from './driving.js';
import {updateTraffic} from './traffic.js';
import {updatePolice} from './police.js';
import {updateWanted} from './wanted.js';
import {updateMissions} from './missions.js';
import {updateCombat} from './combat.js';
import {followCamera} from './camera.js';
import {createRenderer} from './render.js';
import {createAudio} from './audio.js';
import {loadProgress,saveProgress} from './save.js';
import {stageShot,advanceShot,countVisibleEntities} from './shots.js';

const canvas=document.getElementById('game'),params=new URLSearchParams(location.search),seed=Number(params.get('seed'))||11,shot=params.get('shot');
const audio=createAudio(),input=createInput(canvas,()=>audio.start()),assets=await loadAssets(),render=createRenderer(canvas,assets),saved=shot?{}:loadProgress();
const state={city:createCity(seed),player:{x:saved.x||925,y:saved.y||1200,angle:0,skin:0,walk:0,car:null},cars:createVehicles(),people:createPedestrians(seed),camera:{x:0,y:0},money:saved.money??840,health:saved.health??100,wanted:0,heat:0,crimeCooldown:0,mission:{job:saved.job||0,active:false,time:0,target:null},time:0,punch:0,toast:'',toastTime:0,started:false,paused:false};
function simulate(dt){state.time+=dt;updatePlayer(state,input,dt);drive(state,input,dt);updateTraffic(state,dt);updatePedestrians(state,dt);updatePolice(state,dt);updateWanted(state,dt);updateMissions(state,dt);updateCombat(state,input,dt);followCamera(state,dt);state.toastTime-=dt;if(state.health<=0){state.health=100;state.money=Math.max(0,state.money-250);state.wanted=0;state.player.car=null;state.player.x=925;state.player.y=1200;state.toast='HOSPITAL RELEASE · $250';state.toastTime=5;}}
followCamera(state,0,true);
if(shot){stageShot(state,shot);advanceShot(state);render(state);window.__shotCounts=countVisibleEntities(state);window.__game=state;console.log('SCENE',shot,JSON.stringify(window.__shotCounts));window.__shotReady=true;}
else{let last=performance.now(),saveTime=0;function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;if(input.take('enter')||(!state.started&&input.take('click'))){state.started=true;state.paused=false;}if(input.take('escape')&&state.started)state.paused=!state.paused;if(state.started&&!state.paused){simulate(dt);saveTime+=dt;if(saveTime>4){saveProgress(state);saveTime=0;}}audio.update(state.wanted,state.paused||!state.started);render(state);input.clear();requestAnimationFrame(frame);}requestAnimationFrame(frame);addEventListener('beforeunload',()=>saveProgress(state));window.__game=state;}
