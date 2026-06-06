import * as THREE from 'three';
import { LEVELS } from './environment.js';
import { Entities, spawnRow, LANES, WALL_X, WALL_Y } from './entities.js';
import { buildAvatar, avatarById } from './avatars.js';

const PLAYER_Z = 2.0;
const G = 52, JUMP_V = 15, SLIDE_TIME = 0.62, COMBO_WINDOW = 2.6;
const SLOTS = [-WALL_X, -3.2, 0, 3.2, WALL_X];   // 0 & 4 are walls; 1,2,3 are ground lanes
const WALLJUMP_V = 13.5, WALL_STICK = 2.6;

export class Game{
  constructor(world, ui, store, audio){
    this.world=world; this.ui=ui; this.store=store; this.audio=audio;
    this.ent=new Entities(world.scene);
    this.state='menu';

    // player rig holder
    this.player=new THREE.Group(); this.player.position.set(0,0,PLAYER_Z); world.scene.add(this.player);
    this.shadow=new THREE.Mesh(new THREE.CircleGeometry(0.7,24), new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.32}));
    this.shadow.rotation.x=-Math.PI/2; this.shadow.position.set(0,0.02,PLAYER_Z); world.scene.add(this.shadow);

    this.slot=2; this.feetY=0; this.vy=0; this.airborne=false; this.slideT=0; this.sliding=false; this.slideTimer=0;
    this.runPhase=0; this.tilt=0; this.wallSide=0; this.wallStick=0; this.wallVisual=0;

    this._buildParticles();
    this.setAvatar(store.selected);
    this._resetRunVars();
  }

  // ---------- avatar ----------
  setAvatar(id){
    if(this.rig){ this.player.remove(this.rig.group); this.rig.group.traverse(o=>{ if(o.isMesh){o.geometry.dispose(); o.material.dispose && o.material.dispose();} }); }
    const def=avatarById(id); const built=buildAvatar(def);
    this.rig=built; this.player.add(built.group); this.avatarId=id;
  }

  _resetRunVars(){
    this.slot=2; this.feetY=0; this.vy=0; this.airborne=false; this.slideT=0; this.sliding=false; this.slideTimer=0;
    this.wallSide=0; this.wallStick=0; this.wallVisual=0;
    this.player.position.set(0,0,PLAYER_Z); this.player.rotation.set(0,0,0);
    this.distance=0; this.levelStartDist=0; this.coinScore=0;
    this.combo=0; this.multiplier=1; this.comboTimer=0;
    this.distSinceSpawn=0; this.nextGap=22;
    this.magnet=0; this.boost=0; this.hasShield=false; this.invuln=0;
    this.runCoins=0; this.startCoinBank=this.store.coins;
    this.hp=3; this.maxHp=3;
    this.shakeT=0;
  }

  // ---------- lifecycle ----------
  startNew(){
    this.ent.clear(); this._resetRunVars();
    this.level=0; this.applyLevel(0);
    this.ui.showHUD(); this.ui.setCoins(this.store.coins); this.ui.setHP(this.hp);
    this.state='countdown'; this._countdown(()=>{ this.state='playing'; });
  }
  applyLevel(idx){
    const L=LEVELS[idx%LEVELS.length];
    this.theme=L; this.world.applyTheme(idx%LEVELS.length);
    this.ent.setTheme(L.neon);
    this.baseSpeed=L.speed + Math.floor(idx/LEVELS.length)*3;
    this.goal=L.goal + idx*40;
    this.ui.setLevelName('LV'+(idx+1)+' · '+L.name);
  }
  _countdown(done){
    const seq=['3','2','1','GO!']; let i=0;
    const step=()=>{ if(i>=seq.length){ this.ui.hideCountdown(); done(); return; }
      this.ui.showCountdown(seq[i]); this.audio.blip(i===seq.length-1?660:440); i++; setTimeout(step, i===seq.length?500:650); };
    step();
  }

  pause(){ if(this.state==='playing'){ this.state='paused'; this.ui.showPause(); } }
  resume(){ if(this.state==='paused'){ this.ui.hidePause(); this.state='countdown'; this._countdown(()=>{this.state='playing';}); } }
  restart(){ this.ui.hidePause(); this.startNew(); }
  quitToMenu(){ this.ui.hidePause(); this.ui.hideHUD(); this.ent.clear(); this.state='menu'; this.ui.showStart(); }

  nextLevel(){
    this.level++; this.applyLevel(this.level);
    this.ent.clear(); this.levelStartDist=this.distance; this.distSinceSpawn=0; this.nextGap=20;
    this.magnet=0; this.boost=0; this.invuln=0; this.slot=2; this.wallStick=0; this.player.position.x=0;
    this.hp=this.maxHp;
    this.ui.showHUD(); this.ui.setHP(this.hp); this.state='countdown'; this._countdown(()=>{this.state='playing';});
  }

  levelClear(){
    this.state='levelclear';
    const L=this.theme;
    this.ui.showLevelClear({ name:'LV'+(this.level+1)+' · '+L.name, dist:Math.floor(this.distance), coins:this.runCoins,
      next:'LV'+(this.level+2)+' · '+LEVELS[(this.level+1)%LEVELS.length].name });
  }

  gameOver(){
    this.state='over'; this.audio.crash();
    this.rig.group.visible=true;
    this.shakeT=0.5;
    const score=Math.floor(this.distance*0.5 + this.coinScore);
    const best=Math.max(this.store.best, score); this.store.best=best;
    this.store.save();
    this.ui.showGameOver({score, best, coins:this.runCoins});
  }

  // ---------- input ----------
  get onWall(){ return this.slot===0 || this.slot===4; }
  moveLane(dir){ if(this.state!=='playing')return;
    const n=Math.max(0,Math.min(4,this.slot+dir)); if(n===this.slot)return;
    const wasWall=this.onWall; this.slot=n;
    if(this.onWall && !wasWall){            // leapt onto a wall
      this.wallSide=this.slot===0?-1:1; this.wallStick=WALL_STICK;
      this.feetY=Math.max(0,this.feetY); this.vy=Math.max(this.vy,7); this.airborne=false; this._endSlide();
      this.audio.blip(470);
    } else { this.audio.blip(520); }
  }
  jump(){ if(this.state!=='playing')return;
    if(this.onWall){ if(this.feetY<=0.12){ this.vy=WALLJUMP_V; this.wallStick=WALL_STICK; this._burst(this.player.position.clone(), 0x2ee6ff, 6); this.audio.blip(780); } }
    else if(!this.airborne){ this.vy=JUMP_V; this.airborne=true; this._endSlide(); this.audio.blip(700); }
  }
  slideAct(){ if(this.state!=='playing'||this.onWall)return;
    if(this.airborne){ this.vy=-26; } // fast-fall
    else if(!this.sliding){ this.sliding=true; this.slideTimer=SLIDE_TIME; this.audio.blip(300); } }
  _endSlide(){ this.sliding=false; this.slideTimer=0; }

  // ---------- update ----------
  update(dt){
    dt=Math.min(dt,0.05);
    let speed=0;
    if(this.state==='playing'){
      speed=this.baseSpeed + Math.min(10,(this.distance-this.levelStartDist)*0.012);
      if(this.boost>0) speed*=1.85;
      this._sim(dt, speed);
    } else if(this.state==='menu'){
      // idle bob on menu
      speed=6; this._menuIdle(dt);
    } else if(this.state==='countdown'){
      speed=2; this._animatePlayer(dt, 8, true);
    }
    this.world.update(dt, Math.max(speed,1.5));
    this._updateParticles(dt);
    this._camera(dt);
  }

  _menuIdle(dt){
    this.runPhase+=dt*6; this._animatePlayer(dt,8,true);
    this.player.position.x=0; this.player.rotation.y=Math.sin(performance.now()*0.0006)*0.25;
  }

  _sim(dt, speed){
    // distance / level
    this.distance+=speed*dt;
    this.distSinceSpawn+=speed*dt;
    if(this.distSinceSpawn>=this.nextGap){ this.distSinceSpawn=0; this.nextGap=24+Math.random()*16 - Math.min(8,this.level*1.5);
      spawnRow(this.ent, this.level, Math.random); }

    // lateral position
    const tx=SLOTS[this.slot];
    const px=this.player.position.x; const ndx=tx-px;
    this.player.position.x += ndx*Math.min(1,dt*13);
    this.tilt += (-ndx*0.10 - this.tilt)*Math.min(1,dt*10);

    // vertical (ground vs wall)
    const onWall=this.onWall;
    if(onWall){
      this.vy-=G*dt; this.feetY+=this.vy*dt;
      if(this.feetY<0){ this.feetY=0; this.vy=0; }
      if(this.feetY>3.2){ this.feetY=3.2; this.vy=Math.min(this.vy,0); }   // safety cap — never climb off-screen
      this.wallStick-=dt;
      if(this.wallStick<=0){ this.moveLane(this.wallSide>0?-1:1); }   // slides off, drop inward
    } else {
      if(this.airborne){ this.vy-=G*dt; this.feetY+=this.vy*dt; if(this.feetY<=0){ this.feetY=0; this.vy=0; this.airborne=false; this._squash=0.5; this.audio.blip(360);} }
      if(this.sliding){ this.slideTimer-=dt; if(this.slideTimer<=0)this._endSlide(); }
    }
    this.slideT += ((this.sliding&&!onWall?1:0)-this.slideT)*Math.min(1,dt*14);

    const baseY = this.onWall ? WALL_Y : 0;
    const lift = this.boost>0 ? 0.9 : 0;
    this.player.position.y += ((baseY+this.feetY+lift) - this.player.position.y)*Math.min(1,dt*18);

    this._animatePlayer(dt, speed);

    // power timers
    if(this.magnet>0) this.magnet-=dt;
    if(this.boost>0){ this.boost-=dt; if(Math.random()<0.5) this._spawnTrail(); }
    if(this.invuln>0){ this.invuln-=dt; this.rig.group.visible = (Math.floor(performance.now()*0.018)%2===0); }
    else if(this.rig){ this.rig.group.visible=true; }

    // combo decay
    if(this.combo>0){ this.comboTimer-=dt; if(this.comboTimer<=0){ this.combo=0; this.multiplier=1; this.ui.setMultiplier(1,0);} }

    // shadow
    this.shadow.position.x=this.player.position.x;
    const sh=Math.max(0,1-this.feetY/3.2) * (this.onWall?0.12:1); this.shadow.scale.setScalar(0.6+sh*0.6); this.shadow.material.opacity=0.32*sh;

    // entities + collisions
    this.ent.update(dt, speed, {x:this.player.position.x, y:this.player.position.y, z:PLAYER_Z, magnet:(this.magnet>0||this.boost>0)});
    this._collisions();

    // HUD
    const score=Math.floor(this.distance*0.5 + this.coinScore);
    this.ui.setScore(score);
    this.ui.setLevelProgress(Math.min(1,(this.distance-this.levelStartDist)/this.goal));
    this.ui.setPowers(this.magnet, this.boost, this.hasShield);
    if(this.comboTimer>0) this.ui.setMultiplier(this.multiplier, this.comboTimer/COMBO_WINDOW);

    if(this.distance-this.levelStartDist>=this.goal){ this.levelClear(); }
  }

  _animatePlayer(dt, speed, idle=false){
    const p=this.rig.parts;
    this.runPhase += dt*(idle?6:Math.min(20, speed*0.62));
    const s=this.slideT;
    const inAir = idle?false:(this.onWall ? this.feetY>0.2 : this.airborne);
    if(inAir){
      // tuck
      p.legL.rotation.x= -0.7; p.legR.rotation.x=-1.1;
      p.armL.rotation.x= 2.0; p.armR.rotation.x=2.0;
      p.bob.position.y=0;
    } else {
      const a=Math.sin(this.runPhase)*0.95*(1-s);
      p.legL.rotation.x=a; p.legR.rotation.x=-a;
      p.armL.rotation.x=-a*0.8; p.armR.rotation.x=a*0.8;
      p.bob.position.y=Math.abs(Math.sin(this.runPhase))*0.07*(1-s);
    }
    // slide posture
    p.bob.rotation.x = -s*1.15;
    this.player.scale.y = 1 - s*0.34 - (this._squash||0)*0.0;
    // squash on land
    if(this._squash>0){ this._squash-=dt*3; this.player.scale.y = (1 - s*0.34) * (1 - Math.max(0,this._squash)*0.25); this.player.scale.x=1+Math.max(0,this._squash)*0.18; }
    else this.player.scale.x=1;
    // tilt / bank / wall-cling lean
    const targetLean = this.onWall ? this.wallSide : 0;
    this.wallVisual += (targetLean - this.wallVisual)*Math.min(1,dt*9);
    this.player.rotation.z=this.tilt + this.wallVisual*1.15;
    this.player.rotation.y=this.tilt*0.6 + this.wallVisual*0.25 + (this.boost>0?Math.sin(performance.now()*0.02)*0.04:0);
    if(p.tail){ p.tail.rotation.x=Math.sin(this.runPhase*0.5)*0.2; p.tail.rotation.y=this.tilt; }
  }

  _collisions(){
    const px=this.player.position.x, py=this.player.position.y;
    // coins
    for(const c of this.ent.coins){ if(c.taken)continue; const g=c.group;
      if(Math.abs(g.position.z-PLAYER_Z)<1.1 && Math.abs(g.position.x-px)<1.3 && Math.abs(g.position.y-(py+0.4))<1.9){
        c.taken=true; this._collectCoin(g.position.clone());
      } }
    // powers
    for(const pw of this.ent.powers){ if(pw.taken)continue; const g=pw.group;
      if(Math.abs(g.position.z-PLAYER_Z)<1.2 && Math.abs(g.position.x-px)<1.5){ pw.taken=true; this._activatePower(pw.ptype, g.position.clone()); pw.group.visible=false; } }
    // obstacles
    for(const o of this.ent.obstacles){ if(o.collided)continue; const g=o.group;
      if(Math.abs(g.position.z-PLAYER_Z)>1.1) continue;
      let hit=false;
      if(o.kind==='wallspike'){
        if(!this.onWall || o.side!==this.wallSide) continue;   // only a threat on the matching wall
        hit = this.feetY < 1.1;                                // must wall-jump over it
      } else {
        if(this.onWall) continue;                              // ground obstacles can't touch you on a wall
        if(o.lane!==(this.slot-1)) continue;                   // ground lane = slot-1
        if(o.kind==='low'){ hit = this.feetY < 1.05; }
        else if(o.kind==='high'){ hit = this.slideT < 0.6; }
        else { hit = true; }
      }
      const invincible = this.boost>0 || this.invuln>0;
      if(this.boost>0 && o.kind!=='block'){ o.collided=true; this._burst(g.position.clone(), 0xffd23f, 10); g.visible=false; continue; }
      if(this.boost>0 && o.kind==='block'){ o.collided=true; this._burst(g.position.clone(),0xff4d8d,12); g.visible=false; continue; }
      if(hit && !invincible){
        if(this.hasShield){ this.hasShield=false; this.invuln=1.3; o.collided=true; g.visible=false; this._burst(g.position.clone(),0x51ffb0,14); this.ui.flashHit(); this.audio.blip(200); this.shakeT=0.3; }
        else {
          o.collided=true; g.visible=false; this._burst(g.position.clone(), 0xff4d8d, 16);
          this.hp--; this.invuln=1.4; this.ui.setHP(this.hp); this.ui.flashHit(); this.audio.blip(170); this.shakeT=0.45;
          if(this.hp<=0){ this.gameOver(); return; }
        }
      }
    }
  }

  _collectCoin(pos){
    this.runCoins++; this.store.coins++; 
    this.combo++; this.comboTimer=COMBO_WINDOW;
    this.multiplier=Math.min(8, 1+Math.floor(this.combo/8));
    this.coinScore += 10*this.multiplier;
    this.ui.setCoins(this.store.coins); this.ui.setMultiplier(this.multiplier, 1);
    this.ui.bumpCoin();
    this._burst(pos, 0xffd23f, 5);
    this.audio.coin(this.multiplier);
  }
  _activatePower(type, pos){
    if(type==='magnet'){ this.magnet=8.5; }
    else if(type==='shield'){ this.hasShield=true; }
    else if(type==='boost'){ this.boost=4.6; this.invuln=Math.max(this.invuln,0.2); }
    this._burst(pos, type==='magnet'?0x2ee6ff:type==='shield'?0x51ffb0:0xffd23f, 16);
    this.audio.power();
  }

  // ---------- camera ----------
  _camera(dt){
    const cam=this.world.camera;
    const baseY=4.6, baseZ=9.6;
    const tx=this.player.position.x*0.16;
    let sx=0,sy=0;
    if(this.shakeT>0){ this.shakeT-=dt; const m=this.shakeT*7; sx=(Math.random()-0.5)*m; sy=(Math.random()-0.5)*m; }
    cam.position.x += (tx+sx - cam.position.x)*Math.min(1,dt*8);
    cam.position.y += (baseY+sy - cam.position.y)*Math.min(1,dt*8);
    const targetFov = this.boost>0?70:62;
    cam.fov += (targetFov-cam.fov)*Math.min(1,dt*4); cam.updateProjectionMatrix();
    cam.lookAt(this.player.position.x*0.3, 1.3, -14);
  }

  // ---------- particles ----------
  _buildParticles(){
    this.particles=[]; this._pIdx=0; const N=80;
    const geo=new THREE.SphereGeometry(0.12,6,6);
    for(let i=0;i<N;i++){ const m=new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:0xffffff,transparent:true})); m.visible=false; this.world.scene.add(m); this.particles.push({m,life:0,vel:new THREE.Vector3()}); }
  }
  _burst(pos, color, n=8){
    for(let i=0;i<n;i++){ const p=this.particles[this._pIdx%this.particles.length]; this._pIdx++;
      p.m.visible=true; p.m.position.copy(pos); p.m.material.color.setHex(color); p.m.material.opacity=1; p.life=0.5+Math.random()*0.3;
      p.maxlife=p.life; p.vel.set((Math.random()-0.5)*10,(Math.random())*8+2,(Math.random()-0.5)*10+6); p.m.scale.setScalar(0.6+Math.random()*0.8); }
  }
  _spawnTrail(){ const p=this.particles[this._pIdx%this.particles.length]; this._pIdx++; p.m.visible=true; p.m.position.copy(this.player.position); p.m.position.y+=0.8+Math.random(); p.m.material.color.setHex(0xffd23f); p.m.material.opacity=0.9; p.life=0.4; p.maxlife=0.4; p.vel.set((Math.random()-0.5)*2,0,14); p.m.scale.setScalar(0.5+Math.random()*0.6); }
  _updateParticles(dt){
    for(const p of this.particles){ if(p.life<=0)continue; p.life-=dt; if(p.life<=0){ p.m.visible=false; continue; }
      p.vel.y-=20*dt; p.m.position.addScaledVector(p.vel,dt); p.m.material.opacity=Math.max(0,p.life/p.maxlife); }
  }
}
