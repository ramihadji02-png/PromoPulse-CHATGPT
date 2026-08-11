'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronDown, ChevronUp, Settings2, TrendingDown } from 'lucide-react';
import { Button, Card, StatusBadge } from '@/components/ui';
import { getChannel, getLine, promotions, user } from '@/data/mock';
import { cn, euro } from '@/lib/utils';
import type { Promotion } from '@/types/promo';

const availableKpis = ['CA promotionnel', 'Marge', 'Marge %', 'ROI', 'Volume', 'Nombre de promotions', 'Remise moyenne', 'Dépenses promotionnelles', 'ROAS e-commerce'];
const visibleKpis = [
  { label: 'CA promotionnel', value: euro(28450) },
  { label: 'Marge promotionnelle', value: '17,8 %' },
  { label: 'ROI moyen', value: '2,9×' },
  { label: 'Promotions', value: promotions.length.toString() },
];

function compactRange(promotion: Promotion) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).formatRange(new Date(promotion.startDate), new Date(promotion.endDate));
}

function ActionLine({ id, icon, title, action, promotions: items, category }: { id: string; icon: React.ReactNode; title: string; action: string; promotions: Promotion[]; category: 'regulatory' | 'performance' | 'operational' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-navy-100 first:border-t-0">
      <div className="flex items-center gap-3 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy-900">{title}</p>
          <Link className="mt-0.5 inline-block text-sm font-semibold text-mint-700 hover:text-mint-800" href="/promotions">{action}</Link>
        </div>
        <button aria-expanded={open} aria-controls={id} className="rounded-full border border-navy-100 p-2 text-navy-500 transition hover:bg-navy-50" onClick={() => setOpen(!open)} type="button">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {open && (
        <div id={id} className="mb-4 ml-12 space-y-3 rounded-2xl bg-navy-50 p-4">
          {items.slice(0, 3).map((promotion) => (
            <div key={promotion.id} className="flex flex-col gap-2 border-b border-white pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-navy-900">{getChannel(promotion.channelIds[0]).name} — {getLine(promotion.productLineId).name}</p>
                {category === 'regulatory' && <p className="mt-1 text-sm text-navy-500">Problème : {promotion.checks[0]?.explanation}</p>}
                {category === 'performance' && <p className="mt-1 text-sm text-navy-500">Marge : {promotion.marginRate}% · Objectif : 15 %</p>}
                {category === 'operational' && <p className="mt-1 text-sm text-navy-500">{compactRange(promotion)} · {promotion.operationalStatus}</p>}
              </div>
              <Link className="text-sm font-semibold text-mint-700" href={`/promotions/${promotion.id}`}>Ouvrir</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [showKpiSettings, setShowKpiSettings] = useState(false);
  const [showAllPromotions, setShowAllPromotions] = useState(false);
  const problemPromotions = promotions.filter((promotion) => promotion.controlStatus === 'Problème');
  const lowMarginPromotions = promotions.filter((promotion) => promotion.marginRate < 15);
  const upcomingPromotions = useMemo(() => promotions.filter((promotion) => promotion.operationalStatus !== 'Terminée').slice(0, 6), []);
  const displayedPromotions = showAllPromotions ? upcomingPromotions : upcomingPromotions.slice(0, 2);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-[2rem] bg-white px-7 py-7 shadow-soft ring-1 ring-navy-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-navy-900 md:text-4xl">Bonjour {user.firstName}</h1>
            <p className="mt-2 text-lg text-navy-500">Votre activité promotionnelle en un coup d’œil.</p>
          </div>
          <Button className="self-start" variant="ghost" onClick={() => setShowKpiSettings(!showKpiSettings)}><Settings2 className="mr-2" size={16} />Modifier les KPI</Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleKpis.map((kpi) => (
            <div key={kpi.label} className="border-l border-navy-100 pl-5 first:border-l-0 first:pl-0 sm:[&:nth-child(3)]:border-l-0 sm:[&:nth-child(3)]:pl-0 lg:[&:nth-child(3)]:border-l lg:[&:nth-child(3)]:pl-5">
              <p className="text-sm font-semibold text-navy-500">{kpi.label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-navy-900">{kpi.value}</p>
            </div>
          ))}
        </div>
        {showKpiSettings && <div className="mt-6 rounded-2xl bg-navy-50 p-4 text-sm text-navy-600">KPI disponibles : {availableKpis.join(' · ')}. La sélection est mockée pour le prototype.</div>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-navy-400">Actions importantes</h2>
          <div className="mt-4">
            <ActionLine id="problems" category="regulatory" icon={<AlertTriangle size={17} className="text-red-600" />} title={`${problemPromotions.length} promotions présentent un problème réglementaire`} action="Voir les promotions" promotions={problemPromotions} />
            <ActionLine id="margins" category="performance" icon={<TrendingDown size={17} className="text-orange-600" />} title={`${lowMarginPromotions.length} promotions sont sous votre objectif de marge`} action="Analyser" promotions={lowMarginPromotions} />
            <ActionLine id="week" category="operational" icon={<CalendarDays size={17} className="text-blue-600" />} title="2 promotions commencent prochainement" action="Vérifier" promotions={upcomingPromotions.slice(0, 2)} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-navy-400">Prochaines promotions</h2>
            <Link className="text-sm font-semibold text-mint-700" href="/calendar">Voir le calendrier</Link>
          </div>
          <div className="mt-5 space-y-4">
            {displayedPromotions.map((promotion) => (
              <Link key={promotion.id} href={`/promotions/${promotion.id}`} className="block rounded-2xl p-3 transition hover:bg-navy-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-navy-900">{getChannel(promotion.channelIds[0]).name} — {getLine(promotion.productLineId).name}</p>
                    <p className="mt-1 text-sm text-navy-500">{compactRange(promotion)}</p>
                  </div>
                  <StatusBadge status={promotion.operationalStatus} />
                </div>
                {promotion.controlStatus !== 'Conforme' && <p className={cn('mt-2 text-sm font-semibold', promotion.controlStatus === 'Problème' ? 'text-red-700' : 'text-orange-700')}>{promotion.controlStatus === 'Problème' ? 'Problème détecté' : 'Recommandation disponible'}</p>}
              </Link>
            ))}
          </div>
          <button className="mt-3 text-sm font-semibold text-mint-700" onClick={() => setShowAllPromotions(!showAllPromotions)} type="button">{showAllPromotions ? 'Réduire la liste' : '+ Voir les autres promotions'}</button>
        </Card>
      </div>
    </div>
  );
}
