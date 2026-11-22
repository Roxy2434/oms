'use client';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
const Chart=dynamic(()=>import('./orders-chart'),{ssr:false,loading:()=> <p role="status">Đang tải biểu đồ…</p>});
export function ReportChart({days,channel}:{days:{date:string;label:string;orders:number}[];channel:string}){const router=useRouter();return <section className="panel chart-panel" style={{marginBottom:24}}><div className="panel-head"><div><h2>Đơn theo ngày</h2><p>Cùng chuỗi số liệu với dashboard; bấm ngày để xem đơn nguồn.</p></div></div><Chart days={days} onSelect={date=>router.push(`/orders?date=${date}&channel=${channel}`)}/></section>;}
