import { db } from '@/server/db';
import { requireAccount } from '@/server/auth';
import { DraftForm } from '@/features/orders/draft-form';
export const dynamic='force-dynamic';
export default async function NewOrder(){await requireAccount();const [customers,skus]=await Promise.all([db.customer.findMany({orderBy:{name:'asc'}}),db.sku.findMany({where:{active:true},orderBy:{name:'asc'}})]);return <><div className="page-heading"><div><h1>Tạo đơn hàng</h1><p>Chọn khách và sản phẩm, xem kho xuất cùng phí giao ngay bên dưới rồi tạo đơn và xác nhận.</p></div></div><DraftForm customers={customers.map(c=>({id:c.id,name:c.name,phone:c.phone,address:c.address??'',city:c.city}))} skus={skus.map(s=>({id:s.id,name:s.name,price:s.price.toFixed(0)}))}/></>}
