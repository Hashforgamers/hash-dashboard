"use client";
import {usePathname} from 'next/navigation';
import dynamic from 'next/dynamic';
import {ThemeProvider} from 'next-themes';
const DashboardProviders=dynamic(()=>import('./DashboardProviders'),{ssr:false});
export function PublicRouteBoundary({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  return pathname==='/play' ? <ThemeProvider attribute="class" forcedTheme="dark">{children}</ThemeProvider> : <DashboardProviders>{children}</DashboardProviders>;
}
