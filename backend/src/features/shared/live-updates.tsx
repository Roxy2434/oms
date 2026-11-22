'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
/** Keeps a server-rendered list live: polls a tiny change stamp every few seconds (only while the tab is visible)
 * and refreshes the page data in place when something changed, e.g. a new ShopVui order. */
export function LiveUpdates({intervalMs=4000}:{intervalMs?:number}){
 const router=useRouter();const [,startTransition]=useTransition();const last=useRef<string|null>(null);const [note,setNote]=useState('Tự cập nhật');
 useEffect(()=>{
  let stopped=false,busy=false;
  async function check(){
   if(stopped||busy||document.visibilityState!=='visible')return;busy=true;
   try{const r=await fetch('/api/orders/changes',{cache:'no-store'});if(!r.ok)return;const {stamp}=await r.json() as {stamp:string};
    if(last.current!==null&&stamp!==last.current){startTransition(()=>router.refresh());setNote('Vừa cập nhật lúc '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));}
    last.current=stamp;}
   catch{/* offline: try again next tick */}finally{busy=false;}
  }
  check();const timer=setInterval(check,intervalMs);document.addEventListener('visibilitychange',check);
  return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',check);};
 },[router,intervalMs]);
 return <span className="updating live-updates" role="status"><span className="live-dot"/>{note}</span>;
}
