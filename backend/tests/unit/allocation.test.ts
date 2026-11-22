import {describe,it,expect} from 'vitest';
import {solveAllocation,freight,type AllocationLine,type AllocationWarehouse} from '../../src/domain/allocation/solver';
import {estimateRoute} from '../../src/domain/allocation/routing';
const line={id:'l',skuId:'s',name:'S',quantity:1,weightGrams:500};
const warehouse:AllocationWarehouse={id:'KHO-HN',name:'HN',region:'HN',stock:{s:5}};
describe('DOM-REGION-V3 cost within feasible region/SLA policy',()=>{
 it('rejects invalid inputs, shortages and impossible SLA',()=>{
  expect(solveAllocation([line],[warehouse],'UNKNOWN')).toBeNull();
  expect(solveAllocation([line],[warehouse],'HN-NOITHANH',5)).toBeNull();
  expect(solveAllocation([line],[{...warehouse,stock:{s:0}}],'HN-NOITHANH')).toBeNull();
  for(const weight of [0,-1,NaN,Infinity,1.2])expect(solveAllocation([{...line,weightGrams:weight}],[warehouse],'HN-NOITHANH')).toBeNull();
  expect(solveAllocation([line,line],[warehouse],'HN-NOITHANH')).toBeNull();
  expect(solveAllocation([line],[{...warehouse,handlingHours:25}],'HN-NOITHANH')).toBeNull();
  expect(solveAllocation([line],[{...warehouse,stock:{s:NaN}}],'HN-NOITHANH')).toBeNull();
 });
 it('keeps existing freight and weight boundaries',()=>{
  expect([1000,1001,1500,1501].map(g=>freight(g,true))).toEqual([15000,20000,20000,25000]);
  expect([1000,1001,1500,1501].map(g=>freight(g,false))).toEqual([32000,39000,39000,46000]);
 });
 it('chooses minimum freight plus packing, not retired coordinates',()=>{
  const expensive={...warehouse,id:'A',packingFee:9000,latitude:21.0285,longitude:105.8542};
  const cheap={...warehouse,id:'B',packingFee:0,latitude:0,longitude:0};
  const p=solveAllocation([line],[expensive,cheap],'HN-NOITHANH')!;
  expect(p.parcels[0].warehouseId).toBe('B');expect(p.policy).toBe('DOM-REGION-V3');expect(p.totalCost).toBe(15000);
  expect(p).not.toHaveProperty('distanceRankKm');expect(p.parcels[0].route).not.toHaveProperty('distanceKm');
 });
 it('never splits a feasible single; otherwise chooses cheapest feasible two-warehouse allocation',()=>{
  const two={...line,quantity:2},a={...warehouse,id:'A',stock:{s:1},packingFee:5000},b={...warehouse,id:'B',stock:{s:1},packingFee:6000},c={...warehouse,id:'C',stock:{s:2},packingFee:0};
  expect(solveAllocation([two],[a,b,c],'HN-NOITHANH')!.parcels.map(p=>p.warehouseId)).toEqual(['C']);
  const split=solveAllocation([two],[a,b,{...c,stock:{s:1}}],'HN-NOITHANH')!;
  expect(split.parcels.map(p=>p.warehouseId)).toEqual(['A','C']);expect(split.parcels.reduce((n,p)=>n+p.items[0].quantity,0)).toBe(2);
 });
 it('keeps default region ETAs and rejects routes exceeding the 24h sample commitment',()=>{
  expect(estimateRoute('HN','HN')?.etaHours).toBe(6);
  expect(estimateRoute('HN','DN')?.etaHours).toBe(15.75);
  expect(estimateRoute('HCM','HN')?.etaHours).toBe(22);
  expect(solveAllocation([line],[{...warehouse,region:'HCM'}],'HN-NOITHANH')!.parcels[0].etaHours).toBe(22);
  expect(solveAllocation([line],[{...warehouse,region:'HCM',queueHours:3}],'HN-NOITHANH')).toBeNull();
  expect(estimateRoute('UNKNOWN','HN')).toBeNull();
 });
 it('matches an independent exhaustive cost oracle for 500 generated inputs',()=>{
  let seed=42013;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
  for(let c=0;c<500;c++){
   const lines:AllocationLine[]=[0,1].map(i=>({id:'l'+i,skuId:'s'+i,name:'SKU'+i,quantity:1+rng()%3,weightGrams:[500,1000,1501][rng()%3]}));
   const pack=[5000,4000,6000];
   const ws:AllocationWarehouse[]=[0,1,2].map(i=>({id:'w'+i,name:'W'+i,region:'HN',packingFee:pack[i],stock:{s0:rng()%4,s1:rng()%4}}));
   const options:{used:number;cost:number}[]=[];
   for(let a=0;a<=lines[0].quantity;a++)for(let b=0;b<=lines[0].quantity-a;b++)for(let x=0;x<=lines[1].quantity;x++)for(let y=0;y<=lines[1].quantity-x;y++){
    const amounts=[[a,x],[b,y],[lines[0].quantity-a-b,lines[1].quantity-x-y]],used=amounts.filter(q=>q[0]+q[1]>0).length;
    if(used>2||amounts.some((q,w)=>q.some((n,i)=>n>(ws[w].stock['s'+i]??0))))continue;
    const cost=amounts.reduce((sum,q,w)=>{const g=q.reduce((s,n,i)=>s+n*lines[i].weightGrams,0);return sum+(g?15000+(g<=1000?0:Math.floor((g-1001)/500)+1)*5000+pack[w]:0);},0);
    options.push({used,cost});
   }
   options.sort((a,b)=>a.used-b.used||a.cost-b.cost);const plan=solveAllocation(lines,ws,'HN-NOITHANH');
   if(!options.length)expect(plan).toBeNull();else{expect(plan!.parcels.length).toBe(options[0].used);expect(plan!.totalCost).toBe(options[0].cost);for(const l of lines)expect(plan!.parcels.flatMap(p=>p.items).filter(i=>i.skuId===l.skuId).reduce((n,i)=>n+i.quantity,0)).toBe(l.quantity);}
  }
 });
});
