import * as THREE from 'three';

// ---- avatar catalogue ----------------------------------------------------
export const AVATARS = [
  { id:'pixel', name:'Pixel',  cost:0,   kind:'robot',  body:0x39d6ff, body2:0x1b9fd8, head:0x9af0ff, accent:0xffe24a, eye:0x0a2a40 },
  { id:'bolt',  name:'Bolt',   cost:60,  kind:'mech',   body:0xffd23f, body2:0xe2a200, head:0xfff0b0, accent:0xff4d8d, eye:0x3a2a00 },
  { id:'nyx',   name:'Nyx',    cost:160, kind:'cat',    body:0xff5fae, body2:0xd62f86, head:0xffc0e0, accent:0x2ee6ff, eye:0x35103a },
  { id:'vortex',name:'Vortex', cost:320, kind:'ninja',  body:0x7b46ff, body2:0x4a25c2, head:0xc4a8ff, accent:0x51ffb0, eye:0x16092e },
  { id:'astra', name:'Astra',  cost:550, kind:'astro',  body:0xf2f1ff, body2:0xc8c6e8, head:0x223055, accent:0xff8a3d, eye:0x99e8ff },
  { id:'glitch',name:'Glitch', cost:850, kind:'alien',  body:0x51ffb0, body2:0x1fc785, head:0x9fffd8, accent:0xff4d8d, eye:0x07251a },
];

export function avatarById(id){ return AVATARS.find(a=>a.id===id) || AVATARS[0]; }

function mat(color, opts={}){
  return new THREE.MeshStandardMaterial({
    color, roughness:opts.rough ?? 0.45, metalness:opts.metal ?? 0.15,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1,
    flatShading: !!opts.flat,
  });
}
function box(w,h,d,m){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); }
function sph(r,m,seg=18){ return new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg), m); }
function cap(r,len,m){ return new THREE.Mesh(new THREE.CapsuleGeometry(r,len,6,14), m); }

// Build a runnable avatar. Returns { group, parts }.
export function buildAvatar(def){
  const g = new THREE.Group();
  const bob = new THREE.Group(); g.add(bob);
  const bodyMat = mat(def.body,{rough:0.4});
  const body2Mat = mat(def.body2,{rough:0.45});
  const headMat = mat(def.head,{rough:0.4});
  const accMat  = mat(def.accent,{emissive:def.accent, ei:0.6, rough:0.3});
  const darkMat = mat(0x1a1830,{rough:0.6});

  // torso
  const torso = cap(0.32, 0.42, bodyMat); torso.position.y = 1.02; bob.add(torso);
  const chest = box(0.5,0.34,0.34, body2Mat); chest.position.y=1.14; bob.add(chest);
  // belly accent stripe
  const stripe = box(0.52,0.08,0.36, accMat); stripe.position.y=1.0; bob.add(stripe);

  // head
  const head = new THREE.Group(); head.position.y=1.62; bob.add(head);
  const skull = sph(0.3, headMat); head.add(skull);
  // eyes (face -Z forward)
  const eyeWhiteMat = mat(0xffffff,{rough:0.2});
  const eyeMat = mat(def.eye,{emissive:def.accent, ei:0.2});
  for(const sx of [-0.12,0.12]){
    const ew = sph(0.085, eyeWhiteMat,14); ew.position.set(sx,0.03,-0.25); ew.scale.set(1,1.15,0.6); head.add(ew);
    const ep = sph(0.045, eyeMat,12); ep.position.set(sx,0.02,-0.31); head.add(ep);
  }

  // legs
  const legGeoM = body2Mat;
  function leg(side){
    const grp = new THREE.Group(); grp.position.set(0.14*side,0.7,0);
    const thigh = cap(0.13,0.34,legGeoM); thigh.position.y=-0.27; grp.add(thigh);
    const foot = box(0.2,0.12,0.34, accMat); foot.position.set(0,-0.56,0.05); grp.add(foot);
    bob.add(grp); return grp;
  }
  const legL = leg(-1), legR = leg(1);

  // arms
  function arm(side){
    const grp = new THREE.Group(); grp.position.set(0.34*side,1.28,0);
    const upper = cap(0.1,0.32,bodyMat); upper.position.y=-0.22; grp.add(upper);
    const hand = sph(0.12, accMat,14); hand.position.y=-0.46; grp.add(hand);
    bob.add(grp); return grp;
  }
  const armL = arm(-1), armR = arm(1);

  const extra = {};
  // ---- per-kind silhouette (mostly readable from BEHIND while running) ----
  switch(def.kind){
    case 'robot': {
      const ant = cap(0.03,0.18,darkMat); ant.position.set(0,0.34,0); head.add(ant);
      const bulb = sph(0.07, accMat,12); bulb.position.set(0,0.5,0); head.add(bulb);
      const pack = box(0.34,0.34,0.16, body2Mat); pack.position.set(0,1.1,0.26); bob.add(pack);
      const t1=sph(0.07,accMat,12),t2=sph(0.07,accMat,12); t1.position.set(-0.12,0.92,0.32); t2.position.set(0.12,0.92,0.32); bob.add(t1); bob.add(t2);
      break; }
    case 'mech': {
      const visor = box(0.5,0.12,0.06, accMat); visor.position.set(0,0.02,-0.27); head.add(visor);
      const fin = box(0.05,0.34,0.22, accMat); fin.position.set(0,0.28,0.04); head.add(fin);
      const pack = box(0.4,0.4,0.18, darkMat); pack.position.set(0,1.12,0.27); bob.add(pack);
      for(const sx of[-0.12,0.12]){ const j=sph(0.08,accMat,12); j.position.set(sx,0.9,0.34); bob.add(j); }
      break; }
    case 'cat': {
      for(const sx of [-0.16,0.16]){ const ear=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.22,4),headMat); ear.position.set(sx,0.32,0); ear.rotation.y=Math.PI/4; head.add(ear);
        const inner=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.13,4),accMat); inner.position.set(sx,0.31,-0.02); inner.rotation.y=Math.PI/4; head.add(inner); }
      const tail = new THREE.Group(); tail.position.set(0,0.85,0.3);
      let prev=tail; for(let i=0;i<4;i++){ const seg=cap(0.07-i*0.012,0.12,i%2?accMat:bodyMat); const j=new THREE.Group(); j.position.set(0,0,0.16); seg.position.set(0,0,0.08); j.add(seg); prev.add(j); prev=j; }
      bob.add(tail); extra.tail=tail;
      break; }
    case 'ninja': {
      const band = box(0.62,0.12,0.62, darkMat); band.position.set(0,0.06,0); head.add(band);
      const eyeband = box(0.62,0.1,0.02, accMat); eyeband.position.set(0,0.06,-0.3); head.add(eyeband);
      const sash1=box(0.07,0.5,0.04,accMat); sash1.position.set(-0.16,0.16,0.32); sash1.rotation.z=0.3; head.add(sash1);
      const sash2=box(0.07,0.62,0.04,accMat); sash2.position.set(-0.22,-0.05,0.34); sash2.rotation.z=0.45; head.add(sash2);
      const sword=cap(0.04,0.7,mat(0xcfd8ff,{metal:0.7,rough:0.2})); sword.position.set(0.18,1.2,0.3); sword.rotation.set(0.5,0,-0.5); bob.add(sword);
      const hilt=box(0.12,0.1,0.1,accMat); hilt.position.set(0.05,0.85,0.34); bob.add(hilt);
      break; }
    case 'astro': {
      const helmet = sph(0.34, mat(0xffffff,{rough:0.15,metal:0.1})); helmet.scale.set(1,1,1.02); head.add(helmet);
      const glass = sph(0.27, mat(0x0a1428,{metal:0.6,rough:0.1,emissive:def.accent,ei:0.15})); glass.position.z=-0.08; glass.scale.set(1.05,0.9,0.7); head.add(glass);
      const stripe2=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.03,8,24),accMat); stripe2.position.z=-0.02; head.add(stripe2);
      const pack = box(0.42,0.5,0.24, body2Mat); pack.position.set(0,1.05,0.3); bob.add(pack);
      for(const sx of[-0.13,0.13]){ const noz=cap(0.05,0.1,accMat); noz.position.set(sx,0.78,0.4); bob.add(noz); }
      break; }
    case 'alien': {
      head.scale.set(1.05,1.15,1);
      for(const sx of[-0.14,0.14]){ const stalk=cap(0.025,0.16,headMat); stalk.position.set(sx,0.34,0); head.add(stalk); const eye=sph(0.09,mat(0x111,{emissive:def.accent,ei:0.8})); eye.position.set(sx,0.46,0); head.add(eye); }
      const fin=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.5,3),accMat); fin.position.set(0,1.2,0.3); fin.rotation.x=-0.3; bob.add(fin);
      const spots=[[0.1,1.2,0.3],[-0.12,1.05,0.32],[0.05,0.95,0.33]]; for(const s of spots){ const d=sph(0.05,accMat,10); d.position.set(...s); bob.add(d); }
      break; }
  }

  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
  return { group:g, parts:{ bob, legL, legR, armL, armR, head, ...extra } };
}

// ---- offscreen thumbnail renderer (front view) ---------------------------
export function renderThumbnails(){
  const size = 220;
  const r = new THREE.WebGLRenderer({antialias:true, alpha:true});
  r.setSize(size,size); r.setPixelRatio(2);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  cam.position.set(0, 1.05, 4.6); cam.lookAt(0,0.95,0);
  scene.add(new THREE.HemisphereLight(0xdde6ff, 0x2a2350, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2,4,3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6ad0ff, 1.2); rim.position.set(-3,2,-2); scene.add(rim);
  const out = {};
  for(const def of AVATARS){
    const { group } = buildAvatar(def);
    group.rotation.y = Math.PI + 0.45;  // show face + a hint of the back detail
    scene.add(group);
    r.render(scene, cam);
    out[def.id] = r.domElement.toDataURL('image/png');
    scene.remove(group);
    group.traverse(o=>{ if(o.isMesh){ o.geometry.dispose(); if(o.material.map)o.material.map.dispose(); o.material.dispose(); } });
  }
  r.dispose();
  return out;
}
