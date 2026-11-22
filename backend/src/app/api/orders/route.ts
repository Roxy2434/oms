import { NextResponse } from 'next/server';
// Retired: this path let the client set the shipping fee. New orders go through /api/orders/checkout (server-computed fee).
export async function POST(){return NextResponse.json({error:'Tạo đơn mới qua màn Tạo đơn (phí giao do máy chủ tính).'},{status:410});}
