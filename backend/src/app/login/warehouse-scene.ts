import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export type WarehouseController={setPlaying:(value:boolean)=>void;setVisible:(value:boolean)=>void;rotate:(direction:number)=>void;reset:()=>void;dispose:()=>void};
export function mountWarehouse(host:HTMLDivElement,onUnavailable:()=>void):WarehouseController{
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setClearColor(0xeff4fc,0);renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.className='warehouse-canvas';
 const scene=new THREE.Scene();
 const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,60);camera.position.set(8,7,10);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.7,0);controls.enableDamping=false;controls.enableZoom=false;controls.enablePan=false;controls.minPolarAngle=.55;controls.maxPolarAngle=1.3;controls.autoRotateSpeed=.1;controls.update();controls.saveState();renderer.domElement.style.touchAction='pan-y';
 scene.add(new THREE.HemisphereLight(0xffffff,0x9cabc2,2.5));
 const key=new THREE.DirectionalLight(0xfff5e6,4.2);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:25});key.shadow.bias=-.0003;key.shadow.normalBias=.025;scene.add(key);scene.add(key.target);
 const fill=new THREE.DirectionalLight(0xddeaff,1.8);fill.position.set(5,4,-5);scene.add(fill);
 const materials:THREE.Material[]=[];const textures:THREE.Texture[]=[];
 function material(color:number,roughness=.75,metalness=.03){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;}
 const white=material(0xf4f7fc),edge=material(0xe0e8f3),blue=material(0x2860c7,.4,.18),blueEdge=material(0x18488f),glass=material(0x91b6d2,.25,.2),asphalt=material(0xd6e0ed),dark=material(0x263b51),silver=material(0xaab7c6,.4,.3),tan=material(0xd8a76a),tape=material(0xf7e0b7),paper=material(0xfffcf3),green=material(0x67a28c),terracotta=material(0xe3bca0);
 const model=new THREE.Group();scene.add(model);
 function block(w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=model,r=.035){const geometry=r?new RoundedBoxGeometry(w,h,d,2,r):new THREE.BoxGeometry(w,h,d);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cylinder(radius:number,height:number,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=model){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,16),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 try{
  block(8.6,.22,6.7,white,0,-.12,0,model,.12);
  block(7.9,.035,5.95,asphalt,0,.01,.05,model,.08);
  // Raised warehouse footprint and curb.
  block(4.8,.14,3.35,edge,-.8,.1,-.7,model,.06);
  const building=new THREE.Group();building.position.set(-.8,.17,-.7);model.add(building);
  block(4.2,1.9,2.65,white,0,.95,0,building,.035);
  // True gabled roof, with modeled fascia and skylights.
  const slope=.3;
  const leftRoof=block(2.24,.12,2.94,blue,-1.05,2.18,0,building,.025);leftRoof.rotation.z=slope;
  const rightRoof=block(2.24,.12,2.94,blue,1.05,2.18,0,building,.025);rightRoof.rotation.z=-slope;
  for(const z of [-1.36,1.36]){const shape=new THREE.Shape();shape.moveTo(-2.1,0);shape.lineTo(2.1,0);shape.lineTo(0,.64);shape.closePath();const gable=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),white);gable.position.set(0,1.88,z);gable.castShadow=true;building.add(gable);}
  for(const x of [-1.2,-.45,.45,1.2]){const skylight=block(.25,.035,1.95,glass,x,2.51-Math.abs(x)*.3,0,building,.01);skylight.rotation.z=x<0?slope:-slope;}
  // Loading doors and their separate slats give the model actual depth.
  for(const x of [-1.34,0,1.34]){block(1.05,1.14,.05,blueEdge,x,.69,1.35,building,.012);block(.91,.99,.025,dark,x,.66,1.385,building,.005);const open=x===0;for(let n=0;n<(open?3:7);n++)block(.9,.065,.025,silver,x,(open?1.01:.24)+n*.13,1.408,building,.004);block(1.13,.08,.4,edge,x,.12,1.52,building,.01);for(const dx of [-.55,.55])cylinder(.035,.35,tan,x+dx,.18,1.72,building);}
  block(3.96,.24,.04,glass,0,1.57,1.35,building,.005);
  for(let x=-1.8;x<2;x+=.45)block(.035,.26,.065,white,x,1.57,1.38,building,.002);
  for(let z=-1.05;z<=1.1;z+=.55){block(.04,.4,.34,glass,-2.12,1.42,z,building,.003);block(.04,.4,.34,glass,2.12,1.42,z,building,.003);}
  const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;const ctx=labelCanvas.getContext('2d');if(ctx){ctx.fillStyle='#f4f7fc';ctx.fillRect(0,0,256,64);ctx.fillStyle='#2557ae';ctx.font='700 45px sans-serif';ctx.textAlign='center';ctx.fillText('EZMART',128,48);const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const labelMaterial=new THREE.MeshBasicMaterial({map:texture});materials.push(labelMaterial);const label=new THREE.Mesh(new THREE.PlaneGeometry(.9,.225),labelMaterial);label.position.set(0,2.12,1.44);building.add(label);}
  // Pallets and packages, all generated locally, no external 3D assets.
  function parcel(x:number,y:number,z:number,size=.4,parent:THREE.Object3D=model){const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);block(size,size,size,tan,0,size/2,0,group,.018);block(size*.2,.012,size+.012,tape,0,size+.005,0,group,.003);block(size*.37,size*.3,.012,paper,-size*.13,size*.51,size/2+.008,group,.002);return group;}
  function pallet(x:number,z:number){for(const dx of [-.36,0,.36])block(.17,.1,.9,tan,x+dx,.1,z,model,.008);for(const dz of [-.3,0,.3])block(1.02,.04,.18,tape,x,.17,z+dz,model,.003);}
  pallet(-2.85,2.22);parcel(-3.1,.2,2.02);parcel(-2.6,.2,2.02);parcel(-3.1,.2,2.5);parcel(-2.85,.62,2.24);
  pallet(2.55,-1.98);parcel(2.35,.2,-2.17,.5);parcel(2.91,.2,-2.17,.5);parcel(2.65,.73,-2.17,.5);
  // A conveyor across the foreground, with individually modeled rollers.
  block(3.9,.13,.57,dark,-.15,.48,1.95,model,.025);
  for(let x=-1.95;x<1.8;x+=.22){const roller=cylinder(.045,.54,silver,x,.57,1.95);roller.rotation.x=Math.PI/2;}
  for(const x of [-1.65,1.35])for(const z of [1.75,2.15])block(.06,.42,.06,silver,x,.25,z,model,.004);
  const moving=[parcel(-1.3,.6,1.95,.32),parcel(0,.6,1.95,.37),parcel(1.1,.6,1.95,.32)];
  // Delivery van with wheels, windows, lamps and a loading compartment.
  const van=new THREE.Group();van.position.set(2.8,0,.8);model.add(van);
  block(.95,.62,1.26,blue,0,.72,-.36,van,.07);block(.95,.51,.65,white,0,.62,.6,van,.055);block(.83,.26,.036,glass,0,.84,.938,van,.01);block(.036,.22,.37,glass,-.49,.84,.63,van,.007);block(.036,.22,.37,glass,.49,.84,.63,van,.007);block(1.02,.12,.1,silver,0,.38,.99,van,.01);block(1,.12,.1,silver,0,.38,-1.02,van,.01);
  for(const x of [-.49,.49])for(const z of [-.72,.69]){const wheel=cylinder(.2,.14,dark,x,.24,z,van);wheel.rotation.z=Math.PI/2;const hub=cylinder(.1,.15,silver,x,.24,z,van);hub.rotation.z=Math.PI/2;}
  for(const x of [-.32,.32])block(.17,.1,.04,tape,x,.53,.97,van,.01);
  // Small landscaping and parking lines, not extra animated effects.
  for(const z of [-2.65,2.65]){block(.6,.28,.55,terracotta,-3.65,.18,z,model,.05);const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,1),green);shrub.position.set(-3.65,.6,z);shrub.castShadow=true;model.add(shrub);}
  for(const x of [1.97,3.62])block(.04,.012,2.5,white,x,.042,.86,model,.002);
  for(let z=-2.5;z<2.7;z+=.65)block(.03,.012,.27,white,3.93,.041,z,model,.001);
  // Static floor underneath catches the real directional shadows.
  const shadow=new THREE.ShadowMaterial({color:0x54729a,opacity:.12});materials.push(shadow);const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),shadow);ground.rotation.x=-Math.PI/2;ground.position.y=-.25;ground.receiveShadow=true;scene.add(ground);
  host.append(renderer.domElement);
  let disposed=false,playing=false,visible=true,raf=0,last=0,elapsed=0,frames=0;
  function render(){if(disposed||!visible)return;renderer.render(scene,camera);host.dataset.frames=String(++frames);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.pose=camera.position.toArray().map(n=>n.toFixed(3)).join(',');}
  function tick(now:number){if(disposed||!playing||!visible)return;if(!last)last=now;if(now-last>=32){const delta=Math.min((now-last)/1000,.1);last=now;elapsed+=delta;controls.update(delta);moving.forEach((item,index)=>{item.position.x=((elapsed*.23+index*1.18)%3.45)-1.86;});render();}raf=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(raf);last=0;controls.autoRotate=playing;host.dataset.playing=String(playing&&visible);if(playing&&visible)raf=requestAnimationFrame(tick);else render();}
  const change=()=>{if(!playing)render();};controls.addEventListener('change',change);
  const resize=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;if(width<=0||height<=0)return;const aspect=width/height,half=Math.max(6.4,10.7/aspect)/2;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(width,height,false);render();});resize.observe(host);
  function rotate(direction:number){camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),direction*.22).add(controls.target);controls.update();render();}
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resize.disconnect();controls.removeEventListener('change',change);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set<THREE.BufferGeometry>();scene.traverse(object=>{if(object instanceof THREE.Mesh)geometries.add(object.geometry);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  function lost(event:Event){event.preventDefault();dispose();onUnavailable();}
  renderer.domElement.addEventListener('webglcontextlost',lost);
  render();
  return {setPlaying(value){playing=value;sync();},setVisible(value){visible=value;sync();},rotate,reset(){controls.reset();render();},dispose};
 }catch(error){controls.dispose();scene.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();throw error;}
}
