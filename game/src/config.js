export const WIDTH=1280, HEIGHT=720, STEP=660, ROAD=190, SIDE=65, WORLD=STEP*8;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const position=s=>s.player.car||s.player;
