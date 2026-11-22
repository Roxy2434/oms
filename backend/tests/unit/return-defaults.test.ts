import {describe,it,expect} from 'vitest';
import {causeFromReason,defaultRefund} from '../../src/domain/returns/labels';
describe('return inspection defaults',()=>{
 it('pre-selects the cause from the buyer reason',()=>{
  expect(causeFromReason('ShopVui: Giao sai hàng (sai size, sai màu, sai sản phẩm)',false)).toBe('SHOP_GIAO_SAI');
  expect(causeFromReason('Thiếu hàng, thiếu phụ kiện',false)).toBe('SHOP_GIAO_SAI');
  expect(causeFromReason('Hàng khác với mô tả',false)).toBe('SHOP_GIAO_SAI');
  expect(causeFromReason('Hàng bị lỗi, hư hỏng',false)).toBe('SAN_XUAT');
  expect(causeFromReason('Đổi ý, không còn nhu cầu',false)).toBe('KHACH_HANG');
  expect(causeFromReason('Giao sai hàng',true)).toBe('VAN_CHUYEN');
 });
 it('refunds passed units plus failed ones not caused by the customer',()=>{
  expect(defaultRefund(1,1,'KHACH_HANG',true)).toBe(1);
  expect(defaultRefund(1,1,'SHOP_GIAO_SAI',true)).toBe(2);
  expect(defaultRefund(0,2,'VAN_CHUYEN',true)).toBe(2);
  expect(defaultRefund(0,2,'SAN_XUAT',true)).toBe(2);
  expect(defaultRefund(2,0,'KHACH_HANG',false)).toBe(0);
 });
});
