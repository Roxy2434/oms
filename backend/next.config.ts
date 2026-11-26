import type { NextConfig } from 'next';
const isHttps = () => Boolean(process.env.APP_ORIGIN?.startsWith('https:') || process.env.VERCEL === '1');
const config: NextConfig = {
 poweredByHeader:false,devIndicators:false,
 serverExternalPackages:['argon2','pg'],
 async rewrites(){return {beforeFiles:[
  ...(process.env.VERCEL==='1'?[{source:'/',destination:'/shopvui.html'}]:[]),
  {source:'/shop',destination:'/shopvui.html'},
 ]};},
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
