export type DashboardRole='QUAN_LY'|'NHAN_VIEN';
export interface RecentOrder {id:string;customer:string;channel:string;status:string;createdAt:string;amount:string;}
export interface WorkItem {key:string;label:string;count:number;href:string;tone:'blue'|'amber'|'red';}
export interface WarehouseSummary {id:string;name:string;region:string;sellable:number;reserved:number;qc:number;available:number;}
export interface ManagerMetrics {newOrders:number;effectiveValue:string;collected:string;refunded:string;split:{numerator:number;denominator:number};onTime:{numerator:number;denominator:number};days:{date:string;label:string;orders:number}[];}
export interface DashboardData {role:DashboardRole;updatedAt:string;period:number;channel:string;work:WorkItem[];warehouses:WarehouseSummary[];recent:RecentOrder[];manager?:ManagerMetrics;}
