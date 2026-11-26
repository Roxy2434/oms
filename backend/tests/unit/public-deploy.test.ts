import {it,expect,vi,afterEach} from 'vitest';
import {assertDeploymentConfig} from '../../docker/config.mjs';
import {passwordWork} from '../../src/server/password-work';
const env=()=>({OMS_PUBLIC_DEPLOYMENT:'1',APP_ORIGIN:'https://demo.example.net',SHOPVUI_ORIGIN:'https://demo.example.net',OMS_DEMO_MODE:'1',SESSION_SECRET:'S'.repeat(64),BOOTSTRAP_PASSWORD:'B'.repeat(32),DATABASE_URL:'postgresql://oms_app:'+('d'.repeat(32))+'@db/oms',TURNSTILE_SITEKEY:'widget-real-configured',TURNSTILE_SECRET_KEY:'secret-real-configured',OMS_DEMO_REAL_BANK:'1',SEPAY_API_TOKEN:'configured-private-token',SEPAY_ACCOUNT:'1234567890',SEPAY_REFUND_CONTACT:'owner@example.net',SEPAY_START_ID:'123',SEPAY_POLL:'on'});
afterEach(()=>vi.unstubAllEnvs());
it('public startup accepts explicit mixed payments and private configuration',()=>expect(()=>assertDeploymentConfig(env())).not.toThrow());
for(const [key,value] of [['APP_ORIGIN','http://demo.example.net'],['SHOPVUI_ORIGIN','https://elsewhere.example.net'],['OMS_DEMO_MODE','0'],['SESSION_SECRET','oms-demo-session-secret-change-me'],['BOOTSTRAP_PASSWORD','OmsDemo@2026'],['DATABASE_URL','postgresql://oms_app:short@db/oms'],['TURNSTILE_SITEKEY',''],['TURNSTILE_SECRET_KEY','1x0000000000000000000000000000000AA'],['SEPAY_API_TOKEN',''],['SEPAY_START_ID','wrong'],['SEPAY_REFUND_CONTACT',''],['SEPAY_POLL','off']])it('refuses unsafe public setting '+key,()=>expect(()=>assertDeploymentConfig({...env(),[key]:value})).toThrow());
it('local deployment remains unchanged',()=>expect(()=>assertDeploymentConfig({})).not.toThrow());
it('bounds concurrent password memory and releases slots even on errors',async()=>{
 vi.stubEnv('OMS_PUBLIC_DEPLOYMENT','1');let release!:()=>void;
 const pending=new Promise<void>(r=>{release=r;});const a=passwordWork(()=>pending),b=passwordWork(()=>pending);
 await expect(passwordWork(async()=>0)).rejects.toMatchObject({status:429});release();await Promise.all([a,b]);
 await expect(passwordWork(async()=>{throw Error('expected');})).rejects.toThrow('expected');await expect(passwordWork(async()=>42)).resolves.toBe(42);
});
it('CAPTCHA fails closed: absent/expired/wrong-host/wrong-action/network failure; accepts exact host+action',async()=>{
 vi.stubEnv('DATABASE_URL','postgresql://test:test@127.0.0.1:15432/never_connect');vi.stubEnv('OMS_PUBLIC_DEPLOYMENT','1');vi.stubEnv('APP_ORIGIN','https://demo.example.net');vi.stubEnv('TURNSTILE_SECRET_KEY','private-test-secret');
 const {verifyRegistrationChallenge}=await import('../../src/server/public-security');
 const response=(body:unknown)=>async()=>Response.json(body);
 await expect(verifyRegistrationChallenge({})).rejects.toMatchObject({status:422});
 for(const body of [{success:false},{success:true,hostname:'evil.example.net',action:'register'},{success:true,hostname:'demo.example.net',action:'wrong'}])await expect(verifyRegistrationChallenge({captchaToken:'opaque'},response(body))).rejects.toMatchObject({status:422});
 await expect(verifyRegistrationChallenge({captchaToken:'opaque'},async()=>{throw Error('offline');})).rejects.toMatchObject({status:503});
 await expect(verifyRegistrationChallenge({captchaToken:'opaque'},response({success:true,hostname:'demo.example.net',action:'register'}))).resolves.toBeUndefined();
});
