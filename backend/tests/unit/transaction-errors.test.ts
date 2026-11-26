import {it,expect} from 'vitest';
import {isRetryableTransactionError} from '../../src/server/transaction-errors';
for(const [name,error]of [
 ['Prisma serialization',{code:'P2034'}],['same-key race',{code:'P2002'}],['direct adapter commit',{cause:{originalCode:'40001',kind:'TransactionWriteConflict'}}],['wrapped adapter',{meta:{driverAdapterError:{cause:{originalCode:'40P01'}}}}],['PostgreSQL root',{code:'40001'}]
] as const)it('retries '+name,()=>expect(isRetryableTransactionError(error)).toBe(true));
it('does not retry validation, unknown errors or cyclic graphs',()=>{const cycle:{cause?:unknown}={};cycle.cause=cycle;for(const e of [null,undefined,Error('offline'),{code:'422'},cycle])expect(isRetryableTransactionError(e)).toBe(false);});
