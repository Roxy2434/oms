import {db} from '@/server/db';
import {isPublicDeployment} from '@/domain/demo-mode';
import {bankSyncReady} from '@/domain/payments/sepay-sync';
export async function GET(){try{await db.$queryRaw`SELECT 1`;return Response.json({app:'ok',database:'ok',mode:isPublicDeployment()?'public-demo':'local-coursework',...(isPublicDeployment()?{bank:process.env.OMS_DEMO_REAL_BANK==='1'?(await bankSyncReady()?'ready':'degraded'):'disabled'}:{})},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({app:'ok',database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
