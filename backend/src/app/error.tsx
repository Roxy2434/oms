'use client';
import {useRouter} from 'next/navigation';
import {startTransition} from 'react';
export default function ErrorPage({reset}:{reset:()=>void}){const router=useRouter();return <main className="main-content"><section className="error-box" role="alert"><h1>Chưa tải được ứng dụng</h1><p>Không đọc được dữ liệu hoặc phiên đăng nhập. Kiểm tra PostgreSQL và thử lại; không cần seed lại dữ liệu.</p><button className="button" onClick={()=>startTransition(()=>{router.refresh();reset();})}>Thử lại</button></section></main>;}
