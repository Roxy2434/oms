import type { NextConfig } from 'next';
const isHttps = () => Boolean(process.env.APP_ORIGIN?.startsWith('https:') || process.env.VERCEL === '1');
const isStorefrontOnly = process.env.OMS_SITE_ROLE === 'storefront';
const config: NextConfig = {
 poweredByHeader:false,devIndicators:false,
 serverExternalPackages:['argon2','pg'],
 async rewrites(){return {beforeFiles:isStorefrontOnly?[{source:'/',destination:'/shopvui.html'}]:[]};},
 async redirects(){
  if(isStorefrontOnly)return [
   {source:'/login',destination:'/#/login',permanent:false},
   {source:'/dashboard',destination:'/',permanent:false},
   {source:'/orders',destination:'/',permanent:false},
   {source:'/orders/:path*',destination:'/',permanent:false},
   {source:'/fulfillment',destination:'/',permanent:false},
   {source:'/returns',destination:'/',permanent:false},
   {source:'/returns/:path*',destination:'/',permanent:false},
   {source:'/inventory',destination:'/',permanent:false},
   {source:'/inventory/:path*',destination:'/',permanent:false},
   {source:'/reports',destination:'/',permanent:false},
   {source:'/customers',destination:'/',permanent:false},
   {source:'/bank',destination:'/',permanent:false},
   {source:'/admin/:path*',destination:'/',permanent:false},
  ];
  return [
   {source:'/shopvui.html',destination:'/dashboard',permanent:false},
   {source:'/shop',destination:'/dashboard',permanent:false},
  ];
 },
 async headers(){return [{source:'/:path*',headers:[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Content-Security-Policy',value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  ...(isHttps()?[{key:'Strict-Transport-Security',value:'max-age=31536000'}]:[]),
 ]},{source:'/api/:path*',headers:[{key:'Cache-Control',value:'no-store'}]}];},
};
export default config;
