import type { Metadata } from 'next'; import './globals.css'; import { AppShell } from '@/components/app-shell';
export const metadata: Metadata = { title: 'Promo Pulse', description: 'Cockpit des promotions' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='fr'><body><AppShell>{children}</AppShell></body></html>}
