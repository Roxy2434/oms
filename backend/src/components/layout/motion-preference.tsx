'use client';
import {createContext,useContext,useEffect,useSyncExternalStore} from 'react';
import {MotionConfig} from 'motion/react';
type Preference='auto'|'full'|'reduced';
const Context=createContext({preference:'auto' as Preference,reduced:false});
function readPreference():Preference{try{const value=localStorage.getItem('oms.motion');return value==='full'||value==='reduced'?value:'auto';}catch{return 'auto';}}
function subscribePreference(notify:()=>void){const listener=()=>notify();window.addEventListener('storage',listener);window.addEventListener('oms-motion-change',listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener('oms-motion-change',listener);};}
function subscribeSystem(notify:()=>void){const media=window.matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);}
function readSystem(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function MotionPreferenceProvider({children}:{children:React.ReactNode}){const preference=useSyncExternalStore(subscribePreference,readPreference,()=>'auto' as Preference);const systemReduced=useSyncExternalStore(subscribeSystem,readSystem,()=>false);const reduced=preference==='reduced'||preference==='auto'&&systemReduced;useEffect(()=>{document.documentElement.dataset.motion=preference;return()=>{delete document.documentElement.dataset.motion;};},[preference]);return <Context.Provider value={{preference,reduced}}><MotionConfig reducedMotion={reduced?'always':'never'}>{children}</MotionConfig></Context.Provider>;}
export function useAppReducedMotion(){return useContext(Context).reduced;}
