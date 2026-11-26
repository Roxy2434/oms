import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {join} from 'node:path';
import {demoCatalog,demoMatrix} from '../../prisma/demo-catalog';
import {solveAllocation} from '../../src/domain/allocation/solver';
it('demo prices are exactly half the frozen original, never recursively halved',()=>{
 expect(demoCatalog).toHaveLength(10);expect(new Set(demoCatalog.map(s=>s[0])).size).toBe(10);
 for(const s of demoCatalog){expect(s[4]).toBe(s[6]/2);expect(Number.isSafeInteger(s[4])).toBe(true);expect(s[5]).toBeGreaterThan(0);expect(demoMatrix[s[0]]).toHaveLength(3);}
});
const candidates=()=>['HN','DN','HCM'].map((region,i)=>({id:'KHO-'+region,name:region,region,stock:Object.fromEntries(Object.entries(demoMatrix).map(([sku,counts])=>[sku,counts[i]])),handlingHours:2,queueHours:0}));
const line=(skuId:string)=>({id:skuId,skuId,name:skuId,quantity:1,weightGrams:300});
it('demo matrix consistently forces a two-warehouse BT/HT order without inventing a split when one warehouse is possible',()=>{
 for(let repeat=0;repeat<5;repeat++){
  const two=solveAllocation([line('BT-750-XANH'),line('HT-1200')],candidates(),'DN-NOITHANH');expect(two?.parcels.map(p=>p.warehouseId).sort()).toEqual(['KHO-DN','KHO-HN']);
  const single=solveAllocation([line('TH-5')],candidates(),'HN-NOITHANH');expect(single?.parcels).toHaveLength(1);expect(single?.parcels[0].warehouseId).toBe('KHO-HN');
 }
});
it('KT-SET remains the explicit shortage exercise, not a misleading available item',()=>{expect(solveAllocation([line('KT-SET')],candidates(),'HN-NOITHANH')).toBeNull();});
it('all ten local photographs have intact files, known CC licenses and source attribution',()=>{
 const root=join(process.cwd(),'..','frontend');const credits=JSON.parse(readFileSync(join(root,'assets/images/ezmart/credits.json'),'utf8')) as {sku:string;path:string;license:string;source:string;sha256:string}[];
 expect(credits).toHaveLength(10);
 for(const s of demoCatalog){const photo=credits.find(p=>p.sku===s[0]);expect(photo).toBeDefined();expect(photo!.source).toMatch(/^https:\/\/commons.wikimedia.org\//);expect(photo!.license).toMatch(/^CC(?:0| BY)/);expect(createHash('sha256').update(readFileSync(join(root,photo!.path))).digest('hex')).toBe(photo!.sha256);}
});
