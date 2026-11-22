'use client';
import {useRouter} from 'next/navigation';
import {startTransition} from 'react';
export default function ErrorPage({reset}:{reset:()=>void}){const router=useRouter();return <div className="error-box" role="alert"><h2>Chưa tải được tổng quan</h2><p>Dữ liệu chưa sẵn sàng. Hãy kiểm tra kết nối và thử lại; không có thao tác nào được ghi nhận tại đây.</p><button className="button" onClick={()=>startTransition(()=>{router.refresh();reset();})}>Thử lại</button></div>}
