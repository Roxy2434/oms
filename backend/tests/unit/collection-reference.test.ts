import {it,expect} from 'vitest';
import {collectionReference} from '../../src/domain/payments/references';
it('uses the full key and preserves a stable reference for retries',()=>{
 const prefix='same-first-twenty-four-characters-and-more-';
 for(const fee of [false,true]){
  const first=collectionReference(prefix+'one',fee);
  expect(first).toBe(collectionReference(prefix+'one',fee));
  expect(first).not.toBe(collectionReference(prefix+'two',fee));
  expect(first.length).toBeLessThanOrEqual(120);
 }
});
it('separates ordinary and fee receipt reference namespaces',()=>{
 expect(collectionReference('accepted-key')).toMatch(/^THU-[a-f0-9]{64}$/);
 expect(collectionReference('accepted-key',true)).toMatch(/^THU-PHI-[a-f0-9]{64}$/);
});
