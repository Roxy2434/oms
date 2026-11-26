// Frozen pre-demo prices. Re-running preparation always uses these halves, never halves an already reduced price.
export const demoCatalog=[
 ['BT-750-XANH','Bình giữ nhiệt 750ml','Xanh','Bình nước',125000,450,250000],
 ['HT-1200','Hộp thực phẩm 1.200ml','Trong suốt','Đồ bếp',45000,300,90000],
 ['CH-500','Cốc thủy tinh 500ml','','Đồ uống',32500,320,65000],
 ['KT-SET','Khăn tắm cotton','Xám','Gia dụng',60000,350,120000],
 ['DC-3','Dao bếp bộ 3','','Đồ bếp',92500,600,185000],
 ['TH-5','Thùng đựng 5L','Trắng','Lưu trữ',37500,400,75000],
 ['BD-28','Chảo chống dính 28cm','','Đồ bếp',160000,850,320000],
 ['KH-2','Khay inox chữ nhật','','Đồ bếp',55000,500,110000],
 ['TG-1','Túi giữ nhiệt','Xanh','Gia dụng',72500,250,145000],
 ['CB-6','Bộ cốc 6 chiếc','','Đồ uống',105000,1200,210000],
] as const;
// ATP targets before each round. Existing reservations/QC/quarantine are retained separately.
export const demoMatrix:Record<string,readonly [number,number,number]>={
 'BT-750-XANH':[120,0,0],'HT-1200':[0,120,0],'CH-500':[80,80,80],
 'KT-SET':[0,0,0],'DC-3':[0,0,120],'TH-5':[80,80,80],
 'BD-28':[120,0,0],'KH-2':[0,120,0],'TG-1':[0,0,120],'CB-6':[80,80,80],
};
