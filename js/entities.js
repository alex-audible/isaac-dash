import * as THREE from 'three';

export const LANES = [-3.2, 0, 3.2];
export const WALL_X = 5.9;       // lateral position when clinging to a side wall
export const WALL_Y = 1.55;      // wall-run height
const SPAWN_Z = -188;
const RECYCLE_Z = 16;

function mkMat(color, ei=1.4){ return new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:ei, roughness:0.35, metalness:0.2}); }
function darkMat(){ return new THREE.MeshStandardMaterial({color:0x141228, roughness:0.7, metalness:0.3}); }

// ---------- builders ----------
function buildLow(theme){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.9,0.5), darkMat()); body.position.y=0.45; g.add(body);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.18,0.62), mkMat(theme,2.2)); bar.position.y=0.92; g.add(bar);
  for(const sx of[-1.1,1.1]){ const p=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.95,0.16), mkMat(theme,2.0)); p.position.set(sx,0.47,0); g.add(p); }
  const chevr=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.5,0.04), mkMat(0xffd23f,1.6)); chevr.position.set(0,0.5,-0.27); g.add(chevr);
  g.userData={kind:'low'}; return g;
}
function buildHigh(theme){
  const g=new THREE.Group();
  for(const sx of[-1.25,1.25]){ const p=new THREE.Mesh(new THREE.BoxGeometry(0.18,3.0,0.18), darkMat()); p.position.set(sx,1.5,0); g.add(p); }
  const beam=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.55,0.6), mkMat(theme,2.2)); beam.position.y=2.35; g.add(beam);
  const field=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.0), new THREE.MeshBasicMaterial({color:theme,transparent:true,opacity:0.22,side:THREE.DoubleSide}));
  field.position.y=2.05; g.add(field);
  const warn=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.12,0.04), mkMat(0xff4d8d,1.8)); warn.position.set(0,1.55,-0.05); g.add(warn);
  g.userData={kind:'high'}; return g;
}
function buildBlock(theme){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.5,3.4,0.7), darkMat()); body.position.y=1.7; g.add(body);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(2.6,3.5,0.1), mkMat(theme,1.8)); edge.position.set(0,1.7,-0.36); g.add(edge);
  for(let i=0;i<3;i++){ const s=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.12,0.04), mkMat(0xff4d8d,1.6)); s.position.set(0,0.8+i*0.9,-0.38); g.add(s); }
  g.userData={kind:'block'}; return g;
}
function buildWallSpike(theme){
  // a neon hazard mounted on a side wall — clear it with a wall-jump
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.25,1.5), darkMat()); g.add(body);
  for(const sy of[-0.62,0.62]){ const glow=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.2,1.6), mkMat(theme,2.2)); glow.position.y=sy; g.add(glow); }
  const chev=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.0,1.1), mkMat(0xffd23f,1.9)); chev.position.x=-0.42; g.add(chev);
  g.userData={kind:'wallspike'}; return g;
}
function buildCoin(){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0xffd23f, emissive:0xffb000, emissiveIntensity:1.1, roughness:0.25, metalness:0.6});
  const coin=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.1,20), mat); coin.rotation.x=Math.PI/2; g.add(coin);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.45,0.06,8,22), new THREE.MeshStandardMaterial({color:0xfff3b0,emissive:0xffe24a,emissiveIntensity:1.4,metalness:0.6,roughness:0.2}));
  g.add(rim);
  g.userData={kind:'coin'}; return g;
}
function buildPower(type){
  const g=new THREE.Group();
  const color = type==='magnet'?0x2ee6ff : type==='shield'?0x51ffb0 : 0xffd23f;
  const bubble=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55,0), new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.9,transparent:true,opacity:0.32,roughness:0.2}));
  g.add(bubble);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.62,0.05,8,28), mkMat(color,2.0)); g.add(ring);
  let icon;
  if(type==='magnet'){ icon=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.07,8,16,Math.PI), mkMat(color,2.2)); icon.rotation.z=Math.PI; 
    const t1=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.18,0.09),mkMat(color,2.2)); t1.position.set(-0.2,-0.12,0); 
    const t2=t1.clone(); t2.position.x=0.2; icon.add(t1); icon.add(t2);}
  else if(type==='shield'){ icon=new THREE.Mesh(new THREE.SphereGeometry(0.26,16,16,0,Math.PI*2,0,Math.PI*0.6), mkMat(color,2.2)); icon.rotation.x=Math.PI; }
  else { const shape=new THREE.Shape(); shape.moveTo(0.05,0.3); shape.lineTo(-0.18,0.02); shape.lineTo(0,0.02); shape.lineTo(-0.05,-0.3); shape.lineTo(0.2,0.05); shape.lineTo(0.02,0.05); shape.lineTo(0.05,0.3);
    icon=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:0.08,bevelEnabled:false}), mkMat(color,2.4)); icon.position.z=-0.04; }
  g.add(icon);
  g.userData={kind:'power', ptype:type}; return g;
}

// ---------- manager ----------
export class Entities{
  constructor(scene){
    this.scene=scene;
    this.obstacles=[]; this.coins=[]; this.powers=[];
    this._pool={low:[],high:[],block:[],coin:[],power:[],wallspike:[]};
    this.theme=0x2ee6ff;
  }
  setTheme(c){ this.theme=c; }

  _get(kind){
    const p=this._pool[kind];
    if(p.length){ const e=p.pop(); e.group.visible=true; return e; }
    let group;
    if(kind==='low')group=buildLow(this.theme);
    else if(kind==='high')group=buildHigh(this.theme);
    else if(kind==='block')group=buildBlock(this.theme);
    else if(kind==='wallspike')group=buildWallSpike(this.theme);
    else if(kind==='coin')group=buildCoin();
    else group=buildPower('boost');
    this.scene.add(group);
    return {group, kind};
  }
  _release(e){ e.group.visible=false; this._pool[e.kind].push(e); }

  addObstacle(kind, lane, z){
    const e=this._get(kind);
    // refresh neon colour to theme for low/high/block edges
    e.group.position.set(LANES[lane], 0, z); e.lane=lane; e.collided=false;
    this.obstacles.push(e); return e;
  }
  addCoin(lane, z, y=1.0, x=null){ const e=this._get('coin'); e.group.position.set(x==null?LANES[lane]:x, y, z); e.lane=lane; e.taken=false; this.coins.push(e); return e; }
  addWallSpike(side, z){ const e=this._get('wallspike'); e.group.position.set(side*(WALL_X+0.2), WALL_Y, z); e.side=side; e.lane=null; e.collided=false; this.obstacles.push(e); return e; }
  addPower(type, lane, z){
    const p=this._pool.power.pop();
    let e;
    if(p){ e=p; this.scene.remove(e.group); }
    e = {group:buildPower(type), kind:'power', ptype:type};
    this.scene.add(e.group);
    e.group.position.set(LANES[lane],1.3,z); e.lane=lane; e.taken=false; e.ptype=type;
    this.powers.push(e); return e;
  }

  clear(){
    for(const arr of [this.obstacles,this.coins,this.powers]){
      for(const e of arr){ e.group.visible=false; this._pool[e.kind].push(e); }
      arr.length=0;
    }
  }

  update(dt, speed, ctx){
    const dz=speed*dt;
    // obstacles
    for(let i=this.obstacles.length-1;i>=0;i--){ const e=this.obstacles[i]; e.group.position.z+=dz;
      if(e.group.position.z>RECYCLE_Z){ this._release(e); this.obstacles.splice(i,1); } }
    // coins
    for(let i=this.coins.length-1;i>=0;i--){ const e=this.coins[i]; const g=e.group; g.position.z+=dz; g.rotation.y+=dt*4;
      if(ctx.magnet && !e.taken){
        const dx=ctx.x-g.position.x, dzz=ctx.z-g.position.z, d=Math.hypot(dx,dzz);
        if(d<9 && g.position.z<ctx.z+2){ g.position.x+=dx*Math.min(1,dt*6); g.position.z+=dzz*Math.min(1,dt*6); g.position.y+= ((ctx.y+1)-g.position.y)*Math.min(1,dt*6); }
      }
      if(g.position.z>RECYCLE_Z){ this._release(e); this.coins.splice(i,1); } }
    // powers
    for(let i=this.powers.length-1;i>=0;i--){ const e=this.powers[i]; const g=e.group; g.position.z+=dz; g.rotation.y+=dt*1.6; g.children[0].rotation.x+=dt*1.2; g.position.y=1.3+Math.sin(performance.now()*0.004)*0.12;
      if(g.position.z>RECYCLE_Z){ e.group.visible=false; this._pool.power.push(e); this.powers.splice(i,1); } }
  }
}

// ---------- pattern generator ----------
export function spawnRow(ent, level, rng){
  const z = SPAWN_Z;
  const R = ()=>rng();
  const pick = (arr)=>arr[Math.floor(R()*arr.length)];
  const roll = R();

  // coins helper: a run of coins down a lane
  const coinRun=(lane,startZ,n,gap=2.2,yFn=null)=>{ for(let i=0;i<n;i++){ ent.addCoin(lane, startZ-i*gap, yFn?yFn(i):1.0); } };

  if(roll<0.14){
    // pure coin line
    const lane=Math.floor(R()*3); coinRun(lane, z, 7);
  } else if(roll<0.34){
    // jump barriers (1-2 lanes) + coin arc over one
    const blocked = R()<0.5 ? [Math.floor(R()*3)] : pick([[0,1],[1,2],[0,2]]);
    for(const l of blocked) ent.addObstacle('low', l, z);
    const arcLane = blocked[0];
    coinRun(arcLane, z+1, 5, 1.6, i=> 1.0 + Math.sin((i/4)*Math.PI)*2.0 );
    // coins in a free lane too
    const free=[0,1,2].find(l=>!blocked.includes(l)); if(free!=null && R()<0.6) coinRun(free, z-2, 4);
  } else if(roll<0.50){
    // slide beam across all lanes
    for(let l=0;l<3;l++) ent.addObstacle('high', l, z);
    coinRun(1, z-5, 6);
  } else if(roll<0.63){
    // full block in one lane, coins in adjacent
    const bl=Math.floor(R()*3); ent.addObstacle('block', bl, z);
    const adj = bl===0?1 : bl===2?1 : pick([0,2]); coinRun(adj, z-1, 6);
    if(R()<0.4){ const l2=[0,1,2].find(l=>l!==bl&&l!==adj); ent.addObstacle('low', l2, z+ -1); }
  } else if(roll<0.77){
    // zigzag low barriers leaving a path
    const seq=[Math.floor(R()*3)];
    for(let i=1;i<3;i++){ let n; do{ n=Math.floor(R()*3); }while(n===seq[i-1]); seq.push(n); }
    seq.forEach((lane,i)=>{ ent.addObstacle('low', lane, z-i*7); const free=[0,1,2].find(l=>l!==lane); coinRun(free, z-i*7, 3,1.6); });
  } else if(roll<0.89){
    // WALL RUN: leap to a side wall, wall-jump the spikes, then ride past the wall of blocks
    const side = R()<0.5?-1:1;
    const wx = side*WALL_X;
    const outerLane = side<0?0:2;
    coinRun(outerLane, z+10, 5, 2.0);                  // pull toward the outer lane first
    for(let i=0;i<8;i++) ent.addCoin(null, z+5 - i*1.9, WALL_Y, wx);  // ribbon up onto the wall
    // spikes sit AHEAD of the block wall so they're never hidden behind it
    ent.addWallSpike(side, z-3);
    if(R()<0.7) ent.addWallSpike(side, z-10);
    for(let l=0;l<3;l++) ent.addObstacle('block', l, z-16);          // wall of blocks (ride past it on the wall)
    coinRun(1, z-25, 4);                               // back into the lanes after
  } else {
    // power-up + coins
    const type=pick(['magnet','shield','boost']);
    const lane=Math.floor(R()*3); ent.addPower(type, lane, z);
    coinRun(lane, z-3, 5);
    if(R()<0.5) ent.addObstacle('low', [0,1,2].find(l=>l!==lane), z);
  }
}
