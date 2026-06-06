import { World } from './environment.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { renderThumbnails } from './avatars.js';

// ---------- persistent store ----------
const KEY='skydash_v1';
const store={
  coins:0, owned:['pixel'], selected:'pixel', best:0,
  load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)); if(d){ Object.assign(this,d); if(!this.owned.includes('pixel'))this.owned.push('pixel'); } }catch(e){} },
  save(){ try{ localStorage.setItem(KEY, JSON.stringify({coins:this.coins,owned:this.owned,selected:this.selected,best:this.best})); }catch(e){} }
};
store.load();

// ---------- audio ----------
const audio={
  ctx:null, on:true,
  resume(){ if(!this.ctx){ try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); },
  toggle(){ this.on=!this.on; return this.on; },
  tone(freq,dur=0.08,type='square',vol=0.06){ if(!this.on||!this.ctx)return; const t=this.ctx.currentTime; const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t+dur); },
  blip(f){ this.tone(f,0.07,'square',0.05); },
  coin(mult){ this.tone(760+mult*40,0.06,'triangle',0.05); this.tone(1040+mult*40,0.05,'sine',0.04); },
  power(){ this.tone(440,0.12,'sawtooth',0.05); setTimeout(()=>this.tone(880,0.14,'sawtooth',0.05),60); },
  crash(){ this.tone(160,0.3,'sawtooth',0.07); this.tone(90,0.4,'square',0.06); },
};

// ---------- boot ----------
const canvas=document.getElementById('scene');
const ui=new UI();

function boot(){
  const thumbs=renderThumbnails();
  const world=new World(canvas);
  const game=new Game(world, ui, store, audio);
  ui.bind(game, store, thumbs, audio);
  window.__game=game; window.__world=world;
  game.state='menu';

  addEventListener('resize',()=>world.resize());

  let last=performance.now();
  function loop(now){
    const dt=(now-last)/1000; last=now;
    try{ game.update(Math.min(dt,0.05)); world.render(); }catch(e){ console.error(e); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  ui.showStart();
  ui.hideLoading();
}

// let fonts/layout settle a beat, then build
requestAnimationFrame(()=>requestAnimationFrame(()=>{
  try{ boot(); }catch(e){ window.__err=e.message+'\n'+e.stack; console.error(e); document.querySelector('.load-txt').textContent='ERR: '+e.message; }
}));
