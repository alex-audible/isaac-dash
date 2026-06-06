import { AVATARS } from './avatars.js';

const $=id=>document.getElementById(id);
const show=el=>el.classList.remove('hidden');
const hide=el=>el.classList.add('hidden');

export class UI{
  constructor(){
    this.el={
      hud:$('hud'), score:$('scoreVal'), coin:$('coinVal'), levelName:$('levelName'), levelFill:$('levelFill'),
      multi:$('hudMulti'), multiVal:$('multiVal'), comboProg:$('comboProg'), powers:$('hudPowers'), pauseBtn:$('pauseBtn'),
      hp:$('hudHp'),
      coinChip:document.querySelector('.hud-coins .coin-chip'),
      start:$('startScreen'), how:$('howScreen'), shop:$('shopScreen'), level:$('levelScreen'), over:$('overScreen'), pause:$('pauseScreen'),
      countdown:$('countdown'), loading:$('loading'),
      startBest:$('startBest'), startCoins:$('startCoins'),
      grid:$('avatarGrid'), shopCoins:$('shopCoins'), shopTitle:$('shopTitle'),
    };
    this.C=2*Math.PI*19;
    this.el.comboProg.style.strokeDasharray=this.C;
    // power pills (persistent)
    this.el.powers.innerHTML=`
      <div class="power-pill magnet" data-p="magnet" style="display:none"><span class="p-ic"></span><span class="p-name">Magnet</span><span class="p-bar"><i></i></span></div>
      <div class="power-pill boost" data-p="boost" style="display:none"><span class="p-ic"></span><span class="p-name">Boost</span><span class="p-bar"><i></i></span></div>
      <div class="power-pill shield" data-p="shield" style="display:none"><span class="p-ic"></span><span class="p-name">Shield</span></div>`;
    this.pill={ magnet:this.el.powers.querySelector('[data-p=magnet]'), boost:this.el.powers.querySelector('[data-p=boost]'), shield:this.el.powers.querySelector('[data-p=shield]') };
  }

  bind(game, store, thumbs, audio){
    this.game=game; this.store=store; this.thumbs=thumbs; this.audio=audio;
    const g=game;
    $('playBtn').onclick=()=>{ audio.resume(); g.startNew(); };
    $('shopBtn').onclick=()=>this.openShop('start');
    $('howBtn').onclick=()=>{ hide(this.el.start); show(this.el.how); };
    $('howBack').onclick=()=>{ hide(this.el.how); show(this.el.start); };
    $('soundBtn').onclick=(e)=>{ const on=audio.toggle(); e.target.textContent='SOUND: '+(on?'ON':'OFF'); };
    $('shopBack').onclick=()=>this.closeShop();
    $('lvlShop').onclick=()=>this.openShop('level');
    $('lvlNext').onclick=()=>{ hide(this.el.level); g.nextLevel(); };
    $('overHome').onclick=()=>{ hide(this.el.over); g.quitToMenu(); };
    $('overRetry').onclick=()=>{ hide(this.el.over); g.startNew(); };
    $('resumeBtn').onclick=()=>g.resume();
    $('restartBtn').onclick=()=>g.restart();
    $('quitBtn').onclick=()=>g.quitToMenu();
    this.el.pauseBtn.onclick=()=>g.pause();
    this._input();
    this.refreshStart();
  }

  _input(){
    addEventListener('keydown',e=>{
      const g=this.game; if(!g)return;
      switch(e.code){
        case 'ArrowLeft': case 'KeyA': g.moveLane(-1); e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': g.moveLane(1); e.preventDefault(); break;
        case 'ArrowUp': case 'KeyW': case 'Space': g.jump(); e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': g.slideAct(); e.preventDefault(); break;
        case 'Escape': case 'KeyP': if(g.state==='playing')g.pause(); else if(g.state==='paused')g.resume(); break;
      }
    },{passive:false});
    // touch swipe
    const root=document.getElementById('game-root'); let sx=0,sy=0,st=0,moved=false;
    root.addEventListener('touchstart',e=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; st=Date.now(); moved=false; },{passive:true});
    root.addEventListener('touchmove',e=>{ const t=e.touches[0]; const dx=t.clientX-sx, dy=t.clientY-sy; if(Math.abs(dx)>32||Math.abs(dy)>32){ if(!moved){ moved=true; this._swipe(dx,dy);} } },{passive:true});
    root.addEventListener('touchend',e=>{ if(!moved && Date.now()-st<250){ const tg=e.target; if(tg.closest('button')||tg.closest('.av-card'))return; this.game&&this.game.jump(); } },{passive:true});
  }
  _swipe(dx,dy){ const g=this.game; if(!g)return; if(Math.abs(dx)>Math.abs(dy)){ g.moveLane(dx>0?1:-1); } else { if(dy<0)g.jump(); else g.slideAct(); } }

  // ---- HUD ----
  showHUD(){ ['start','how','shop','level','over','pause'].forEach(k=>hide(this.el[k])); show(this.el.hud); this.el.pauseBtn.style.display='block'; }
  hideHUD(){ hide(this.el.hud); this.el.pauseBtn.style.display='none'; }
  setScore(v){ this.el.score.textContent=v.toLocaleString(); }
  setCoins(v){ this.el.coin.textContent=v; }
  setHP(n){ const el=this.el.hp; if(!el)return; const max=3; let h=''; for(let i=0;i<max;i++){ h+='<span class="hp-heart'+(i<n?'':' lost')+'">\u2665</span>'; } el.innerHTML=h;
    if(this._lastHp!=null && n<this._lastHp){ el.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:280,easing:'ease-out'}); } this._lastHp=n; }
  bumpCoin(){ this.el.coinChip.animate([{transform:'scale(1.28)'},{transform:'scale(1)'}],{duration:220,easing:'ease-out'}); }
  setLevelName(n){ this.el.levelName.textContent=n; }
  setLevelProgress(f){ this.el.levelFill.style.width=(f*100)+'%'; }
  setMultiplier(m,frac){ if(m>1){ this.el.multi.classList.add('show'); this.el.multiVal.textContent='x'+m; this.el.comboProg.style.strokeDashoffset=this.C*(1-frac); } else { this.el.multi.classList.remove('show'); } }
  setPowers(magnet, boost, shield){
    this.pill.magnet.style.display=magnet>0?'flex':'none'; if(magnet>0)this.pill.magnet.querySelector('i').style.width=Math.min(100,magnet/8.5*100)+'%';
    this.pill.boost.style.display=boost>0?'flex':'none'; if(boost>0)this.pill.boost.querySelector('i').style.width=Math.min(100,boost/4.6*100)+'%';
    this.pill.shield.style.display=shield?'flex':'none';
  }
  flashHit(){ let f=document.querySelector('.hit-flash'); if(!f){ f=document.createElement('div'); f.className='hit-flash'; document.getElementById('game-root').appendChild(f);} f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

  showCountdown(t){ this.el.countdown.innerHTML='<div class="cd">'+t+'</div>'; show(this.el.countdown); }
  hideCountdown(){ hide(this.el.countdown); }

  // ---- screens ----
  refreshStart(){ this.el.startBest.textContent=this.store.best.toLocaleString(); this.el.startCoins.textContent=this.store.coins; }
  showStart(){ this.refreshStart(); ['how','shop','level','over','pause'].forEach(k=>hide(this.el[k])); show(this.el.start); }
  showPause(){ show(this.el.pause); }
  hidePause(){ hide(this.el.pause); }

  showLevelClear({name,dist,coins,next}){
    $('levelClearName').textContent=name; $('lvlDist').textContent=dist+'m'; $('lvlCoins').textContent=coins; $('nextLevelName').textContent=next;
    show(this.el.level);
  }
  showGameOver({score,best,coins}){
    $('overScore').textContent=score.toLocaleString(); $('overBest').textContent=best.toLocaleString(); $('overCoins').textContent=coins;
    this.hideHUD(); show(this.el.over);
  }

  // ---- shop ----
  openShop(returnTo){ this.shopReturn=returnTo; hide(this.el.start); hide(this.el.level);
    this.el.shopTitle.textContent= returnTo==='level'?'GARAGE':'GARAGE';
    this.renderShop(); show(this.el.shop); }
  closeShop(){ hide(this.el.shop); if(this.shopReturn==='level')show(this.el.level); else show(this.el.start); this.refreshStart(); }

  renderShop(){
    const store=this.store; this.el.shopCoins.textContent=store.coins;
    this.el.grid.innerHTML='';
    for(const a of AVATARS){
      const owned=store.owned.includes(a.id); const selected=store.selected===a.id;
      const card=document.createElement('div'); card.className='av-card'+(selected?' selected':'')+(owned?'':' locked');
      let cta;
      if(selected) cta='<div class="av-cta owned">EQUIPPED</div>';
      else if(owned) cta='<div class="av-cta equip">EQUIP</div>';
      else cta=`<div class="av-cta ${store.coins>=a.cost?'buy':'cant'}"><span class="coin-dot"></span>${a.cost}</div>`;
      card.innerHTML=`${owned?'':'<div class="av-lock">🔒</div>'}<div class="av-thumb"><img src="${this.thumbs[a.id]}" alt="${a.name}"></div><div class="av-name">${a.name}</div>${cta}`;
      card.onclick=()=>this._tapAvatar(a, card);
      this.el.grid.appendChild(card);
    }
  }
  _tapAvatar(a, card){
    const store=this.store;
    if(store.owned.includes(a.id)){
      store.selected=a.id; this.game.setAvatar(a.id); store.save(); this.audio.blip(620); this.renderShop();
    } else if(store.coins>=a.cost){
      store.coins-=a.cost; store.owned.push(a.id); store.selected=a.id; this.game.setAvatar(a.id); store.save();
      this.audio.power(); this.setCoins(store.coins); this.renderShop();
    } else {
      this.audio.blip(160); card.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:240});
    }
  }

  hideLoading(){ this.el.loading.style.opacity='0'; setTimeout(()=>hide(this.el.loading),400); }
}
