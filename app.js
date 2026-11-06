import { AtmosphereEngine } from './vendor/package/lib/atmosphere-engine.js';
const $=id=>document.getElementById(id);
const files=['01_BACKGROUND','02_FAR','03_MID_FAR','04_MID_NEAR','05_FOREGROUND'];
const ids=['background','forest','houses','near','field'];
const presets={evening:[18.5,.2,0,0],mist:[7,.35,.55,0],rain:[16,.8,.15,.65],original:[18.5,0,0,0]};
let engine,paused=false,original=false;
const timeText=t=>`${String(Math.floor(t)%24).padStart(2,'0')}:${String(Math.round(t%1*60)).padStart(2,'0')}`;
function apply(){
 const [time,cloud,fog,rain]=['time','cloud','fog','rain'].map(id=>Number($(id).value));
 $('clock').textContent=$('time-value').textContent=timeText(time);
 for(const [id,v] of [['cloud',cloud],['fog',fog],['rain',rain]])$(id+'-value').textContent=Math.round(v*100)+'%';
 engine.setParameters({timeOfDay:time,sky:{palette:'forest',overcast:cloud*.5},clouds:{enabled:cloud>0,coverage:cloud,density:.5,layers:{far:{depth:5},low:{depth:15}}},weather:{fog,rain,stormEnabled:false}});
 // The supplied artwork contains baked evening light; this tint is a stylistic time adjustment.
 const night=Math.max(0,Math.cos(time/24*Math.PI*2));
 const tint=original?[1,1,1]:[1-night*.67,1-night*.58,1-night*.38];
 for(const id of ids)engine.setLayerTint(id,tint);
}
try{
 engine=await AtmosphereEngine.create({container:$('scene'),scene:{width:640,height:360,background:'#1c2426',fogDepth:35,rainDepth:60,layers:files.map((file,i)=>({id:ids[i],source:`./assets/runtime/${file}_640x360.png`,depth:1+i*10,scope:'world',receivesLightning:false}))},parameters:{timeOfDay:18.5,sky:{palette:'forest'},clouds:{enabled:false},life:{traffic:0,beacons:false,windowDrops:false}},onError:e=>{ $('status').hidden=false;$('status').textContent='Не удалось отрисовать сцену: '+e.message;}});
 $('status').remove();apply();engine.start();window.utash={engine};
 for(const id of ['time','cloud','fog','rain'])$(id).addEventListener('input',()=>{original=false;document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed','false'));apply();});
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{original=b.dataset.preset==='original';presets[b.dataset.preset].forEach((v,i)=>$( ['time','cloud','fog','rain'][i]).value=v);document.querySelectorAll('[data-preset]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));apply();}));
 $('pause').onclick=()=>{paused=!paused;paused?engine.stop():engine.start();$('pause').textContent=paused?'Продолжить':'Пауза';$('pause').setAttribute('aria-pressed',String(paused));};
 $('save').onclick=()=>{const url=URL.createObjectURL(new Blob([engine.exportPreset()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='utash-atmosphere.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)engine.stop();else if(!paused)engine.start();});
}catch(error){$('status').textContent='Для сцены нужен браузер с WebGL 2. '+error.message;document.querySelectorAll('.controls button,.controls input').forEach(el=>el.disabled=true);}
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.landscape').requestFullscreen();}catch{ $('fullscreen').textContent='Полный экран недоступен';}};


