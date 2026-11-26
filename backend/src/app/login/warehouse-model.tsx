'use client';
import {useEffect,useRef,useState} from 'react';
import {Boxes,Warehouse} from 'lucide-react';
import type {OmsPrecisionDiorama} from './digital-twin';
export function WarehouseModel(){
 const host=useRef<HTMLDivElement>(null);const hub=useRef<OmsPrecisionDiorama|null>(null);const notify=useRef<()=>void>(()=>{});
 const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');const [paused,setPaused]=useState(false);const [reduced,setReduced]=useState(false);
 useEffect(()=>{const node=host.current;if(!node)return;let cancelled=false,loading=false,onscreen=true,instance:OmsPrecisionDiorama|null=null;const media=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width: 1025px)');
  const sync=()=>{setReduced(media.matches);instance?.setRunning(!media.matches&&node.dataset.paused!=='true'&&onscreen&&!document.hidden&&desktop.matches);};
  const lost=(event:Event)=>{event.preventDefault();node.removeEventListener('webglcontextlost',lost,true);instance?.dispose();hub.current=null;if(!cancelled)setStatus('fallback');};node.addEventListener('webglcontextlost',lost,true);
  async function load(){if(loading||!desktop.matches)return;loading=true;try{const {OmsPrecisionDiorama}=await import('./digital-twin');if(cancelled)return;instance=new OmsPrecisionDiorama(node,{onReady:()=>{if(!cancelled){setStatus('ready');sync();}}});hub.current=instance;sync();}catch{if(!cancelled)setStatus('fallback');}}
  const update=()=>{void load();sync();};notify.current=update;
  const observer=new IntersectionObserver(([entry])=>{onscreen=entry.isIntersecting;sync();});observer.observe(node);document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);desktop.addEventListener('change',update);void load();sync();
  return()=>{cancelled=true;notify.current=()=>{};observer.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);desktop.removeEventListener('change',update);node.removeEventListener('webglcontextlost',lost,true);instance?.dispose();hub.current=null;};
 },[]);
 function toggle(){const next=!paused;setPaused(next);if(host.current)host.current.dataset.paused=String(next);notify.current();}
 return <section className="left-panel" aria-label="Mô hình kho minh họa">
  <header className="left-header"><div className="logo-wrap"><span className="logo-badge"><Boxes size={25} strokeWidth={1.7} aria-hidden="true"/></span><span className="login-brand-copy"><strong>EZMART<span>.</span></strong><small>Quản lý đơn hàng</small></span></div></header>
  <div className="stage-wrapper warehouse-model" data-state={status}><div className={'warehouse-model-host'+(status==='ready'?' ready':'')} id="oms-canvas-container" ref={host} data-paused={paused}/>{status!=='ready'&&<div className="loading-indicator" role="status">{status==='loading'?<><div className="spinner"/><span>Đang tải mô hình 3D…</span></>:<><Warehouse size={64}/><span>Trình duyệt chưa hiển thị được 3D.</span><small>Bạn vẫn có thể đăng nhập bình thường.</small></>}</div>}</div>
  <footer className="left-footer"><div className="controls-bar" role="group" aria-label="Điều khiển mô hình 3D"><button type="button" id="btn-rotate-left" className="ctrl-btn" aria-label="Xoay trái mô hình 3D" disabled={status!=='ready'} onClick={()=>hub.current?.rotateLeft()}><span aria-hidden="true">↺</span><span>Xoay trái</span></button><button type="button" id="btn-rotate-right" className="ctrl-btn" aria-label="Xoay phải mô hình 3D" disabled={status!=='ready'} onClick={()=>hub.current?.rotateRight()}><span aria-hidden="true">↻</span><span>Xoay phải</span></button><div className="ctrl-divider"/><button type="button" id="btn-reset" className="ctrl-btn" aria-label="Reset góc nhìn 3D" disabled={status!=='ready'} onClick={()=>hub.current?.resetCamera()}><span aria-hidden="true">⟲</span><span>Reset</span></button>{!reduced&&<button type="button" id="btn-autoplay" className={'ctrl-btn'+(!paused?' active-autoplay':'')} aria-label={paused?'Autoplay: tiếp tục chuyển động 3D':'Autoplay: tạm dừng chuyển động 3D'} aria-pressed={!paused} disabled={status!=='ready'} onClick={toggle}><span aria-hidden="true">{paused?'▶':'❚❚'}</span><span>Autoplay</span></button>}</div><div className="hint-text">Kéo để xoay 360° · Cuộn để phóng to mô hình</div></footer>
 </section>;
}
