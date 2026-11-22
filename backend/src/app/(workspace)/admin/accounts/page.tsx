import {requireAccount} from '@/server/auth';
import {notFound} from 'next/navigation';
import {db} from '@/server/db';
import {RecordList} from '@/features/dashboard/record-list';
import {CommandForm,type Field} from '@/features/foundation/command-form';
const fields:Field[]=[{name:'name',label:'Họ tên'},{name:'username',label:'Tên đăng nhập'},{name:'password',label:'Mật khẩu mới (ít nhất 10 ký tự)',type:'password',optional:true},{name:'role',label:'Vai trò',options:[{value:'NHAN_VIEN',label:'Nhân viên'},{value:'QUAN_LY',label:'Quản lý'}]},{name:'active',label:'Đang hoạt động',type:'checkbox'}];
export default async function Page(){const actor=await requireAccount();if(actor.role!=='QUAN_LY')notFound();const accounts=await db.account.findMany({orderBy:{username:'asc'},select:{id:true,name:true,username:true,role:true,active:true}});return <RecordList action={<CommandForm title="Thêm tài khoản" action="accounts" fields={fields} primary initial={{active:true,role:'NHAN_VIEN'}}/>} title="Tài khoản" description="Quản lý quyền và khóa phiên đăng nhập. Không được khóa Quản lý cuối cùng." headers={['Tài khoản','Họ tên','Vai trò','Trạng thái','Thao tác']} rows={accounts.map(a=>[a.username,a.name,a.role==='QUAN_LY'?'Quản lý':'Nhân viên',a.active?'Hoạt động':'Đã khóa',<CommandForm key={a.id} title={'Sửa '+a.username} action="accounts" fields={fields} initial={a}/>])}></RecordList>;}
