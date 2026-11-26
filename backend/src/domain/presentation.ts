import {resolveOrderId} from './orders/identifiers';
// Stable display aliases only: original financial/stock/audit evidence is never rewritten.
function compactCode(value:string){let hash=2166136261;for(const c of value){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(36).toUpperCase().padStart(7,'0');}
export function documentLabel(value:string){if(value.startsWith('DEMO-THU-'))return 'PT-'+resolveOrderId(value.slice(9));if(value.startsWith('DEMO-HOAN-'))return 'PC-'+resolveOrderId(value.slice(10));if(value.startsWith('DEMO-COD-'))return 'COD-'+compactCode(value.slice(9));if(value.startsWith('DEMO-')){const resolved=resolveOrderId(value);return resolved!==value?resolved:'VD-'+compactCode(value.slice(5));}if(value.startsWith('seed-stock-'))return 'PN-'+compactCode(value);if(value==='demo-business-split-extra-bottle')return 'PN-2610-00031';return value;}
export function narrativeLabel(value:string){
 return value
  .replace('KHOI_TAO_DEMO — số dư mở đầu có nguồn','Nhập tồn đầu kỳ theo biên bản kiểm kê KK-2610-001')
  .replace('Bổ sung có chứng từ cho đơn demo tách kho, giữ một phương án preview riêng','Nhập bổ sung bình giữ nhiệt theo phiếu PN-2610-00031')
  .replace(/Khách gửi trả trong bài demo\s+[A-Z0-9-]+/gi,'Khách yêu cầu đổi trả theo chính sách cửa hàng')
  .replace(/Móp do hãng vận chuyển trong bài demo/gi,'Thùng hàng móp góc do va đập khi trung chuyển')
  .replace(/Còn nguyên seal\s*[—–-]\s*bài demo/gi,'Sản phẩm còn nguyên tem niêm phong')
  .replace(/Khách từ chối nhận hàng\s*[—–-]\s*bài demo/gi,'Khách từ chối nhận hàng tại điểm giao')
  .replace(/Khoản hoàn chưa rõ phục vụ bài demo mô phỏng/gi,'Giao dịch hoàn tiền đang chờ đối soát kết quả')
  .replace(/Kiểm kê\/bổ sung đầu lượt demo\s+[^;]+;/gi,'Kiểm kê bổ sung tồn kho đầu kỳ;')
  .replace(/\s*[—–-]\s*dữ liệu demo/gi,'')
  .replace(/\s*[—–-]\s*bài demo/gi,'')
  .replace(/\bDEMO-V1\b/g,'Biểu phí nội địa V1')
  .replace(/\(demo\)/gi,'')
  .replace(/\bdemo\b/gi,'khởi tạo')
  .trim();
}
