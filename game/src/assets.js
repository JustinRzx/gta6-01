export async function loadAssets(){
 const assets={};
 const names={road:'assets/road.png',pavement:'assets/pavement.png',sedan:'assets/sprites/sedan.png',police:'assets/sprites/police.png'};
 for(let r=0;r<4;r++)for(const d of ['up','right','down','left'])names[`person-${r}-${d}`]=`assets/sprites/person-${r}-${d}.png`;
 await Promise.all(Object.entries(names).map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{assets[key]=im;resolve();};im.onerror=()=>reject(Error(`Missing asset: ${url}`));im.src=url;})));
 return assets;
}
