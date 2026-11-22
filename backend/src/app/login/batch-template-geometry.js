import {Mesh} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Only static opaque meshes are batched. Every animated subtree from the source is excluded.
// This preserves the supplied geometry/material appearance, but avoids thousands of draw calls.
export function batchTemplateGeometry(hub){
 const moving=new Set([
  ...hub.asrsCranes.map(x=>x.group),...hub.drones.map(x=>x.group),
  ...hub.monorailCarriers.map(x=>x.mesh),...hub.spurBoxes.map(x=>x.mesh),
  ...hub.robots.flatMap(x=>[x.turret,x.lowerArm,x.upperArm]),
  ...hub.wrappers.flatMap(x=>[x.turntable,x.filmCarriage]),
  hub.forklift1,hub.forkliftCarriage,hub.detailedTruck,hub.barrierArmPivot,hub.laserCurtain,hub.omsHoloCore,
  ...hub.hvacFans,...hub.conveyorBoxes.map(x=>x.mesh),...hub.agvFleet.map(x=>x.mesh),
  ...hub.serverBlinkLeds.map(x=>x.mesh),...hub.pulsePackets.flatMap(x=>[x.core,x.halo]),
 ]);
 hub.scene.updateMatrixWorld(true);const batches=new Map();
 hub.modelRoot.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||mesh.material.transparent||mesh.material.transmission>0)return;
  for(let ancestor=mesh;ancestor;ancestor=ancestor.parent)if(moving.has(ancestor))return;
  const json=mesh.material.toJSON();delete json.uuid;delete json.metadata;
  const key=JSON.stringify([json,mesh.castShadow,mesh.receiveShadow]);
  let batch=batches.get(key);if(!batch){batch={material:mesh.material,meshes:[],geometries:[]};batches.set(key,batch);}
  let geometry=mesh.geometry.clone();geometry.clearGroups();if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose();}geometry.applyMatrix4(mesh.matrixWorld);batch.meshes.push(mesh);batch.geometries.push(geometry);
 });
 const retiredGeometry=new Set(),retiredMaterials=new Set();
 for(const batch of batches.values()){
  if(batch.meshes.length<2){batch.geometries.forEach(g=>g.dispose());continue;}
  const geometry=mergeGeometries(batch.geometries,false);batch.geometries.forEach(g=>g.dispose());if(!geometry)continue;
  const mesh=new Mesh(geometry,batch.material);mesh.castShadow=batch.meshes[0].castShadow;mesh.receiveShadow=batch.meshes[0].receiveShadow;hub.scene.add(mesh);
  for(const original of batch.meshes){retiredGeometry.add(original.geometry);retiredMaterials.add(original.material);original.removeFromParent();}
 }
 hub.scene.traverse(mesh=>{retiredGeometry.delete(mesh.geometry);retiredMaterials.delete(mesh.material);});
 retiredGeometry.forEach(g=>g.dispose());retiredMaterials.forEach(m=>m.dispose());
}
