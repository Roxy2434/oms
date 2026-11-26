'use client';
import {useState,useRef} from 'react';
import {Eye,EyeOff,AlertCircle,LoaderCircle} from 'lucide-react';
import {WarehouseModel} from './warehouse-model';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './template.css';
import './login.css';
export default function Login(){
 const [error,setError]=useState('');const [invalid,setInvalid]=useState(false);const [busy,setBusy]=useState(false);const [showPassword,setShowPassword]=useState(false);const [capsLock,setCapsLock]=useState(false);const inFlight=useRef(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setInvalid(false);
  const form=new FormData(event.currentTarget);
  try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')})});const result=await response.json();if(!response.ok){setInvalid(response.status===401);setError(result.error??'Chưa đăng nhập được. Vui lòng thử lại.');return;}location.assign(new URL('/dashboard',location.origin).href);}catch{setError('Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.');}finally{inFlight.current=false;setBusy(false);}
 }
 return <div className="signin-template"><main id="app-layout" className="login-layout">
  <WarehouseModel/>
  <section className="right-panel" id="login-panel" aria-labelledby="signin-title"><div className="login-card"><h1 className="login-title" id="signin-title">Đăng nhập hệ thống</h1><p className="login-desc">Nhập thông tin tài khoản vận hành EZMART của bạn để tiếp tục.</p>
   <form onSubmit={submit} aria-busy={busy} onChange={()=>{if(error){setError('');setInvalid(false);}}}>
    <div className="form-group"><label className="form-label" htmlFor="username">Tài khoản vận hành</label><input className="form-input" id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} placeholder="Nhập tên đăng nhập" disabled={busy} aria-invalid={invalid||undefined} aria-describedby={error?'signin-error':undefined}/></div>
    <div className="form-group"><label className="form-label" htmlFor="password">Mật khẩu</label><div className="password-wrap"><input className="form-input" id="password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" required maxLength={256} placeholder="Nhập mật khẩu" disabled={busy} aria-invalid={invalid||undefined} aria-describedby={[error?'signin-error':'',capsLock?'signin-caps':''].filter(Boolean).join(' ')||undefined} onKeyUp={event=>setCapsLock(event.getModifierState('CapsLock'))} onBlur={()=>setCapsLock(false)}/><button className="password-toggle" type="button" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-controls="password" onClick={()=>setShowPassword(value=>!value)} disabled={busy}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{capsLock&&<p id="signin-caps" role="status" className="caps-hint">Caps Lock đang bật.</p>}</div>
    <div className="form-row"><span>Tài khoản được cấp bởi quản lý.</span></div>
    {error&&<div className="signin-error" id="signin-error" role="alert"><AlertCircle size={17} aria-hidden="true"/><span>{error}</span></div>}
    <button type="submit" className="submit-btn" disabled={busy}>{busy?<><LoaderCircle size={18} className="login-spinner" aria-hidden="true"/>Đang đăng nhập…</>:'Đăng nhập vào Hệ thống'}</button>
   </form><p className="course-disclosure">EZMART · Hệ thống quản lý đơn hàng &amp; kho vận đa kênh<br/>Hà Nội · Đà Nẵng · TP. Hồ Chí Minh</p>
  </div></section>
 </main></div>;
}
