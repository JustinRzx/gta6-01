export function loadProgress(){try{return JSON.parse(localStorage.getItem('calder-save-v1'))||{};}catch{return {};}}
export function saveProgress(s){try{localStorage.setItem('calder-save-v1',JSON.stringify({money:s.money,health:s.health,job:s.mission.job,x:s.player.car?.x||s.player.x,y:s.player.car?.y||s.player.y}));}catch{}}
