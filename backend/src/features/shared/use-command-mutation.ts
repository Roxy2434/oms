'use client';
import {useEffect,useRef,useState} from 'react';
/** Unknown outcome is NOT a failed command. Freeze and replay the exact body/key. */
export function useCommandMutation(endpoint:string){
 const [busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState('');
 const attempt=useRef<{body:string;key:string}|null>(null),locked=useRef(false);
 useEffect(()=>{if(!uncertain)return;const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};const navigate=(event:MouseEvent)=>{if((event.target as Element).closest('a[href]')){event.preventDefault();event.stopPropagation();setError('Kết quả thao tác chưa rõ. Bấm Kiểm tra kết quả trước khi rời trang để tránh ghi hai lần.');}};window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};},[uncertain]);
 async function run<T>(body:unknown):Promise<T|undefined>{
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  if(!attempt.current)attempt.current={body:JSON.stringify(body),key:crypto.randomUUID()};
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':attempt.current.key},body:attempt.current.body});
   const data=await response.json();
   if(!response.ok){if(response.status<500){attempt.current=null;setUncertain(false);setError(data.error??'Dữ liệu chưa hợp lệ. Kiểm tra lại trước khi lưu.');return;}throw new Error(data.error??'Chưa rõ kết quả thao tác.');}
   attempt.current=null;setUncertain(false);return data as T;
  }catch(e){setUncertain(true);setError((e instanceof TypeError?'Chưa nhận được kết quả.':e instanceof Error?e.message:'Chưa rõ kết quả.')+' Bấm Kiểm tra kết quả để gửi lại đúng thao tác, không ghi thêm chứng từ.');return;}
  finally{locked.current=false;setBusy(false);}
 }
 return{run,busy,uncertain,error,disabled:busy||uncertain};
}
