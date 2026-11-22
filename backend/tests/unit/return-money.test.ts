import {it,expect} from 'vitest';
import {moneyPosition,returnDeductions,returnRefundCapacity,codRefundPool,type Money} from '../../src/domain/payments/balances';
const line=(price:number)=>({refundQuantity:1,shipmentLine:{shipmentId:'S',orderLine:{priceSnapshot:price}}});
const tx=(id:string,kind:string,reason:string,amount:number,extra:Partial<Money>={}):Money=>({id,kind,reason,amount,status:'THANH_CONG',...extra});
const parcels=[{id:'S',codAmount:100000}];
it('prepaid sender-return refund lowers the obligation, so nothing is left to collect',()=>{
 const r={id:'R',status:'DA_DONG',kind:'CHUYEN_HOAN',waivedAmount:0,lines:[line(100000)]};
 const total=Math.max(0,130000-returnDeductions([r])),b=moneyPosition([tx('a','THU','THU_TRA_TRUOC',130000),tx('b','HOAN','HOAN_RMA',100000,{returnId:'R'})]);
 expect(total-(b.net+b.pendingCollect)).toBe(0);
});
it('waived COD sender-return is deducted once, not again by its refund lines',()=>{
 expect(returnDeductions([{status:'DA_DONG',kind:'CHUYEN_HOAN',waivedAmount:100000,lines:[line(100000)]}])).toBe(100000);
});
it('COD collected net after a customer return owes no refund',()=>{
 const r={id:'R',status:'DA_DONG',kind:'KHACH_TRA',waivedAmount:0,lines:[line(40000)]};
 const total=Math.max(0,100000-returnDeductions([r])),rows=[tx('a','THU','THU_COD',total,{shipmentId:'S'})];
 expect(total).toBe(60000);expect(codRefundPool(rows,[r],parcels,'R').remaining).toBe(0);expect(returnRefundCapacity(r,'COD',rows,[r],parcels)).toBe(0);
});
it('COD collected in full before a customer return still refunds the returned goods',()=>{
 const r={id:'R',status:'CHO_HOAN_TIEN',kind:'KHACH_TRA',waivedAmount:0,lines:[line(40000)]},rows=[tx('a','THU','THU_COD',100000,{shipmentId:'S'})];
 expect(returnRefundCapacity(r,'COD',rows,[r],parcels)).toBe(40000);
 const after=[...rows,tx('b','HOAN','HOAN_RMA',40000,{returnId:'R'})];expect(codRefundPool(after,[r],parcels,'R')).toEqual({feasible:true,remaining:0});
});
