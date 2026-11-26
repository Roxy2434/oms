import type { Metadata } from 'next';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './globals.css';
export const metadata: Metadata = { title: 'EZMART · Quản lý đơn hàng', description: 'Hệ thống quản lý đơn hàng và điều phối kho vận đa kênh EZMART' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="vi" suppressHydrationWarning><head>{/* Apply the remembered sidebar state before first paint (no flash, no animation on load). */}<script dangerouslySetInnerHTML={{__html:"try{if(localStorage.getItem('oms.sidebar')==='closed')document.documentElement.dataset.sidebar='closed'}catch(e){}"}}/></head><body>{children}</body></html>; }
