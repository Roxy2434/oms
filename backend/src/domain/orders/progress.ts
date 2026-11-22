// What the order list shows as "Tình trạng": derived from the order, its parcels, money and returns (nothing new is stored),
// using the same completion projection as the order page so the list and the page never disagree.
import {projectCompletion} from './completion';
import {returnDeductions} from '../payments/balances';

export const progressLabels={
 nhap:'Nháp',cho_hang:'Chờ hàng',cho_dong_goi:'Chờ đóng gói',cho_ban_giao:'Chờ bàn giao',dang_giao:'Đang giao',giao_that_bai:'Giao thất bại',
 tra_hang:'Đang xử lý trả hàng',cho_tra_soat:'Chờ tra soát tiền',cho_thu_tien:'Đã giao – chờ thu tiền',cho_hoan_tien:'Chờ hoàn tiền',
 hoan_tat:'Hoàn tất',da_huy:'Đã hủy',dang_xu_ly:'Đang xử lý',
} as const;
export type Progress=keyof typeof progressLabels;
const tones:Record<Progress,'blue'|'green'|'amber'|'red'>={nhap:'blue',cho_hang:'amber',cho_dong_goi:'blue',cho_ban_giao:'blue',dang_giao:'blue',giao_that_bai:'red',tra_hang:'amber',cho_tra_soat:'amber',cho_thu_tien:'amber',cho_hoan_tien:'amber',hoan_tat:'green',da_huy:'red',dang_xu_ly:'blue'};

type Order={status:string;shipments:{status:string}[];transactions:{kind:string;status:string;amount:unknown}[];returns:Parameters<typeof returnDeductions>[0]};

/** `value` = effectiveValue(order) from the caller. Least-advanced parcel step wins, so a two-parcel order reads
 * e.g. "Đang giao (1/2 kiện)" until both parcels are through. */
export function orderProgress(o:Order,value:number):{code:Progress;label:string;tone:'blue'|'green'|'amber'|'red'}{
 const out=(code:Progress,count?:[number,number])=>({code,tone:tones[code],label:progressLabels[code]+(count&&count[1]>1&&count[0]<count[1]?` (${count[0]}/${count[1]} kiện)`:'')});
 if(o.status==='NHAP')return out('nhap');if(o.status==='CHO_HANG')return out('cho_hang');
 const ok=(t:{kind:string;status:string})=>t.status==='THANH_CONG';
 const net=o.transactions.reduce((s,t)=>s+(ok(t)?(t.kind==='THU'?1:-1)*Number(t.amount):0),0);
 const pending=o.transactions.filter(t=>['CHO_XAC_NHAN','CHUA_RO'].includes(t.status)).length;
 const c=projectCompletion({status:o.status,shipmentStatuses:o.shipments.map(s=>s.status),returnStatuses:o.returns.map(r=>r.status),pendingTransactions:pending,netCollected:net,effectiveValue:value,returnRefundObligation:returnDeductions(o.returns),waived:0});
 if(o.status==='DA_HUY')return c.refundDue>0||pending?out(pending?'cho_tra_soat':'cho_hoan_tien'):out('da_huy');
 if(c.complete)return out('hoan_tat');
 const active=o.shipments.filter(s=>s.status!=='HUY'),n=active.length,count=(...st:string[])=>active.filter(s=>st.includes(s.status)).length;
 if(count('GIAO_THAT_BAI'))return out('giao_that_bai',[count('GIAO_THAT_BAI'),n]);
 for(const [status,code] of [['DANG_GIU','cho_dong_goi'],['CHO_BAN_GIAO','cho_ban_giao'],['DANG_GIAO','dang_giao']] as const)if(count(status))return out(code,[count(status),n]);
 if(count('CHUYEN_HOAN')||!c.returnsDone)return out('tra_hang');
 if(pending)return out('cho_tra_soat');if(c.collectDue>0)return out('cho_thu_tien');if(c.refundDue>0)return out('cho_hoan_tien');
 return out('dang_xu_ly');
}
