'use client';
import {useRouter} from 'next/navigation';
import {startTransition} from 'react';
export default function ErrorPage({reset}:{reset:()=>void}){const router=useRouter();return <section className="error-box" role="alert"><h1>Chưa tải được dữ liệu</h1><p>Kiểm tra kết nối rồi thử lại. Nếu vừa gửi một thao tác, hãy tải lại chứng từ để kiểm tra kết quả trước khi tạo thao tác mới.</p><button className="button" onClick={()=>startTransition(()=>{router.refresh();reset();})}>Thử lại</button></section>;}
