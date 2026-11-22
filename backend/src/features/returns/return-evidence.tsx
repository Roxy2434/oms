import Image from 'next/image';
/** What the buyer wrote and photographed when asking for the return, so the warehouse can compare with what arrives. */
export function ReturnEvidence({returnId,note,photoIds}:{returnId:string;note:string|null;photoIds:string[]}){
 if(!note&&!photoIds.length)return null;
 return <div className="return-evidence">
  <h3>Khách mô tả</h3>
  {note?<p>{note}</p>:<p className="muted">Khách không ghi chú.</p>}
  {photoIds.length>0&&<div className="return-photos">{photoIds.map((pid,i)=>{const src=`/api/returns/${returnId}/photos/${pid}`;return <a key={pid} href={src} target="_blank" rel="noopener noreferrer" aria-label={`Mở ảnh ${i+1} khách gửi`}><Image src={src} alt={`Ảnh ${i+1} khách gửi`} width={132} height={132} unoptimized/></a>;})}</div>}
 </div>;
}
