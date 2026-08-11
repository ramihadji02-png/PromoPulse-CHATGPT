'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { Button, Card, StatusBadge, Tabs } from '@/components/ui';
import { getChannel, getLine, getProduct, promotions } from '@/data/mock';
import { cn } from '@/lib/utils';
import type { Promotion } from '@/types/promo';

const zoomLevels = ['Année', 'Semestre', 'Trimestre', 'Mois', 'Semaine'];
const dayMs = 86400000;
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
function blockText(zoom: string, promotion: Promotion) {
  const line = getLine(promotion.productLineId).name; const channel = getChannel(promotion.channelIds[0]).name;
  if (zoom === 'Année') return <span className="sr-only">{line} — {channel}</span>;
  if (zoom === 'Semestre') return <><strong>{line}</strong><span>{channel}</span></>;
  if (zoom === 'Trimestre') return <><strong>{line}</strong><span>{channel} · {promotion.mechanic}</span></>;
  if (zoom === 'Mois') return <><strong>{line}</strong><span>{channel} · {promotion.mechanic}</span><span>{promotion.controlStatus}</span></>;
  return <><strong>{promotion.name}</strong><span>{line} · {channel}</span><span>{fmt(promotion.startDate, promotion.endDate)} · {promotion.mechanic}</span><span>Marge {promotion.marginRate}% · ROI {promotion.roi}×</span></>;
}
function tone(promotion: Promotion) {
  if (promotion.controlStatus === 'Problème') return 'bg-red-100 text-red-950 border-red-200 hover:bg-red-200';
  if (promotion.controlStatus === 'Vigilance') return 'bg-orange-100 text-orange-950 border-orange-200 hover:bg-orange-200';
  return 'bg-mint-100 text-navy-950 border-mint-200 hover:bg-mint-200';
}

export default function Calendar() {
  const [zoom, setZoom] = useState<keyof typeof periods>('Mois');
  const [selected, setSelected] = useState(promotions[1]);
  const period = periods[zoom];
  const start = date(period.start); const end = date(period.end);
  const visible = useMemo(() => promotions.filter((promotion) => overlaps(promotion, start, end)).sort((a, b) => +date(a.startDate) - +date(b.startDate)), [start, end]);
  const laidOut = layoutRows(visible);
  const rowHeight = zoom === 'Année' ? 26 : zoom === 'Semestre' ? 58 : zoom === 'Trimestre' ? 68 : zoom === 'Mois' ? 88 : 118;
  const height = Math.max(rowHeight + 34, (Math.max(0, ...laidOut.map((item) => item.row)) + 1) * rowHeight + 36);
  const events = commercialEvents.filter((event) => overlaps(event, start, end));
  const minWidth = zoom === 'Année' ? 1.1 : zoom === 'Semaine' ? 10 : 4;
  const firstProduct = getProduct(selected.products[0]?.productId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-600">Planning promotionnel</p><h1 className="mt-3 text-3xl font-black tracking-tight">Calendrier</h1><p className="mt-2 max-w-2xl text-navy-500">Une frise horizontale pour comprendre la charge, les chevauchements et les temps forts.</p></div>
        <Tabs active={zoom} items={zoomLevels} onSelect={(item) => setZoom(item as keyof typeof periods)} />
      </section>

      <Card className="p-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {['Recherche', 'Canal', 'Produit', 'Gamme', 'Enseigne', 'Statut', 'Responsable', 'Mécanique'].map((label, index) => index === 0 ? <input key={label} className="rounded-xl border border-navy-100 px-3 py-2 text-sm" placeholder={label} /> : <select key={label} className="rounded-xl border border-navy-100 px-3 py-2 text-sm"><option>{label}</option></select>)}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-navy-100 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3"><button className="rounded-full border border-navy-100 p-2 text-navy-500" type="button"><ChevronLeft size={16} /></button><div><h2 className="text-xl font-bold">{period.label}</h2><p className="text-sm text-navy-500">{visible.length} promotions visibles · hauteur ajustée aux chevauchements</p></div><button className="rounded-full border border-navy-100 p-2 text-navy-500" type="button"><ChevronRight size={16} /></button></div>
            <Button variant="secondary"><Plus className="mr-2" size={16} />Ajouter un temps fort</Button>
          </div>
          <div className="overflow-x-auto p-5">
            <div className="min-w-[920px]">
              <div className="grid text-xs font-bold uppercase tracking-[0.12em] text-navy-400" style={{ gridTemplateColumns: `repeat(${period.ticks.length}, minmax(0, 1fr))` }}>{period.ticks.map((tick) => <div key={tick}>{tick}</div>)}</div>
              <div className="relative mt-3 rounded-3xl bg-navy-50/70" style={{ height }}>
                {period.ticks.slice(1).map((tick, index) => <div key={tick} className="absolute inset-y-0 w-px bg-white" style={{ left: `${((index + 1) / period.ticks.length) * 100}%` }} />)}
                {events.map((event) => <div key={event.name} className="absolute top-2 h-5 rounded-full border border-blue-100 bg-blue-50/90 px-2 text-[11px] font-semibold text-blue-700" style={position(event.start, event.end, start, end, 2)}>{event.name}</div>)}
                {laidOut.map(({ promotion, row }) => <button key={promotion.id} className={cn('group absolute overflow-visible rounded-xl border px-2 py-1.5 text-left text-xs shadow-sm transition hover:z-20 focus:z-20 focus:outline-none focus:ring-2 focus:ring-mint-300', zoom !== 'Année' && 'min-h-10', tone(promotion))} onClick={() => setSelected(promotion)} style={{ ...position(promotion.startDate, promotion.endDate, start, end, minWidth), top: 32 + row * rowHeight }} type="button"><span className="flex flex-col leading-snug">{blockText(zoom, promotion)}</span><span className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-30 hidden w-64 rounded-2xl border border-navy-100 bg-white p-4 text-navy-900 shadow-soft group-hover:block group-focus:block"><strong>{getLine(promotion.productLineId).name}</strong><span className="mt-1 block text-sm text-navy-600">{getChannel(promotion.channelIds[0]).name}</span><span className="mt-2 block text-sm text-navy-600">{fmt(promotion.startDate, promotion.endDate)} · {promotion.mechanic}</span><span className="mt-2 block text-sm text-navy-600">Marge {promotion.marginRate}% · ROI {promotion.roi}×</span></span></button>)}
              </div>
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-xl font-bold">{selected.name}</h2>
            <p className="mt-2 text-sm text-navy-500">{getLine(selected.productLineId).name} · {fmt(selected.startDate, selected.endDate)}</p>
            <div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={selected.controlStatus} /><StatusBadge status={selected.operationalStatus} /></div>
            <dl className="mt-5 space-y-2 text-sm text-navy-600"><div><dt className="font-semibold text-navy-900">Produit</dt><dd>{firstProduct?.name} · {firstProduct?.ean.code}</dd></div><div><dt className="font-semibold text-navy-900">Canal</dt><dd>{getChannel(selected.channelIds[0]).name}</dd></div><div><dt className="font-semibold text-navy-900">Mécanique</dt><dd>{selected.mechanic}</dd></div><div><dt className="font-semibold text-navy-900">Performance</dt><dd>Marge {selected.marginRate}% · ROI {selected.roi}×</dd></div></dl>
            {selected.controlStatus !== 'Conforme' && <div className="mt-4 flex gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800"><AlertCircle className="mt-0.5 shrink-0" size={17} /><p>{selected.checks[0]?.explanation}</p></div>}
            <Link href={`/promotions/${selected.id}`}><Button className="mt-6 w-full"><ExternalLink className="mr-2" size={16} />Ouvrir la promotion</Button></Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
