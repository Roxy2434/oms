import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDb=globalThis as unknown as {omsDb?:PrismaClient};
export const db=globalDb.omsDb??new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,max:process.env.VERCEL==='1'?5:20,idleTimeoutMillis:15000,connectionTimeoutMillis:15000})});
globalDb.omsDb=db;
