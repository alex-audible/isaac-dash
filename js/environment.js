import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export const LEVELS = [
  { name:'DAWN GRID',   skyTop:0x5a3aa6, skyBot:0xff9bb0, fog:0xc98bb8, sun:0xffe6a0, neon:0x2ee6ff, build:0x3a2c7a, amb:0x6a5aaa, goal:760, speed:17 },
  { name:'NEON NIGHT',  skyTop:0x0a0a30, skyBot:0x3a1170, fog:0x1d1456, sun:0xff4d8d, neon:0xff4d8d, build:0x241a55, amb:0x352a66, goal:900, speed:19 },
  { name:'CYBER STORM', skyTop:0x05202a, skyBot:0x0a5a55, fog:0x0a4a4a, sun:0x51ffb0, neon:0x51ffb0, build:0x123a44, amb:0x1c4a4a, goal:1040, speed:21 },
  { name:'SOLAR FLARE', skyTop:0x3a1248, skyBot:0xff7a2a, fog:0xc25a3a, sun:0xffd23f, neon:0xffd23f, build:0x4a1f48, amb:0x6a3a4a, goal:1180, speed:23 },
  { name:'VOID PULSE',  skyTop:0x10081f, skyBot:0x431a7a, fog:0x1a0e40, sun:0xb15bff, neon:0xb15bff, build:0x281456, amb:0x2e1a55, goal:1320, speed:25 },
];

function gradTexture(top, bot){
  const c = document.createElement('canvas'); c.width=8; c.height=256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#'+top.toString(16).padStart(6,'0'));
  g.addColorStop(1,'#'+bot.toString(16).padStart(6,'0'));
  ctx.fillStyle=g; ctx.fillRect(0,0,8,256);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

function roadTexture(){
  const s=512, c=document.createElement('canvas'); c.width=s; c.height=s;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#0d0a24'; ctx.fillRect(0,0,s,s);
  // panel shading
  for(let i=0;i<4;i++){ ctx.fillStyle=i%2?'#100c2c':'#0b0820'; ctx.fillRect(i*s/4,0,s/4,s); }
  // rungs (motion seams)
  ctx.fillStyle='rgba(120,140,255,0.16)';
  for(let y=0;y<s;y+=64){ ctx.fillRect(0,y,s,4); }
  // bright leading rung
  ctx.fillStyle='rgba(170,200,255,0.30)';
  for(let y=0;y<s;y+=128){ ctx.fillRect(0,y,s,3); }
  // lane dividers (dashed)
  ctx.fillStyle='rgba(255,255,255,0.55)';
  for(const x of [s/3, 2*s/3]){ for(let y=0;y<s;y+=64){ ctx.fillRect(x-3,y,6,34); } }
  const t=new THREE.CanvasTexture(c);
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace;
  return t;
}

function windowTexture(){
  const s=128, c=document.createElement('canvas'); c.width=s;c.height=s;
  const ctx=c.getContext('2d'); ctx.fillStyle='#0a0820'; ctx.fillRect(0,0,s,s);
  for(let y=8;y<s;y+=18) for(let x=8;x<s;x+=16){
    ctx.fillStyle = Math.random()<0.5 ? 'rgba(120,200,255,0.9)' : (Math.random()<0.5?'rgba(255,120,200,0.85)':'rgba(255,230,120,0.7)');
    if(Math.random()<0.28) ctx.fillStyle='rgba(20,18,46,1)';
    ctx.fillRect(x,y,9,10);
  }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

function wallTexture(){
  const w=256,h=256,c=document.createElement('canvas'); c.width=w;c.height=h;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#0a0820'; ctx.fillRect(0,0,w,h);
  // vertical neon ribs (vary along track → convey speed when scrolled)
  ctx.fillStyle='rgba(255,255,255,0.9)';
  for(let x=0;x<w;x+=64){ ctx.fillRect(x,0,5,h); }
  ctx.fillStyle='rgba(255,255,255,0.5)';
  for(let x=32;x<w;x+=64){ ctx.fillRect(x,0,2,h); }
  // horizontal panel seams
  ctx.fillStyle='rgba(120,150,255,0.22)';
  for(let y=0;y<h;y+=40){ ctx.fillRect(0,y,w,2); }
  // bright base strip (track level, near canvas bottom)
  ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillRect(0,h-26,w,9);
  const t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace;
  return t;
}

export class World{
  constructor(canvas){
    this.renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 600);
    this.camera.position.set(0,4.6,9.6);
    this.camera.lookAt(0,1.3,-14);

    this.scene.fog = new THREE.Fog(0x1d1456, 34, 178);

    // lights
    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0x241a55, 1.05); this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.55); this.key.position.set(6,12,6); this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight(0x5fd0ff, 0.9); this.rim.position.set(-6,5,-8); this.scene.add(this.rim);
    this.amb = new THREE.AmbientLight(0x404060, 0.6); this.scene.add(this.amb);

    // sky + sun
    this.scene.background = gradTexture(0x0a0a30, 0x3a1170);
    const sunMat = new THREE.MeshBasicMaterial({color:0xffe6a0});
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(20,40), sunMat);
    this.sun.position.set(0,28,-260); this.scene.add(this.sun);
    this.sunGlow = new THREE.Mesh(new THREE.CircleGeometry(40,40), new THREE.MeshBasicMaterial({color:0xffe6a0, transparent:true, opacity:0.22}));
    this.sunGlow.position.set(0,28,-262); this.scene.add(this.sunGlow);

    // road
    const rt = roadTexture(); rt.repeat.set(1, 26);
    this.roadTex = rt;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 460),
      new THREE.MeshStandardMaterial({map:rt, roughness:0.7, metalness:0.2, emissive:0x0a1430, emissiveIntensity:0.5}));
    road.rotation.x = -Math.PI/2; road.position.set(0,0,-140); this.scene.add(road);

    // glowing rails
    this.railMat = new THREE.MeshStandardMaterial({color:0x2ee6ff, emissive:0x2ee6ff, emissiveIntensity:2.2, roughness:0.3});
    for(const sx of [-5.75,5.75]){
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,460), this.railMat);
      rail.position.set(sx,0.16,-140); this.scene.add(rail);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,460), this.railMat);
      rail2.position.set(sx,0.92,-140); this.scene.add(rail2);
    }
    // under-glow strip beneath road
    const glowStrip = new THREE.Mesh(new THREE.PlaneGeometry(11.5,460),
      new THREE.MeshBasicMaterial({color:0x2ee6ff, transparent:true, opacity:0.12}));
    glowStrip.rotation.x=-Math.PI/2; glowStrip.position.set(0,-0.35,-140); this.scene.add(glowStrip);
    this.glowStrip = glowStrip;

    // tall side walls (you can leap onto these and wall-run)
    this.wallTex = wallTexture(); this.wallTex.repeat.set(26,1.6);
    this.wallMat = new THREE.MeshStandardMaterial({ map:this.wallTex, emissiveMap:this.wallTex, emissive:0x2ee6ff, emissiveIntensity:1.25, color:0x0a0820, roughness:0.6, metalness:0.2 });
    this.walls=[];
    for(const side of [-1,1]){
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(460,8.5), this.wallMat);
      wall.position.set(side*6.5, 3.0, -140); wall.rotation.y = side<0?Math.PI/2:-Math.PI/2;
      this.scene.add(wall); this.walls.push(wall);
    }

    // pylons (moving side posts)
    this.pylonMat = new THREE.MeshStandardMaterial({color:0xff4d8d, emissive:0xff4d8d, emissiveIntensity:2.2, roughness:0.3});
    this.pylons=[];
    for(let i=0;i<14;i++){
      const grp=new THREE.Group();
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.2,3.2,0.2), this.pylonMat); post.position.y=1.6;
      const top=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,0.5), this.pylonMat); top.position.y=3.2;
      grp.add(post); grp.add(top);
      const side = i%2?1:-1; grp.userData.side=side;
      grp.position.set(side*6.6, 0, -(i*26));
      this.scene.add(grp); this.pylons.push(grp);
    }

    // city buildings
    this.winTex = windowTexture();
    this.buildMat = new THREE.MeshStandardMaterial({map:this.winTex, color:0x241a55, emissive:0x6a78ff, emissiveIntensity:0.32, roughness:0.8});
    this.buildings=[];
    for(let i=0;i<30;i++){
      const h = 8+Math.random()*42;
      const w = 5+Math.random()*9;
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w), this.buildMat);
      const side=Math.random()<0.5?-1:1;
      b.position.set(side*(13+Math.random()*40), h/2-6, -(Math.random()*460));
      b.userData={side, h};
      this.scene.add(b); this.buildings.push(b);
    }

    // clouds
    this.clouds=[];
    const cloudTex = (()=>{ const s=128,c=document.createElement('canvas');c.width=s;c.height=s;const x=c.getContext('2d');
      const g=x.createRadialGradient(s/2,s/2,4,s/2,s/2,s/2); g.addColorStop(0,'rgba(255,255,255,0.85)');g.addColorStop(1,'rgba(255,255,255,0)');
      x.fillStyle=g;x.fillRect(0,0,s,s); const t=new THREE.CanvasTexture(c); return t; })();
    for(let i=0;i<16;i++){
      const m=new THREE.Mesh(new THREE.PlaneGeometry(30,18), new THREE.MeshBasicMaterial({map:cloudTex,transparent:true,opacity:0.5,depthWrite:false}));
      m.position.set((Math.random()-0.5)*160, 12+Math.random()*40, -(Math.random()*460));
      m.userData.spin=(Math.random()-0.5)*0.1;
      this.scene.add(m); this.clouds.push(m);
    }

    // bloom composer
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.85, 0.55, 0.72);
    this.composer.addPass(this.bloom);

    this._roadOffset=0;
    this.applyTheme(0, true);
  }

  applyTheme(i, instant=false){
    const t = LEVELS[i % LEVELS.length];
    this.scene.background = gradTexture(t.skyTop, t.skyBot);
    this.scene.fog.color.setHex(t.fog);
    this.sun.material.color.setHex(t.sun); this.sunGlow.material.color.setHex(t.sun);
    this.railMat.color.setHex(t.neon); this.railMat.emissive.setHex(t.neon);
    this.glowStrip.material.color.setHex(t.neon);
    this.wallMat.emissive.setHex(t.neon);
    this.pylonMat.color.setHex(t.neon===0xff4d8d?0x2ee6ff:0xff4d8d); this.pylonMat.emissive.copy(this.pylonMat.color);
    this.buildMat.color.setHex(t.build);
    this.hemi.color.setHex(t.fog); this.amb.color.setHex(t.amb);
    this.rim.color.setHex(t.neon);
  }

  update(dt, speed){
    // scroll road
    this._roadOffset += (speed*dt)/ (460/26);
    this.roadTex.offset.y = this._roadOffset;
    this.wallTex.offset.x = this._roadOffset;
    // pylons
    for(const p of this.pylons){
      p.position.z += speed*dt;
      if(p.position.z > 16){ p.position.z -= 14*26; }
    }
    // buildings
    for(const b of this.buildings){
      b.position.z += speed*dt*0.92;
      if(b.position.z > 30){ b.position.z -= 460 + Math.random()*60; b.position.x = b.userData.side*(13+Math.random()*40); }
    }
    // clouds
    for(const c of this.clouds){
      c.position.z += speed*dt*0.45;
      c.position.x += c.userData.spin;
      c.lookAt(this.camera.position.x, c.position.y, this.camera.position.z);
      if(c.position.z > 40){ c.position.z -= 460; c.position.x=(Math.random()-0.5)*160; c.position.y=12+Math.random()*40; }
    }
    this.sun.lookAt(this.camera.position.x, this.sun.position.y, 0);
    this.sunGlow.lookAt(this.camera.position.x, this.sunGlow.position.y, 0);
  }

  render(){ this.composer.render(); }

  resize(){
    this.camera.aspect = innerWidth/innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }
}
