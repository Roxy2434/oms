// Entirely fictional identities and contact details, for local coursework only.
export const customers=[
 {id:'KH-001',name:'Nguyễn Thùy Linh',phone:'0984627310',email:'thuy.linh@khachhang.example'},
 {id:'KH-002',name:'Trần Thu Hà',phone:'0915732846',email:'thu.ha@khachhang.example'},
 {id:'KH-003',name:'Lê Hoàng Nam',phone:'0938264157',email:'hoang.nam@khachhang.example'},
 {id:'KH-004',name:'Phạm Anh Thư',phone:'0973418625',email:'anh.thu@khachhang.example'},
 {id:'KH-005',name:'Nguyễn Hải Yến',phone:'0906835724',email:'hai.yen@khachhang.example'},
 {id:'KH-006',name:'Đặng Minh Khang',phone:'0962541837',email:'minh.khang@khachhang.example'},
 {id:'KH-007',name:'Võ Bảo Ngọc',phone:'0947183265',email:'bao.ngoc@khachhang.example'},
 {id:'KH-008',name:'Bùi Thanh Sơn',phone:'0928367145',email:'thanh.son@khachhang.example'},
 {id:'KH-009',name:'Trần Khánh Vy',phone:'0395826417',email:'khanh.vy@khachhang.example'},
 {id:'KH-010',name:'Lê Gia Huy',phone:'0386741529',email:'gia.huy@khachhang.example'}
];
const streets:Record<string,string[]>={
 'HN-NOITHANH':['Nguyễn Văn Cừ, Long Biên, Hà Nội','Hoàng Quốc Việt, Cầu Giấy, Hà Nội','Trần Phú, Hà Đông, Hà Nội','Lê Văn Lương, Thanh Xuân, Hà Nội'],
 'DN-NOITHANH':['Nguyễn Văn Linh, Hải Châu, Đà Nẵng','Điện Biên Phủ, Thanh Khê, Đà Nẵng','Ngô Quyền, Sơn Trà, Đà Nẵng','Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng'],
 'HCM-NOITHANH':['Phan Văn Trị, Gò Vấp, TP. Hồ Chí Minh','Nguyễn Thị Thập, Quận 7, TP. Hồ Chí Minh','Lê Văn Sỹ, Quận 3, TP. Hồ Chí Minh','Cộng Hòa, Tân Bình, TP. Hồ Chí Minh']
};
export function shippingAddress(index:number,region:string){return `${24+index*17} ${streets[region]?.[index%4]??streets['HN-NOITHANH'][index%4]}`;}
export const warehouses=[
 {id:'KHO-HN',name:'Kho Hà Nội',region:'HN',address:'186 Nguyễn Văn Cừ, Long Biên, Hà Nội'},
 {id:'KHO-DN',name:'Kho Đà Nẵng',region:'DN',address:'82 Điện Biên Phủ, Thanh Khê, Đà Nẵng'},
 {id:'KHO-HCM',name:'Kho TP. Hồ Chí Minh',region:'HCM',address:'215 Phan Văn Trị, Gò Vấp, TP. Hồ Chí Minh'}
];
