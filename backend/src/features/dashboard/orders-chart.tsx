'use client';
import {useEffect,useRef} from 'react';
import {motion} from 'motion/react';
import {useAppReducedMotion as useReducedMotion} from '@/components/layout/motion-preference';
import {ResponsiveContainer,AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
import type {ManagerMetrics} from '@/domain/dashboard/contracts';

export default function OrdersChart({days,onSelect}:{days:ManagerMetrics['days'];onSelect:(date:string)=>void}){
 const reduced=useReducedMotion();
 const container=useRef<HTMLDivElement>(null);
 const datasetKey=days.map(d=>d.date+':'+d.orders).join('|');
 useEffect(()=>{
  const root=container.current;if(!root)return;
  let curve:SVGPathElement|null=null;
  const finish=()=>{curve?.classList.remove('chart-line-draw');root.dataset.lineDraw='settled';};
  const start=()=>{
   curve=root.querySelector<SVGPathElement>('.recharts-area-curve');if(!curve)return false;
   // Normalize once: no geometry reads per frame; Recharts interpolation stays disabled.
   curve.setAttribute('pathLength','1');
   if(reduced){finish();return true;}
   curve.classList.add('chart-line-draw');root.dataset.lineDraw='running';
   curve.addEventListener('animationend',finish,{once:true});return true;
  };
  const observer=new MutationObserver(()=>{if(start())observer.disconnect();});
  if(!start())observer.observe(root,{childList:true,subtree:true});
  return()=>{observer.disconnect();curve?.removeEventListener('animationend',finish);finish();};
 },[datasetKey,reduced]);
 return <motion.div ref={container} initial={reduced?false:{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.55,ease:[.16,1,.3,1]}} key={datasetKey} data-points={days.length} className="orders-chart chart-data-transition">
  <ResponsiveContainer width="100%" height="100%" debounce={180}>
   <AreaChart data={days} margin={{left:-24,right:16,top:18,bottom:0}} onClick={state=>{const index=state.activeTooltipIndex;if(index!==undefined&&index!==null&&days[Number(index)])onSelect(days[Number(index)].date)}}>
    <defs><linearGradient id="order-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={.14}/><stop offset="100%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
    <CartesianGrid vertical={false} stroke="#e8edf5" strokeDasharray="3 5"/>
    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#60728e'}} minTickGap={26} tickMargin={13}/>
    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#60728e'}} tickMargin={10}/>
    <Tooltip contentStyle={{borderRadius:8,border:'1px solid #dce3ed',fontSize:12}} formatter={value=>[value,'Đơn hàng']}/>
    <Area type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2.5} fill="url(#order-area)" isAnimationActive={false} activeDot={{r:5,strokeWidth:3,stroke:'#fff'}}/>
   </AreaChart>
  </ResponsiveContainer>
 </motion.div>;
}
