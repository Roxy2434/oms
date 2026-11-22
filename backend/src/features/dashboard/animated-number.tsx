'use client';
import {useLayoutEffect,useRef} from 'react';
import {animate} from 'motion/react';
import {useAppReducedMotion} from '@/components/layout/motion-preference';
const integer=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0});
function format(value:number,currency:boolean){return integer.format(Math.round(value))+(currency?' ₫':'');}
export function AnimatedNumber({value,currency=false}:{value:number;currency?:boolean}){
 const reduced=useAppReducedMotion();
 const output=useRef<HTMLSpanElement>(null);
 const current=useRef(0);
 const finalText=format(value,currency);
 useLayoutEffect(()=>{
  const node=output.current;if(!node)return;
  if(reduced||current.current===value){current.current=value;node.textContent=format(value,currency);return;}
  node.textContent=format(current.current,currency);
  const playback=animate(current.current,value,{duration:.95,ease:[.22,1,.36,1],onUpdate:next=>{current.current=next;node.textContent=format(next,currency);},onComplete:()=>{current.current=value;node.textContent=format(value,currency);}});
  return()=>playback.stop();
 },[value,currency,reduced]);
 return <span className="animated-number" data-counter-target={value}><span className="sr-only">{finalText}</span><span className="number-size" aria-hidden="true">{finalText}</span><span className="number-value" data-counter-visible ref={output} aria-hidden="true">{finalText}</span></span>;
}
