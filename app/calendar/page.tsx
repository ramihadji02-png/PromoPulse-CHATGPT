'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, Archive, CalendarRange, Copy, ExternalLink, Move, RotateCcw } from 'lucide-react';
import { Button, Card, StatusBadge, Tabs } from '@/components/ui';
import { getChannel, getLine, promotions } from '@/data/mock';
import { cn } from '@/lib/utils';
import type { Promotion } from '@/types/promo';

const zoomLevels = ['Année', 'Semestre', 'Trimestre', 'Mois', 'Semaine'];
const monthLabels = ['Juillet', 'Août', 'Septembre', 'Octobre'];
const timelineStart = new Date('2026-07-01T00:00:00');
const timelineEnd = new Date('2026-10-31T00:00:00');
const day = 1000 * 60 * 60 * 24;
const totalDays = Math.max(1, Math.round((timelineEnd.getTime() - timelineStart.getTime()) / day));

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatRange(promotion: Promotion) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).formatRange(new Date(promotion.startDate), new Date(promotion.endDate));
}

function timelinePosition(promotion: Promotion) {
  const start = Math.round((new Date(promotion.startDate).getTime() - timelineStart.getTime()) / day);
  const end = Math.round((new Date(promotion.endDate).getTime() - timelineStart.getTime()) / day);
  const left = clamp((start / totalDays) * 100, 0, 96);
  const width = clamp(((end - start + 1) / totalDays) * 100, 8, 34);
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
}

function detailLevel(zoom: string) {
  if (zoom === 'Année' || zoom === 'Semestre') return 'compact';
  if (zoom === 'Trimestre' || zoom === 'Mois') return 'standard';
  return 'detailed';
}

function riskTone(promotion: Promotion) {
  if (promotion.controlStatus === 'Problème') return 'border-red-200 bg-red-50 text-red-900';
  if (promotion.controlStatus === 'Vigilance') return 'border-orange-200 bg-orange-50 text-orange-900';
  return 'border-mint-200 bg-mint-100 text-navy-900';
}

function PromotionBlock({ promotion, zoom, row, onSelect }: { promotion: Promotion; zoom: string; row: number; onSelect: (promotion: Promotion) => void }) {
  const level = detailLevel(zoom);
  const line = getLine(promotion.productLineId);
  const channel = getChannel(promotion.channelIds[0]);

  return (
    <button
      className={cn(
        'group absolute rounded-2xl border px-3 py-2 text-left shadow-sm transition hover:z-20 hover:-translate-y-0.5 hover:shadow-lg focus:z-20 focus:outline-none focus:ring-2 focus:ring-mint-300',
        riskTone(promotion),
      )}
      onClick={() => onSelect(promotion)}
      style={{ ...timelinePosition(promotion), top: `${row * 74 + 18}px` }}
      type="button"
    >
      <p className="truncate text-sm font-bold">{level === 'compact' ? line.name : promotion.name}</p>
      <p className="mt-0.5 truncate text-xs opacity-80">{channel.name}</p>
      {level !== 'compact' && <p className="mt-1 truncate text-xs opacity-80">{formatRange(promotion)} · {promotion.mechanic}</p>}
      {level === 'detailed' && <p className="mt-1 truncate text-xs opacity-80">Marge {promotion.marginRate}% · ROI {promotion.roi}x</p>}
      <div className="pointer-events-none absolute left-3 top-[calc(100%+10px)] z-30 hidden w-64 rounded-2xl border border-navy-100 bg-white p-4 text-navy-900 shadow-soft group-hover:block group-focus:block">
        <p className="font-bold">{line.name}</p>
        <p className="mt-1 text-sm text-navy-600">{channel.name}</p>
        <p className="mt-2 text-sm text-navy-600">{formatRange(promotion)}</p>
        <p className="text-sm text-navy-600">{promotion.mechanic}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <span className="rounded-xl bg-navy-50 p-2">Marge {promotion.marginRate}%</span>
          <span className="rounded-xl bg-navy-50 p-2">ROI {promotion.roi}x</span>
        </div>
      </div>
    </button>
  );
}

export default function Calendar() {
  const [selected, setSelected] = useState(promotions[1]);
  const [zoom, setZoom] = useState('Mois');
  const visiblePromotions = useMemo(() => promotions.slice(0, 12), []);
  const riskyCount = visiblePromotions.filter((promotion) => promotion.controlStatus === 'Problème' || promotion.controlStatus === 'Vigilance').length;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-600">Planning promotionnel</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Calendrier</h1>
          <p className="mt-2 max-w-2xl text-navy-500">Visualisez la charge commerciale, les chevauchements et les promotions à risque sur une frise temporelle horizontale.</p>
        </div>
        <Tabs active={zoom} items={zoomLevels} onSelect={setZoom} />
      </section>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-xl border border-navy-100 p-2.5" placeholder="Recherche" />
          <select className="rounded-xl border border-navy-100 p-2.5"><option>Canal</option></select>
          <select className="rounded-xl border border-navy-100 p-2.5"><option>Produit</option></select>
          <select className="rounded-xl border border-navy-100 p-2.5"><option>Statut</option></select>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-navy-100 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Frise juillet à octobre 2026</h2>
              <p className="mt-1 text-sm text-navy-500">Le niveau de zoom modifie automatiquement le détail affiché dans chaque bloc.</p>
            </div>
            <div className="flex gap-2 text-xs text-navy-500">
              <span className="rounded-full bg-mint-100 px-3 py-1">Conforme</span>
              <span className="rounded-full bg-orange-50 px-3 py-1">À vérifier</span>
              <span className="rounded-full bg-red-50 px-3 py-1">Problème</span>
            </div>
          </div>

          <div className="overflow-x-auto p-6">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-4 border-b border-navy-100 pb-3 text-sm font-bold uppercase tracking-[0.14em] text-navy-400">
                {monthLabels.map((month) => <div key={month}>{month}</div>)}
              </div>
              <div className="relative mt-4 h-[940px] rounded-3xl bg-gradient-to-r from-navy-50 via-white to-navy-50">
                <div className="absolute inset-y-0 left-1/4 w-px bg-navy-100" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-navy-100" />
                <div className="absolute inset-y-0 left-3/4 w-px bg-navy-100" />
                <div className="absolute left-[46%] top-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Rentrée</div>
                <div className="absolute left-[84%] top-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Black Friday</div>
                <div className="absolute left-[93%] top-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Noël</div>
                {visiblePromotions.map((promotion, index) => (
                  <PromotionBlock key={promotion.id} promotion={promotion} zoom={zoom} row={index} onSelect={setSelected} />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-navy-400">Synthèse</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-navy-50 p-4"><p className="text-2xl font-black">{visiblePromotions.length}</p><p className="text-sm text-navy-500">promotions visibles</p></div>
              <div className="rounded-2xl bg-orange-50 p-4"><p className="text-2xl font-black">{riskyCount}</p><p className="text-sm text-orange-700">opérations à surveiller</p></div>
              <div className="rounded-2xl bg-blue-50 p-4"><p className="text-2xl font-black">3</p><p className="text-sm text-blue-700">temps forts commerciaux</p></div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">{selected.name}</h2>
            <p className="mt-2 text-sm text-navy-500">{getLine(selected.productLineId).name} · {formatRange(selected)}</p>
            <div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={selected.controlStatus} /><StatusBadge status={selected.operationalStatus} /></div>
            <div className="mt-5 rounded-2xl bg-navy-50 p-4 text-sm text-navy-600">
              <p>{getChannel(selected.channelIds[0]).name} · {selected.mechanic}</p>
              <p className="mt-1">Marge {selected.marginRate}% · ROI {selected.roi}x</p>
            </div>
            {selected.controlStatus !== 'Conforme' && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
                <p>{selected.checks[0]?.explanation}</p>
              </div>
            )}
            <div className="mt-6 grid gap-2">
              <Link href={`/promotions/${selected.id}`}><Button className="w-full"><ExternalLink className="mr-2" size={16} />Ouvrir</Button></Link>
              <Button variant="secondary"><Copy className="mr-2" size={16} />Dupliquer</Button>
              <Button variant="secondary"><RotateCcw className="mr-2" size={16} />Réutiliser</Button>
              <Button variant="secondary"><CalendarRange className="mr-2" size={16} />Modifier les dates</Button>
              <Button variant="secondary"><Move className="mr-2" size={16} />Déplacer</Button>
              <Button variant="secondary"><Archive className="mr-2" size={16} />Archiver</Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
