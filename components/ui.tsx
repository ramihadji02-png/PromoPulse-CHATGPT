'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ControlStatus, OperationalStatus } from '@/types/promo';

export function Button({
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint-300 focus:ring-offset-2',
        variant === 'primary' && 'bg-mint-500 text-navy-900 hover:bg-mint-600',
        variant === 'secondary' && 'border border-navy-100 bg-white text-navy-900 hover:border-mint-300',
        variant === 'ghost' && 'text-navy-500 hover:bg-navy-50',
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-navy-100 bg-white p-6 shadow-soft', className)} {...props} />;
}

export function Badge({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'success' && 'bg-green-50 text-green-700',
        tone === 'warning' && 'bg-orange-50 text-orange-700',
        tone === 'danger' && 'bg-red-50 text-red-700',
        tone === 'info' && 'bg-blue-50 text-blue-700',
        tone === 'neutral' && 'bg-navy-50 text-navy-500',
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ControlStatus | OperationalStatus }) {
  const tone =
    status === 'Conforme'
      ? 'success'
      : status === 'Vigilance'
        ? 'warning'
        : status === 'Problème'
          ? 'danger'
          : status === 'Non vérifié'
            ? 'neutral'
            : 'info';

  return <Badge tone={tone}>{status}</Badge>;
}

export function KpiCard({
  label,
  value,
  icon,
  caption,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  caption?: string;
  tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'info';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-5',
        tone === 'danger' && 'border-red-100',
        tone === 'warning' && 'border-orange-100',
        tone === 'success' && 'border-green-100',
        tone === 'info' && 'border-blue-100',
        tone === 'neutral' && 'border-navy-100',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-navy-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-navy-900">{value}</p>
          {caption && <p className="mt-2 text-xs leading-5 text-navy-500">{caption}</p>}
        </div>
        {icon && <div className="rounded-xl bg-navy-50 p-2 text-navy-500">{icon}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action: string }) {
  return (
    <Card className="text-center">
      <p className="text-lg font-semibold">{title}</p>
      <Button className="mt-4">{action}</Button>
    </Card>
  );
}

export function NavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      className={cn(
        'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition duration-150',
        active ? 'bg-[#68C5A8] text-[#172A3A] shadow-[2px_2px_0_rgba(221,233,201,0.35)]' : 'text-white/75 hover:bg-white/[0.06] hover:text-white',
      )}
      href={href}
    >
      {icon && <span className="text-current opacity-80">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}

export function Tabs({
  items,
  active,
  onSelect,
}: {
  items: string[];
  active: string;
  onSelect?: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onSelect?.(item)}
          className={cn(
            'rounded-full px-3.5 py-2 text-sm font-semibold transition',
            item === active ? 'bg-navy-900 text-white' : 'border border-navy-100 bg-white text-navy-500 hover:border-mint-300',
          )}
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
