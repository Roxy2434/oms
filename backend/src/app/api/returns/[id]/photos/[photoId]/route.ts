import {NextResponse} from 'next/server';
import {currentAccount} from '@/server/auth';
import {db} from '@/server/db';
/** A customer's return photo, for signed-in staff only. Bytes were type-checked on upload; nosniff keeps the browser from guessing otherwise. */
export async function GET(_req:Request,{params}:{params:Promise<{id:string;photoId:string}>}){
 if(!await currentAccount())return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});
 const {id,photoId}=await params;
 const photo=await db.returnPhoto.findFirst({where:{id:photoId,returnId:id},select:{mime:true,data:true}});
 if(!photo)return NextResponse.json({error:'Không có ảnh này.'},{status:404});
 return new NextResponse(new Uint8Array(photo.data),{headers:{'Content-Type':photo.mime,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
}
