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
import { ThemeLab, useThemeLab } from './theme-lab';

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
  const { theme, selectTheme } = useThemeLab();
  const labEnabled = path === '/dashboard' || path === '/calendar' || path === '/promotions';

  return (
    <div className="pp-shell min-h-screen lg:flex" data-pp-theme={theme}>
      <aside className="pp-sidebar hidden w-72 flex-col p-5 text-white lg:flex">
        <div className="pp-brand-block mb-9 p-4">
          <div className="flex items-center gap-3">
            <div className="pp-brand-mark flex size-10 items-center justify-center text-sm font-black text-navy-900">PP</div>
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
        {labEnabled && <ThemeLab theme={theme} onSelect={selectTheme} />}
      </aside>
      <header className="pp-mobile-header sticky top-0 z-10 flex items-center justify-between border-b p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="pp-brand-mark flex size-9 items-center justify-center text-xs font-black text-navy-900">PP</div>
          <b>Promo Pulse</b>
        </div>
        <SlidersHorizontal size={20} />
      </header>
      <main className={labEnabled ? "pp-lab-scope flex-1 p-4 md:p-8 xl:p-10" : "flex-1 p-4 md:p-8 xl:p-10"}>{labEnabled && <div className="mb-5 lg:hidden"><ThemeLab theme={theme} onSelect={selectTheme} /></div>}{children}</main>
    </div>
  );
}
