'use client';
import {useEffect,useRef,useTransition,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
const reducedMotion=()=>{const m=document.documentElement.dataset.motion;return m==='reduced'||(m!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches);};
/** Picking a warehouse filters at once (same pattern as the dashboard filters); keeps the open tab and scroll position.
 * One animation owner: the list dims while loading (after a short delay) and fades back in when the new data lands. */
export function WarehousePicker({value,warehouses,children,extra}:{value:string;warehouses:{id:string;name:string}[];children:ReactNode;extra?:ReactNode}){
 const router=useRouter();const [pending,startTransition]=useTransition();
 const body=useRef<HTMLDivElement>(null),anim=useRef<Animation|null>(null),switching=useRef(false);
 function pick(id:string){
  const next=new URLSearchParams(location.search);if(id)next.set('warehouse',id);else next.delete('warehouse');
  switching.current=true;const el=body.current;
  if(el&&!reducedMotion()){anim.current?.cancel();anim.current=el.animate([{opacity:1},{opacity:.45}],{duration:180,delay:120,easing:'ease',fill:'forwards'});}
  startTransition(()=>router.replace('/fulfillment'+(next.size?'?'+next.toString():''),{scroll:false}));
 }
 useEffect(()=>{
  if(pending||!switching.current)return;switching.current=false;const el=body.current;if(!el)return;
  // Start from wherever the dim got to; a load faster than the dim delay still gets a short, visible fade-in.
  const from=Math.min(Number(getComputedStyle(el).opacity),.6);anim.current?.cancel();
  if(!reducedMotion())anim.current=el.animate([{opacity:from,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
 },[pending]);
 return <>
  <div className="list-filter"><label>Kho làm việc<select name="warehouse" value={value} onChange={e=>pick(e.target.value)} aria-busy={pending}><option value="">Tất cả kho</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><span className="updating warehouse-updating" role="status">{pending?'Đang tải kiện của kho…':''}</span>{extra}</div>
  <div ref={body} className="fulfillment-body" aria-busy={pending} data-pending={pending}>{children}</div>
 </>;
}
