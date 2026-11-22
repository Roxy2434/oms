import {estimateRoute,ROUTING_POLICY,type RouteEstimate} from './routing';
export interface AllocationLine {id:string;skuId:string;quantity:number;weightGrams:number;name:string}
export interface AllocationWarehouse {id:string;name:string;region:string;stock:Record<string,number>;packingFee?:number|null;handlingHours?:number;queueHours?:number}
export interface AllocatedParcel {warehouseId:string;warehouseName:string;items:{lineId:string;skuId:string;name:string;quantity:number}[];grams:number;freight:number;packing:number;etaHours:number;route:RouteEstimate}
export interface AllocationPlan {parcels:AllocatedParcel[];totalCost:number;etaHours:number;policy:typeof ROUTING_POLICY;explanation:string;estimated:boolean}
const packing:Record<string,number>={'KHO-HN':5000,'KHO-DN':4000,'KHO-HCM':6000};
/** The existing sample tariff is deliberately retained; this is not a carrier quote. */
export function freight(grams:number,sameRegion:boolean){if(!Number.isSafeInteger(grams)||grams<=0)throw new Error('Trọng lượng phải là số nguyên dương.');return (sameRegion?15000:32000)+Math.max(0,Math.ceil((grams-1000)/500))*(sameRegion?5000:7000);}
function parcel(w:AllocationWarehouse,lines:AllocationLine[],quantities:number[],destination:string,route:RouteEstimate):AllocatedParcel|null{
 const items=lines.flatMap((l,i)=>quantities[i]>0?[{lineId:l.id,skuId:l.skuId,name:l.name,quantity:quantities[i]}]:[]);if(!items.length)return null;
 const grams=lines.reduce((s,l,i)=>s+l.weightGrams*quantities[i],0),region=w.region.replace(/-NOITHANH$/,'');
 return {warehouseId:w.id,warehouseName:w.name,items,grams,freight:freight(grams,destination===region+'-NOITHANH'),packing:w.packingFee??packing[w.id]??packing['KHO-'+region],etaHours:route.etaHours,route};
}
function plan(parcels:AllocatedParcel[]):AllocationPlan{
 const estimated=true;
 return {parcels,totalCost:parcels.reduce((s,p)=>s+p.freight+p.packing,0),etaHours:Math.max(...parcels.map(p=>p.etaHours)),policy:ROUTING_POLICY,
 estimated,
 explanation:(parcels.length===1?'Một kho đủ toàn đơn và đạt SLA mẫu: chọn tổng cước + đóng gói thấp nhất.':'Không có phương án một kho đạt tồn/SLA mẫu: chọn cách chia tối đa hai kho có tổng cước + đóng gói thấp nhất.')+' Tính theo vùng giao hàng và bảng phí/thời gian mẫu, không theo khoảng cách địa lý. ETA gồm xử lý kho, hàng chờ và vận chuyển; không phải cam kết hãng.'};
}
export function comparePlans(a:AllocationPlan,b:AllocationPlan){
 return a.totalCost-b.totalCost||a.etaHours-b.etaHours||JSON.stringify(a.parcels.map(p=>[p.warehouseId,p.items.map(i=>i.quantity)])).localeCompare(JSON.stringify(b.parcels.map(p=>[p.warehouseId,p.items.map(i=>i.quantity)])));
}
export function solveAllocation(lines:AllocationLine[],warehouses:AllocationWarehouse[],destination:string,maxEtaHours=24):AllocationPlan|null{
 if(!['HN-NOITHANH','DN-NOITHANH','HCM-NOITHANH'].includes(destination)||!Number.isFinite(maxEtaHours)||maxEtaHours<=0||lines.length===0||lines.length>5||new Set(lines.map(l=>l.skuId)).size!==lines.length||lines.some(l=>!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>5||!Number.isSafeInteger(l.weightGrams)||l.weightGrams<=0))return null;
 const seen=new Set<string>();const candidates=warehouses.flatMap(w=>{
  const region=w.region.replace(/-NOITHANH$/,'');if(seen.has(w.id)||!['HN','DN','HCM'].includes(region)||w.packingFee!=null&&(!Number.isSafeInteger(w.packingFee)||w.packingFee<0)||lines.some(l=>!Number.isSafeInteger(w.stock[l.skuId]??0)||(w.stock[l.skuId]??0)<0))return [];
  seen.add(w.id);const route=estimateRoute(w.region,destination,w.handlingHours??2,w.queueHours??0);
  return route&&route.etaHours<=Math.min(24,maxEtaHours)?[{w,route}]:[];
 }).sort((a,b)=>a.w.id.localeCompare(b.w.id));
 const singles=candidates.filter(({w})=>lines.every(l=>(w.stock[l.skuId]??0)>=l.quantity)).map(({w,route})=>plan([parcel(w,lines,lines.map(l=>l.quantity),destination,route)!]));
 if(singles.length)return singles.sort(comparePlans)[0];
 let best:AllocationPlan|null=null;
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j];if(lines.some(l=>(a.w.stock[l.skuId]??0)+(b.w.stock[l.skuId]??0)<l.quantity))continue;
  function visit(index:number,quantities:number[]){
   if(index===lines.length){const pa=parcel(a.w,lines,quantities,destination,a.route),pb=parcel(b.w,lines,lines.map((l,k)=>l.quantity-quantities[k]),destination,b.route);if(!pa||!pb)return;const candidate=plan([pa,pb]);if(!best||comparePlans(candidate,best)<0)best=candidate;return;}
   const l=lines[index];for(let take=Math.max(0,l.quantity-(b.w.stock[l.skuId]??0));take<=Math.min(l.quantity,a.w.stock[l.skuId]??0);take++)visit(index+1,[...quantities,take]);
  }visit(0,[]);
 }
 return best;
}
