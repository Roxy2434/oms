import { DashboardView } from '@/features/dashboard/dashboard-view';
import { requireAccount } from '@/server/auth';
import { getDashboard } from '@/domain/dashboard/queries';
export const dynamic='force-dynamic';
export default async function Dashboard({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const account=await requireAccount();const q=await searchParams;const channel=['NHAP_TAY','WEBSITE','SHOPEE','TIKTOK','SHOPVUI'].includes(q.channel??'')?q.channel!:'ALL';const data=await getDashboard(account.role,q.period==='7'?7:30,channel);return <DashboardView data={data}/>}
