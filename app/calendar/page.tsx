'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Plus, X } from 'lucide-react';
import { Button, Card, StatusBadge, Tabs } from '@/components/ui';
import { getChannel, getLine, getProduct, promotions } from '@/data/mock';
import { cn } from '@/lib/utils';
import {getRetailerScope} from '@/lib/retailers/repository';
import type { Promotion } from '@/types/promo';

const zoomLevels = ['Année', 'Semestre', 'Trimestre', 'Mois', 'Semaine'];
const dayMs = 86400000;
const channelColors: Record<string, { bar: string; dot: string }> = {
  ch1: { bar: 'border-blue-200 bg-blue-100 text-blue-950 hover:bg-blue-200', dot: 'bg-blue-400' },
  ch2: { bar: 'border-violet-200 bg-violet-100 text-violet-950 hover:bg-violet-200', dot: 'bg-violet-400' },
  ch3: { bar: 'border-teal-200 bg-teal-100 text-teal-950 hover:bg-teal-200', dot: 'bg-teal-400' },
  ch4: { bar: 'border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-200', dot: 'bg-amber-400' },
  ch5: { bar: 'border-rose-200 bg-rose-100 text-rose-950 hover:bg-rose-200', dot: 'bg-rose-400' },
};
const commercialEvents = [
  { name: 'Soldes', start: '2026-01-08', end: '2026-02-04' }, { name: 'Saint-Valentin', start: '2026-02-14', end: '2026-02-14' },
  { name: 'Pâques', start: '2026-04-05', end: '2026-04-06' }, { name: 'Fête des Mères', start: '2026-05-31', end: '2026-05-31' },
  { name: 'Foire locale', start: '2026-06-12', end: '2026-06-15' }, { name: 'Rentrée', start: '2026-08-24', end: '2026-09-13' },
  { name: 'Black Friday', start: '2026-11-23', end: '2026-11-30' }, { name: 'Noël', start: '2026-12-01', end: '2026-12-24' },
];
const periods = {
  Année: { label: '2026', start: '2026-01-01', end: '2026-12-31', ticks: ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'] },
  Semestre: { label: 'S2 2026 — Juillet → Décembre 2026', start: '2026-07-01', end: '2026-12-31', ticks: ['Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'] },
  Trimestre: { label: 'T3 2026', start: '2026-07-01', end: '2026-09-30', ticks: ['Juillet', 'Août', 'Septembre'] },
  Mois: { label: 'Septembre 2026', start: '2026-09-01', end: '2026-09-30', ticks: ['01', '05', '10', '15', '20', '25', '30'] },
  Semaine: { label: 'Semaine du 14 septembre 2026', start: '2026-09-14', end: '2026-09-20', ticks: ['Lun 14', 'Mar 15', 'Mer 16', 'Jeu 17', 'Ven 18', 'Sam 19', 'Dim 20'] },
} as const;

function date(date: string) { return new Date(`${date}T00:00:00`); }
function fmt(start: string, end: string) { return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).formatRange(date(start), date(end)); }
function overlaps(item: { startDate?: string; endDate?: string; start?: string; end?: string }, start: Date, end: Date) {
  const itemStart = date(item.startDate ?? item.start!); const itemEnd = date(item.endDate ?? item.end!);
  return itemStart <= end && itemEnd >= start;
}
function position(startDate: string, endDate: string, start: Date, end: Date, minWidth: number) {
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  const startOffset = Math.max(0, Math.round((date(startDate).getTime() - start.getTime()) / dayMs));
  const endOffset = Math.min(total, Math.round((date(endDate).getTime() - start.getTime()) / dayMs) + 1);
  const left = (startOffset / total) * 100;
  const width = Math.max(minWidth, ((endOffset - startOffset) / total) * 100);
  return { left: `${Math.min(left, 98)}%`, width: `${Math.min(width, 100 - left)}%` };
}
function layoutRows(items: Promotion[]) {
  const rows: Promotion[][] = [];
  return items.map((promotion) => {
    const start = date(promotion.startDate); const end = date(promotion.endDate);
    let row = rows.findIndex((rowItems) => rowItems.every((item) => date(item.endDate) < start || date(item.startDate) > end));
    if (row === -1) { row = rows.length; rows.push([]); }
    rows[row].push(promotion);
    return { promotion, row };
  });
}
function promotionScopeColor(promotion:Promotion){const id=promotion.retailerScopeSnapshot?.[0]?.scopeId;return id?getRetailerScope(id)?.calendarColor:undefined}
function blockText(zoom: string, promotion: Promotion) {
  const line = getLine(promotion.productLineId).name; const channel = getChannel(promotion.channelIds[0]).name;
  if (zoom === 'Année') return <span className="sr-only">{line} — {channel}</span>;
  if (zoom === 'Semestre') return <><strong>{line}</strong><span>{channel}</span></>;
  if (zoom === 'Trimestre') return <><strong>{line}</strong><span>{channel} · {promotion.mechanic}</span></>;
  if (zoom === 'Mois') return <><strong>{line}</strong><span>{channel} · {promotion.mechanic}</span><span>{promotion.controlStatus}</span></>;
  return <><strong>{promotion.name}</strong><span>{line} · {channel}</span><span>{fmt(promotion.startDate, promotion.endDate)} · {promotion.mechanic}</span><span>{promotion.operationalStatus}</span></>;
}

export default function Calendar() {
  const [zoom, setZoom] = useState<keyof typeof periods>('Mois');
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [highlightedChannel, setHighlightedChannel] = useState<string | null>(null);
  const [localPromotions, setLocalPromotions] = useState<Promotion[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLocalPromotions(JSON.parse(window.localStorage.getItem('promo-pulse-promotions') || '[]')), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const allPromotions = useMemo(() => Array.from(new Map([...promotions, ...localPromotions].map((promotion) => [promotion.id, promotion])).values()), [localPromotions]);
  const period = periods[zoom];
  const start = date(period.start); const end = date(period.end);
  const visible = useMemo(() => allPromotions.filter((promotion) => overlaps(promotion, start, end)).sort((a, b) => +date(a.startDate) - +date(b.startDate)), [allPromotions, start, end]);
  const laidOut = layoutRows(visible);
  const rowHeight = zoom === 'Année' ? 26 : zoom === 'Semestre' ? 58 : zoom === 'Trimestre' ? 68 : zoom === 'Mois' ? 88 : 118;
  const height = Math.max(rowHeight + 34, (Math.max(0, ...laidOut.map((item) => item.row)) + 1) * rowHeight + 36);
  const events = commercialEvents.filter((event) => overlaps(event, start, end));
  const minWidth = zoom === 'Année' ? 1.1 : zoom === 'Semaine' ? 10 : 4;
  const firstProduct = selected ? getProduct(selected.products[0]?.productId) : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const showToday = date(today) >= start && date(today) <= end;
  const todayPosition = showToday ? position(today, today, start, end, 0).left : undefined;

  return (
    <div className="product-page mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-600">Planning promotionnel</p><h1 className="mt-3 text-3xl font-black tracking-tight">Calendrier</h1><p className="mt-2 max-w-2xl text-navy-500">Une frise horizontale pour comprendre la charge, les chevauchements et les temps forts.</p></div>
        <Tabs active={zoom} items={zoomLevels} onSelect={(item) => setZoom(item as keyof typeof periods)} />
      </section>

      <Card className="operational-panel calendar-controls p-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {['Recherche', 'Canal', 'Produit', 'Gamme', 'Enseigne', 'Statut', 'Responsable', 'Mécanique'].map((label, index) => index === 0 ? <input key={label} className="rounded-[10px] border border-navy-100 px-3 py-2 text-sm" placeholder={label} /> : <select key={label} className="rounded-[10px] border border-navy-100 px-3 py-2 text-sm"><option>{label}</option></select>)}
        </div>
      </Card>

      <Card className="operational-panel calendar-frame overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-navy-100 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3"><button className="rounded-[9px] border border-navy-100 p-2 text-navy-500 transition hover:border-mint-300 hover:bg-white" type="button"><ChevronLeft size={16} /></button><div><h2 className="text-xl font-bold">{period.label}</h2><p className="text-sm text-navy-500">{visible.length} promotions visibles · hauteur ajustée aux chevauchements</p></div><button className="rounded-[9px] border border-navy-100 p-2 text-navy-500 transition hover:border-mint-300 hover:bg-white" type="button"><ChevronRight size={16} /></button></div>
            <Button variant="secondary"><Plus className="mr-2" size={16} />Ajouter un temps fort</Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-navy-100 px-5 py-3 text-xs text-navy-600">
            <span className="font-bold uppercase tracking-[0.14em] text-navy-400">Enseignes</span>
            {['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].map((id) => <button className={cn('calendar-legend-item flex items-center gap-2', highlightedChannel && highlightedChannel !== id && 'is-muted', highlightedChannel === id && 'is-active')} key={id} onBlur={() => setHighlightedChannel(null)} onFocus={() => setHighlightedChannel(id)} onMouseEnter={() => setHighlightedChannel(id)} onMouseLeave={() => setHighlightedChannel(null)} type="button"><span className={cn('h-2.5 w-2.5 rounded-full', channelColors[id].dot)} />{getChannel(id).name}</button>)}
            <span className="ml-auto flex items-center gap-2"><AlertCircle size={13} className="text-red-600" /> Contrôle à vérifier</span>
          </div>
          <div className="overflow-x-auto p-5">
            <div className="min-w-[920px]">
              <div className="grid text-xs font-bold uppercase tracking-[0.12em] text-navy-400" style={{ gridTemplateColumns: `repeat(${period.ticks.length}, minmax(0, 1fr))` }}>{period.ticks.map((tick) => <div key={tick}>{tick}</div>)}</div>
              <div className="calendar-track relative mt-3 rounded-3xl bg-navy-50/70" style={{ height }}>
                {period.ticks.slice(1).map((tick, index) => <div key={tick} className="calendar-gridline absolute inset-y-0 w-px bg-white" style={{ left: `${((index + 1) / period.ticks.length) * 100}%` }} />)}
                {showToday && <div className="calendar-today" style={{ left: todayPosition }}><span>Aujourd’hui</span></div>}
                {events.map((event) => <div key={event.name} className="calendar-highlight absolute top-2 h-5 rounded-full border border-blue-100 bg-blue-50/90 px-2 text-[11px] font-semibold text-blue-700" style={position(event.start, event.end, start, end, 2)}>{event.name}</div>)}
                {laidOut.map(({ promotion, row }) => <button key={promotion.id} className={cn('calendar-event group absolute overflow-visible rounded-xl border px-2 py-1.5 text-left text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-mint-300', zoom !== 'Année' && 'min-h-10', highlightedChannel && highlightedChannel !== promotion.channelIds[0] && 'is-muted', highlightedChannel === promotion.channelIds[0] && 'is-highlighted', channelColors[promotion.channelIds[0]]?.bar ?? 'border-slate-200 bg-slate-100 text-slate-950')} onBlur={() => setHighlightedChannel(null)} onClick={() => setSelected(promotion)} onFocus={() => setHighlightedChannel(promotion.channelIds[0])} onMouseEnter={() => setHighlightedChannel(promotion.channelIds[0])} onMouseLeave={() => setHighlightedChannel(null)} style={{ ...position(promotion.startDate, promotion.endDate, start, end, minWidth), top: 32 + row * rowHeight, ...(promotionScopeColor(promotion)?{borderLeftColor:promotionScopeColor(promotion),borderLeftWidth:4}:{}) }} type="button"><span className="flex flex-col leading-snug">{blockText(zoom, promotion)}</span>{promotion.controlStatus !== 'Conforme' && <AlertCircle className={cn('absolute right-1 top-1', promotion.controlStatus === 'Problème' ? 'text-red-600' : 'text-orange-600')} size={zoom === 'Année' ? 10 : 13} />}<span className="calendar-tooltip pointer-events-none absolute left-0 top-[calc(100%+8px)] z-30 hidden w-64 rounded-2xl border border-navy-100 bg-white p-4 text-navy-900 shadow-soft group-hover:block group-focus:block"><strong>{getLine(promotion.productLineId).name}</strong><span className="mt-1 block text-sm text-navy-600">{getChannel(promotion.channelIds[0]).name}</span><span className="mt-2 block text-sm text-navy-600">{fmt(promotion.startDate, promotion.endDate)} · {promotion.mechanic}</span><span className="mt-2 block text-sm text-navy-600">{promotion.operationalStatus} · {promotion.controlStatus}</span></span></button>)}
              </div>
            </div>
          </div>
      </Card>

      {selected && <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/20" onClick={() => setSelected(null)} role="presentation">
        <aside aria-label="Détail de la promotion" className="calendar-drawer h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold">{selected.name}</h2>
            <button aria-label="Fermer" className="rounded-full border border-navy-100 p-2 text-navy-500 hover:bg-navy-50" onClick={() => setSelected(null)} type="button"><X size={18} /></button>
          </div>
            <p className="mt-2 text-sm text-navy-500">{getLine(selected.productLineId).name} · {fmt(selected.startDate, selected.endDate)}</p>
            <div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={selected.controlStatus} /><StatusBadge status={selected.operationalStatus} /></div>
            <dl className="mt-5 space-y-2 text-sm text-navy-600"><div><dt className="font-semibold text-navy-900">Produit</dt><dd>{firstProduct?.name} · {firstProduct?.ean.code}</dd></div><div><dt className="font-semibold text-navy-900">Canal</dt><dd>{getChannel(selected.channelIds[0]).name}</dd></div><div><dt className="font-semibold text-navy-900">Mécanique</dt><dd>{selected.mechanic}</dd></div><div><dt className="font-semibold text-navy-900">Performance</dt><dd>Marge {selected.marginRate}% · ROI {selected.roi}×</dd></div></dl>
            {selected.controlStatus !== 'Conforme' && <div className="mt-4 flex gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800"><AlertCircle className="mt-0.5 shrink-0" size={17} /><p>{selected.checks[0]?.explanation}</p></div>}
            <Link href={`/promotions/${selected.id}`}><Button className="primary-action mt-6 w-full"><ExternalLink className="mr-2" size={16} />Ouvrir la promotion</Button></Link>
        </aside>
      </div>}
    </div>
  );
}
