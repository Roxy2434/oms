import {db} from '@/server/db';
export async function GET(){try{await db.$queryRaw`SELECT 1`;return Response.json({app:'ok',database:'ok',mode:'local-coursework'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({app:'ok',database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
