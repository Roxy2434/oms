// Plain module so both server pages and client forms can read the labels.
export type DamageCause='VAN_CHUYEN'|'KHACH_HANG'|'SAN_XUAT'|'SHOP_GIAO_SAI';
export const causeNames:Record<DamageCause,string>={VAN_CHUYEN:'Do vận chuyển (lập biên bản đòi hãng)',KHACH_HANG:'Do khách (đã mở, dùng, làm hỏng)',SAN_XUAT:'Lỗi sản phẩm / nhà sản xuất',SHOP_GIAO_SAI:'Shop giao sai / thiếu hàng'};
export const claimKindNames:Record<string,string>={HU_HONG:'Hư hỏng khi vận chuyển',THAT_LAC:'Thất lạc (hãng hoàn về thiếu)'};
/** Buyer's stated reason → the likely cause, pre-selected at inspection (the warehouse can change it). */
export function causeFromReason(reason:string,senderReturn:boolean):DamageCause{
 if(senderReturn)return 'VAN_CHUYEN';
 if(/sai hàng|giao sai|thiếu|khác với mô tả|không đúng mô tả|hàng giả|hàng nhái/i.test(reason))return 'SHOP_GIAO_SAI';
 if(/lỗi|hư hỏng|hỏng/i.test(reason))return 'SAN_XUAT';
 return 'KHACH_HANG';
}
/** Default number of units to refund after QC: passed units, plus failed ones unless the customer damaged them; COD sender returns refund nothing. */
export function defaultRefund(passed:number,failed:number,cause:DamageCause,refundAllowed:boolean){return refundAllowed?passed+(cause==='KHACH_HANG'?0:failed):0;}
