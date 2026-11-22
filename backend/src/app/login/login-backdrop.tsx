function Cube({x,y,scale=1}:{x:number;y:number;scale?:number}){return <g transform={`translate(${x} ${y}) scale(${scale})`}>
 <path d="M0 65 112 0 224 65 112 131Z" fill="#4c82fa"/>
 <path d="M0 65v130l112 65V131Z" fill="#2158da"/>
 <path d="m112 131 112-66v130l-112 65Z" fill="#1746b5"/>
 <path d="m39 42 112 65v48l34-20V87L73 22Z" fill="#8eb3ff"/>
 <path d="m19 147 35 20v31l-35-20Z" fill="#e2edff"/>
 <path d="m27 161 19 11m-19-4 13 8" stroke="#6f96e8" strokeWidth="3"/>
 <path d="m112 131 112-66M112 131v129" stroke="#ffffff26" strokeWidth="1.5"/>
 </g>;}
export function LoginBackdrop(){return <div className="signin-backdrop" aria-hidden="true"><svg className="signin-backdrop-art" viewBox="0 0 1440 760" fill="none">
 <defs><pattern id="signin-dotfield" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#bacce9" fillOpacity=".48"/></pattern></defs>
 <rect width="1440" height="760" fill="url(#signin-dotfield)"/>
 <text x="150" y="540" fill="none" stroke="#d3e0f5" strokeWidth="1.2" fontSize="230" letterSpacing="6" fontWeight="700" fontFamily="'Be Vietnam Pro',sans-serif">EZMART</text>
 <path d="M0 530h241c40 0 65-25 65-65V282c0-30 20-50 50-50h160M1440 240h-237c-35 0-56 22-56 57v228c0 34-24 58-58 58H920" stroke="#d0def3" strokeWidth="22"/>
 <path className="signin-path" pathLength="1" d="M0 530h241c40 0 65-25 65-65V282c0-30 20-50 50-50h160M1440 240h-237c-35 0-56 22-56 57v228c0 34-24 58-58 58H920" stroke="#86aaf0" strokeWidth="1.5"/>
 <path d="m293 388 13-13 13 13m815 30 13 13 13-13" stroke="#658dde" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 <g className="signin-backdrop-cube"><ellipse cx="259" cy="442" rx="126" ry="24" fill="#cddbf3" fillOpacity=".55"/><Cube x={159} y={167} scale={.9}/></g>
 <g className="signin-backdrop-cube cube-secondary"><ellipse cx="1196" cy="603" rx="99" ry="18" fill="#cddbf3" fillOpacity=".5"/><Cube x={1123} y={394} scale={.66}/></g>
 <g transform="translate(356 474)"><rect width="116" height="42" rx="21" fill="white" stroke="#d4e0f0"/><circle cx="19" cy="21" r="4" fill="#3470e4"/><text x="33" y="25" fill="#375373" fontSize="11" fontWeight="500">Đơn hàng</text></g>
 <g transform="translate(1006 297)"><rect width="115" height="42" rx="21" fill="white" stroke="#d4e0f0"/><circle cx="19" cy="21" r="4" fill="#3470e4"/><text x="33" y="25" fill="#375373" fontSize="11" fontWeight="500">Kho hàng</text></g>
 <g transform="translate(1025 623)"><circle r="14" fill="white" stroke="#c7ddda"/><path d="m-5 0 3 3 7-7" stroke="#258367" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>
</svg></div>;}
