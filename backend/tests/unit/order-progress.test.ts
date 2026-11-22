import {describe,it,expect} from 'vitest';
import {orderProgress} from '../../src/domain/orders/progress';
const order=(status:string,shipments:string[],money:{kind:string;status:string;amount:number}[]=[],returns:string[]=[])=>({status,shipments:shipments.map(s=>({status:s})),transactions:money,returns:returns.map(s=>({status:s,kind:'KHACH_TRA',waivedAmount:0,lines:[]}))});
const paid={kind:'THU',status:'THANH_CONG',amount:100000};
describe('order progress (list "Tình trạng")',()=>{
 it('maps unconfirmed and cancelled orders',()=>{
  expect(orderProgress(order('NHAP',[]),100000).code).toBe('nhap');
  expect(orderProgress(order('CHO_HANG',[]),100000).code).toBe('cho_hang');
  expect(orderProgress(order('DA_HUY',['HUY']),0).code).toBe('da_huy');
  expect(orderProgress(order('DA_HUY',['HUY'],[paid]),0).code).toBe('cho_hoan_tien');
 });
 it('takes the least-advanced parcel and counts parcels',()=>{
  expect(orderProgress(order('DA_XAC_NHAN',['DANG_GIU']),100000).label).toBe('Chờ đóng gói');
  expect(orderProgress(order('DA_XAC_NHAN',['DANG_GIAO','DA_GIAO']),100000).label).toBe('Đang giao (1/2 kiện)');
  expect(orderProgress(order('DA_XAC_NHAN',['DANG_GIU','DANG_GIAO','HUY']),100000).label).toBe('Chờ đóng gói (1/2 kiện)');
  expect(orderProgress(order('DA_XAC_NHAN',['GIAO_THAT_BAI','DANG_GIU']),100000).code).toBe('giao_that_bai');
 });
 it('after delivery: money, returns, completion',()=>{
  expect(orderProgress(order('DA_XAC_NHAN',['DA_GIAO']),100000).code).toBe('cho_thu_tien');
  expect(orderProgress(order('DA_XAC_NHAN',['DA_GIAO'],[{kind:'THU',status:'CHUA_RO',amount:100000}]),100000).code).toBe('cho_tra_soat');
  expect(orderProgress(order('DA_XAC_NHAN',['DA_GIAO'],[paid],['CHO_NHAN']),100000).code).toBe('tra_hang');
  expect(orderProgress(order('DA_XAC_NHAN',['CHUYEN_HOAN']),100000).code).toBe('tra_hang');
  const done=orderProgress(order('DA_XAC_NHAN',['DA_GIAO'],[paid],['DA_DONG']),100000);
  expect([done.code,done.tone]).toEqual(['hoan_tat','green']);
 });
});
