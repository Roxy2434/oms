/** Collection button label with the amount it will record (shared by server page and client actions). */
export const collectLabel=(kind:'prepaid'|'cod'|'fee',amount:number)=>({prepaid:'Ghi nhận thu trả trước',cod:'Ghi chứng từ thu COD',fee:'Thu phí giao còn thiếu'}[kind]+' · '+amount.toLocaleString('vi-VN')+' ₫');
