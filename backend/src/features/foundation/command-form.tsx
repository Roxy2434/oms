'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {useCommandMutation} from '@/features/shared/use-command-mutation';
export type Field={name:string;label:string;type?:'text'|'number'|'password'|'checkbox';options?:{value:string;label:string}[];optional?:boolean;readOnly?:boolean;emptyAsNull?:boolean;min?:number;max?:number;step?:number};
export function CommandForm({title,action,fields,initial={},endpoint,navigateTo,submitLabel='Lưu thay đổi',primary=false,triggerLabel,description='Kiểm tra thông tin và chứng từ trước khi xác nhận. Kết quả chưa rõ sẽ được kiểm tra lại cùng thao tác.'}:{title:string;action:string;fields:Field[];initial?:Record<string,string|number|boolean|null>;endpoint?:string;navigateTo?:string;submitLabel?:string;primary?:boolean;triggerLabel?:string;description?:string}){
 const [open,setOpen]=useState(false);const router=useRouter();const mutation=useCommandMutation(endpoint??'/api/foundation/'+action);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget),body:Record<string,unknown>={...initial};
  for(const field of fields){const value=f.get(field.name);if(field.optional&&(value===null||value==='')){if(field.emptyAsNull)body[field.name]=null;else delete body[field.name];continue;}body[field.name]=field.type==='checkbox'?value==='on':field.type==='number'?Number(value):String(value??'');}
  const data=await mutation.run<{id:string}>(body);if(!data)return;setOpen(false);if(navigateTo)router.push(navigateTo.replace(':id',data.id));router.refresh();
 }
 // Nothing to fill in: one click runs the command instead of opening an empty drawer.
 if(!fields.length)return <form className="inline-command" onSubmit={submit} data-uncertain={mutation.uncertain} aria-busy={mutation.busy}><button className={'button'+(primary?' primary':'')} disabled={mutation.busy}>{mutation.busy?'Đang lưu…':mutation.uncertain?'Kiểm tra kết quả':title}</button>{mutation.error&&<p className="error-box" role="alert">{mutation.error}</p>}</form>;
 return <Dialog.Root open={open} onOpenChange={value=>{if(!mutation.disabled)setOpen(value);}}><Dialog.Trigger asChild><button className={'button'+(primary?' primary':'')+(triggerLabel?' compact':'')} type="button" aria-label={triggerLabel?title:undefined}>{triggerLabel??title}</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="drawer-overlay"/><Dialog.Content className="data-drawer"><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description><Dialog.Close className="icon-button drawer-close" aria-label="Đóng biểu mẫu" disabled={mutation.disabled}><X size={18}/></Dialog.Close><form className="form-section" onSubmit={submit} data-uncertain={mutation.uncertain} aria-busy={mutation.busy}>
  <fieldset disabled={mutation.disabled} style={{border:0,padding:0,margin:0,minWidth:0}}>{fields.map(field=><label key={field.name} style={{marginBottom:16}}>{field.label}{field.options?<select name={field.name} defaultValue={String(initial[field.name]??'')}>{field.optional&&<option value="">Không áp dụng</option>}{field.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:field.type==='checkbox'?<input name={field.name} type="checkbox" defaultChecked={initial[field.name]===true}/>:<input name={field.name} type={field.type??'text'} defaultValue={String(initial[field.name]??'')} required={!field.optional} readOnly={field.readOnly} min={field.type==='number'?(field.min??0):undefined} max={field.max} step={field.type==='number'?(field.step??1):undefined} autoComplete={field.type==='password'?'new-password':'off'}/>}</label>)}</fieldset>
  {mutation.error&&<p className="error-box" role="alert">{mutation.error}</p>}<button className="button primary" disabled={mutation.busy}>{mutation.busy?'Đang lưu…':mutation.uncertain?'Kiểm tra kết quả':submitLabel}</button>
 </form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
