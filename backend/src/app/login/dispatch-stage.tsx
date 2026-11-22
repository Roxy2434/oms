'use client';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
function MovingParcel(){return <><path d="m-11-3 11-6 11 6-11 7Z" fill="#ffe5bd"/><path d="m-11-3 11 7v13l-11-7Z" fill="#dc9861"/><path d="m0 4 11-7v13L0 17Z" fill="#f7bd80"/></>;}
export function DispatchStage(){const [paused,setPaused]=useState(false);const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const node=root.current;if(!node)return;const visibility=()=>{node.dataset.background=String(document.hidden);};visibility();document.addEventListener('visibilitychange',visibility);const observer=new IntersectionObserver(([entry])=>{node.dataset.offscreen=String(!entry.isIntersecting);});observer.observe(node);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);};},[]);
 return <div className="signin-stage" ref={root} data-paused={paused}>
 <svg className="signin-stage-art" viewBox="0 0 680 470" fill="none" aria-hidden="true">
  <defs><pattern id="dispatch-grid" width="48" height="28" patternUnits="userSpaceOnUse"><path d="M0 14 24 0 48 14 24 28Z" stroke="#628fe6" strokeOpacity=".17" strokeWidth=".65"/></pattern><radialGradient id="dispatch-light"><stop stopColor="#497bea" stopOpacity=".28"/><stop offset="1" stopColor="#497bea" stopOpacity="0"/></radialGradient></defs>
  <ellipse cx="331" cy="290" rx="290" ry="170" fill="url(#dispatch-light)"/>
  <path d="M10 260 330 75 673 272 353 457Z" fill="url(#dispatch-grid)"/>
  <path d="M105 155v89c0 22 20 34 39 45l150 86c22 13 48 14 70 1l178-103V160" stroke="#7194db" strokeOpacity=".28" strokeWidth="1.2"/>
  <path d="M330 250 105 120M330 250 545 120M330 250 545 380" stroke="#315995" strokeWidth="17" strokeLinecap="round"/>
  <path className="signin-path" pathLength="1" d="M330 250 105 120M330 250 545 120M330 250 545 380" stroke="#83b6ff" strokeWidth="1.6" strokeDasharray="1"/>
  <path d="M209 180l-11-6v12M454 175l11-7v13M452 327l11 7v-13" stroke="#a8ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <ellipse cx="325" cy="375" rx="115" ry="30" fill="#09205c" fillOpacity=".6"/>
  <path d="m190 330 136-79 140 80-136 80Z" fill="#224985"/>
  <path d="M190 330v13l140 81v-13Z" fill="#112d68"/>
  <path d="m330 411 136-80v13l-136 80Z" fill="#0c2355"/>
  <path d="m212 329 114-66 118 67-114 67Z" fill="#355f9f" stroke="#5f89c6" strokeWidth="1"/>
  <g className="signin-main-parcel">
   <path d="m224 195 100-58 112 65-100 58Z" fill="#ffe0af"/>
   <path d="M224 195v121l112 66V260Z" fill="#e7a466"/>
   <path d="m336 260 100-58v121l-100 59Z" fill="#f7bf7d"/>
   <path d="m255 177 111 65v43l27-16v-43l-111-65Z" fill="#fff1d7"/>
   <path d="m244 255 66 38v50l-66-38Z" fill="#fff8e8"/>
   <path d="m254 274 45 26m-45-17 31 18" stroke="#ad7d4d" strokeWidth="3"/>
   <path d="m254 294 2 1m4 2 2 1m4 2 2 1m4 2 2 1m4 2 2 1m4 2 2 1m4 2 2 1" stroke="#684a35" strokeWidth="8"/>
   <path d="m336 260 100-58m-100 58v122" stroke="#d89c5f" strokeWidth="1.2"/>
   <path d="m363 315 0 15m-5-10 5-5 5 10m14-21v15m-5-10 5-5 5 10" stroke="#ab743f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </g>
  <g className="signin-shuttle shuttle-north"><MovingParcel/></g><g className="signin-shuttle shuttle-central"><MovingParcel/></g><g className="signin-shuttle shuttle-south"><MovingParcel/></g>
  <g transform="translate(43 74)"><rect width="129" height="77" rx="13" fill="#19417f" stroke="#628ed1" strokeOpacity=".8"/><rect x="13" y="15" width="30" height="30" rx="8" fill="#ffffff0f"/><path d="m19 28 9-6 9 6v10H19Zm4 10v-7h10v7m-11-10h12" stroke="#b8d6ff" strokeWidth="1.3" strokeLinejoin="round"/><text x="53" y="30" fill="#f1f6ff" fontSize="12" fontWeight="600">Hà Nội</text><text x="53" y="46" fill="#b5cbed" fontSize="9">Kho miền Bắc</text><circle cx="18" cy="61" r="3" fill="#75d7c4"/><path d="M28 61h47" stroke="#87a9d8" strokeWidth="2" strokeLinecap="round"/></g>
  <g transform="translate(477 73)"><rect width="145" height="77" rx="13" fill="#19417f" stroke="#628ed1" strokeOpacity=".8"/><rect x="13" y="15" width="30" height="30" rx="8" fill="#ffffff0f"/><path d="m19 28 9-6 9 6v10H19Zm4 10v-7h10v7m-11-10h12" stroke="#b8d6ff" strokeWidth="1.3" strokeLinejoin="round"/><text x="53" y="30" fill="#f1f6ff" fontSize="12" fontWeight="600">Đà Nẵng</text><text x="53" y="46" fill="#b5cbed" fontSize="9">Kho miền Trung</text><circle cx="18" cy="61" r="3" fill="#75d7c4"/><path d="M28 61h47" stroke="#87a9d8" strokeWidth="2" strokeLinecap="round"/></g>
  <g transform="translate(464 367)"><rect width="164" height="77" rx="13" fill="#19417f" stroke="#628ed1" strokeOpacity=".8"/><rect x="13" y="15" width="30" height="30" rx="8" fill="#ffffff0f"/><path d="m19 28 9-6 9 6v10H19Zm4 10v-7h10v7m-11-10h12" stroke="#b8d6ff" strokeWidth="1.3" strokeLinejoin="round"/><text x="53" y="30" fill="#f1f6ff" fontSize="11" fontWeight="600">TP. Hồ Chí Minh</text><text x="53" y="46" fill="#b5cbed" fontSize="9">Kho miền Nam</text><circle cx="18" cy="61" r="3" fill="#75d7c4"/><path d="M28 61h47" stroke="#87a9d8" strokeWidth="2" strokeLinecap="round"/></g>
  <g className="signin-order-slip" transform="translate(265 34)"><rect width="181" height="65" rx="12" fill="#fff"/><rect x="13" y="14" width="35" height="35" rx="9" fill="#eaf1ff"/><path d="M23 23h15v18H23Zm4 5h7m-7 5h7m-7 5h5" stroke="#3864c3" strokeWidth="1.5" strokeLinecap="round"/><text x="59" y="28" fill="#1c355a" fontSize="11" fontWeight="600">Tiếp nhận đơn hàng</text><text x="59" y="44" fill="#5b708c" fontSize="9">Phân bổ đến kho phù hợp</text></g>
 </svg>
 <div className="signin-stage-footer"><span>Đơn hàng <span className="signin-stage-separator">/</span> Phân bổ <span className="signin-stage-separator">/</span> Giao nhận</span><button type="button" className="signin-motion-pause" aria-pressed={paused} onClick={()=>setPaused(value=>!value)} aria-label={paused?'Tiếp tục chuyển động minh họa':'Tạm dừng chuyển động minh họa'}>{paused?<Play size={13} aria-hidden="true"/>:<Pause size={13} aria-hidden="true"/>}<span>{paused?'Tiếp tục':'Tạm dừng'}</span></button></div>
 </div>;
}
