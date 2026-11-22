import {it,expect} from 'vitest';
import {RateLimiter,readJsonLimited} from '../../src/server/request-security';
import {canTransitionClaim} from '../../src/domain/returns/claims';
import {assertShipmentSla} from '../../src/domain/allocation/sla';
import {ROUTING_POLICY} from '../../src/domain/allocation/routing';
it('rate limits use fixed windows and do not slide forever',()=>{const r=new RateLimiter();expect(r.take('x',2,100,0)).toBe(true);expect(r.take('x',2,100,30)).toBe(true);expect(r.take('x',2,100,90)).toBe(false);expect(r.take('x',2,100,101)).toBe(true);});
it('bounded limiter cannot be bypassed by filling it with arbitrary keys',()=>{const r=new RateLimiter(2);expect(r.take('a',1,100,0)).toBe(true);expect(r.take('b',1,100,0)).toBe(true);expect(r.take('c',1,100,0)).toBe(false);expect(r.take('a',1,100,0)).toBe(false);expect(r.take('c',1,100,101)).toBe(true);});
it('rejects oversized declared bodies and oversized streamed bodies without Content-Length',async()=>{
 await expect(readJsonLimited(new Request('http://localhost',{method:'POST',headers:{'Content-Length':'99999'},body:'{}'}),10)).rejects.toMatchObject({status:413});
 await expect(readJsonLimited(new Request('http://localhost',{method:'POST',body:'{"x":"1234567890"}'}),10)).rejects.toMatchObject({status:413});
 expect(await readJsonLimited(new Request('http://localhost',{method:'POST',body:'{"x":1}'}),20)).toEqual({x:1});
 await expect(readJsonLimited(new Request('http://localhost',{method:'POST',body:new Uint8Array([255])}),20)).rejects.toMatchObject({status:422});
});
it('claim reimbursement requires a sent claim and terminal conclusions cannot rewind',()=>{
 expect(canTransitionClaim('CHO_GUI','DUOC_BOI_THUONG')).toBe(false);expect(canTransitionClaim('CHO_GUI','DA_GUI')).toBe(true);
 expect(canTransitionClaim('DA_GUI','DUOC_BOI_THUONG')).toBe(true);expect(canTransitionClaim('DUOC_BOI_THUONG','DA_GUI')).toBe(false);
 expect(canTransitionClaim('DUOC_BOI_THUONG','DUOC_BOI_THUONG')).toBe(true);
});
it('SLA rejects delayed handover even before deadline when transit no longer fits',()=>{
 const s={warehouseId:'w',allocationEvidence:{policy:ROUTING_POLICY,parcels:[{warehouseId:'w',route:{transitHours:4,queueHours:1}}]}};
 const at=new Date('2026-11-13T10:00:00Z');expect(()=>assertShipmentSla(s,new Date('2026-11-13T14:00:00Z'),at)).toThrow(/SLA/);
 expect(assertShipmentSla(s,new Date('2026-11-13T15:00:00Z'),at)?.toISOString()).toBe('2026-11-13T15:00:00.000Z');
 expect(()=>assertShipmentSla(s,null,at)).toThrow();
 expect(()=>assertShipmentSla({...s,allocationEvidence:{policy:ROUTING_POLICY}},new Date(),at)).toThrow();
});
it('historical plans retain their original behavior after removing location input',()=>{expect(assertShipmentSla({warehouseId:'w',allocationEvidence:{policy:'DEMO-V1'}},new Date(0))).toBeUndefined();expect(()=>assertShipmentSla({warehouseId:'w',allocationEvidence:{policy:'DOM-OFFLINE-V2',parcels:[{warehouseId:'w',route:{transitHours:4,queueHours:1}}]}},new Date(0))).toThrow(/SLA/);});
