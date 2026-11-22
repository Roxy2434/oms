import type {AllocationWarehouse} from './solver';
/** Ignore retired coordinate columns. They remain in storage only to preserve historical data/migrations. */
export function allocationWarehouse(w:{id:string;name:string;region:string;packingFee?:number|null;handlingHours?:number;queueHours?:number;inventory:{skuId:string;sellable:number;reserved:number;safety:number}[]}):AllocationWarehouse{
 return {id:w.id,name:w.name,region:w.region,packingFee:w.packingFee,handlingHours:w.handlingHours,queueHours:w.queueHours,stock:Object.fromEntries(w.inventory.map(i=>[i.skuId,Math.max(0,i.sellable-i.reserved-i.safety)]))};
}
