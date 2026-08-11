'use client';

import {
  BarChart3,
  Bot,
  CalendarDays,
  Download,
  FileText,
  Gauge,
  Home,
  Landmark,
  Package,
  Percent,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { company } from '@/data/mock';
import { NavLink } from './ui';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { href: '/promotions', label: 'Promotions', icon: Percent },
  { href: '/products', label: 'Produits', icon: Package },
  { href: '/channels', label: 'Enseignes & canaux', icon: Landmark },
  { href: '/analytics', label: 'Analyses', icon: BarChart3 },
  { href: '/calculator', label: 'Calculateur', icon: Gauge },
  { href: '/regulations', label: 'Réglementation', icon: FileText },
  { href: '/assistant', label: 'Assistant IA', icon: Bot },
  { href: '/exports', label: 'Exports', icon: Download },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-[#f7f9f8] lg:flex">
      <aside className="hidden w-72 bg-navy-900 p-5 text-white lg:block">
        <div className="mb-8 rounded-2xl bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-mint-500 text-sm font-black text-navy-900">PP</div>
            <div>
              <p className="text-xl font-black tracking-tight">Promo Pulse</p>
              <p className="text-sm text-navy-100">{company.name}</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1.5">
          {nav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} active={path.startsWith(href)} icon={<Icon size={17} strokeWidth={1.9} />} />
          ))}
        </nav>
      </aside>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-mint-500 text-xs font-black text-navy-900">PP</div>
          <b>Promo Pulse</b>
        </div>
        <SlidersHorizontal size={20} />
      </header>
      <main className="flex-1 p-4 md:p-8 xl:p-10">{children}</main>
    </div>
  );
}
