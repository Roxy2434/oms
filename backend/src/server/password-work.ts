import {isPublicDeployment,isClassroomMode} from '@/domain/demo-mode';
import {DomainError} from './errors';
type WorkState={active:number;queue:{resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}[]};
/** Bound Argon2 memory on a small VPS (at most 2 hashes in RAM). In classroom mode, queue bursts smoothly instead of dropping students with 429. */
export async function passwordWork<T>(run:()=>Promise<T>):Promise<T>{
 if(!isPublicDeployment())return run();
 const global=globalThis as typeof globalThis&{omsPasswordWork?:WorkState};
 const state=global.omsPasswordWork??(global.omsPasswordWork={active:0,queue:[]});
 if(state.active>=2){
  if(!isClassroomMode()||state.queue.length>=60)throw new DomainError('Máy chủ đang xử lý đăng nhập. Thử lại sau vài giây.',429);
  await new Promise<void>((resolve,reject)=>{
   const item={resolve,reject,timer:setTimeout(()=>{const idx=state.queue.indexOf(item);if(idx>=0)state.queue.splice(idx,1);reject(new DomainError('Máy chủ đang xử lý đăng nhập. Thử lại sau vài giây.',429));},15000)};
   state.queue.push(item);
  });
 }
 state.active++;
 try{return await run();}finally{
  state.active--;
  const next=state.queue.shift();
  if(next){clearTimeout(next.timer);next.resolve();}
 }
}
