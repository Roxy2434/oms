import {createHash} from 'node:crypto';
/** Stable across retries; use the entire accepted key, never a truncated prefix. */
export function collectionReference(key:string,fee=false){
 return (fee?'THU-PHI-':'THU-')+createHash('sha256').update(key).digest('hex');
}
