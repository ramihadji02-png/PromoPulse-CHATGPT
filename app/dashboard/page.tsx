'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronDown, Info, Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button, Card, StatusBadge } from '@/components/ui';
import { getChannel, getLine, promotions, user } from '@/data/mock';
import { cn, euro } from '@/lib/utils';
import type { Promotion } from '@/types/promo';

const availableKpis = ['CA promotionnel', 'Marge', 'Marge %', 'ROI', 'Volume', 'Nombre de promotions', 'Remise moyenne', 'Dépenses promotionnelles', 'ROAS e-commerce'];

function compactRange(promotion: Promotion) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).formatRange(new Date(promotion.startDate), new Date(promotion.endDate));
}

function ActionLine({ id, icon, title, action, promotions: items, category }: { id: string; icon: React.ReactNode; title: string; action: string; promotions: Promotion[]; category: 'regulatory' | 'performance' | 'operational' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="action-row border-t border-navy-100 px-1 first:border-t-0">
      <div className="flex items-center gap-3 py-4">
        <span className="action-icon flex h-9 w-9 shrink-0 items-center justify-center bg-navy-50 text-navy-700">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy-900">{title}</p>
          <Link className="mt-0.5 inline-block text-sm font-semibold text-mint-600 hover:text-mint-700" href="/promotions">{action}</Link>
        </div>
        <button aria-expanded={open} aria-controls={id} aria-label={open ? 'Réduire le détail' : 'Afficher le détail'} className="rounded-lg border border-navy-100 p-2 text-navy-500 transition hover:border-mint-300 hover:bg-mint-50 focus:outline-none focus:ring-2 focus:ring-mint-300" onClick={() => setOpen(!open)} type="button">
          <ChevronDown className={cn('transition-transform duration-150', open && 'rotate-180')} size={16} />
        </button>
      </div>
      <div className={cn('accordion-grid', open && 'is-open')}>
        <div>
          <div id={id} className="mb-4 ml-12 space-y-3 rounded-xl bg-navy-50 p-4">
            {items.slice(0, 3).map((promotion) => (
              <div key={promotion.id} className="flex flex-col gap-2 border-b border-white pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-navy-900">{getChannel(promotion.channelIds[0]).name} — {getLine(promotion.productLineId).name}</p>
                  {category === 'regulatory' && <p className="mt-1 text-sm text-navy-500">Problème : {promotion.checks[0]?.explanation}</p>}
                  {category === 'performance' && <p className="mt-1 text-sm tabular-nums text-navy-500">Marge : {promotion.marginRate}% · Objectif : 15 %</p>}
                  {category === 'operational' && <p className="mt-1 text-sm text-navy-500">{compactRange(promotion)} · {promotion.operationalStatus}</p>}
                </div>
                <Link className="text-sm font-semibold text-mint-600" href={`/promotions/${promotion.id}`}>Ouvrir</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [localPromotions, setLocalPromotions] = useState<Promotion[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLocalPromotions(JSON.parse(window.localStorage.getItem('promo-pulse-promotions') || '[]')), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const allPromotions = useMemo(() => Array.from(new Map([...promotions, ...localPromotions].map((promotion) => [promotion.id, promotion])).values()), [localPromotions]);
  const [showKpiSettings, setShowKpiSettings] = useState(false);
  const [showAllPromotions, setShowAllPromotions] = useState(false);
  const problemPromotions = allPromotions.filter((promotion) => promotion.controlStatus === 'Problème');
  const lowMarginPromotions = allPromotions.filter((promotion) => promotion.marginRate < 15);
  const upcomingPromotions = useMemo(() => allPromotions.filter((promotion) => promotion.operationalStatus !== 'Terminée').slice(0, 6), [allPromotions]);
  const displayedPromotions = showAllPromotions ? upcomingPromotions : upcomingPromotions.slice(0, 2);
  const planned = allPromotions.filter((promotion) => promotion.operationalStatus === 'Planifiée').length;
  const active = allPromotions.filter((promotion) => promotion.operationalStatus === 'En cours').length;
  const finished = allPromotions.filter((promotion) => promotion.operationalStatus === 'Terminée').length;
  const otherStatuses = allPromotions.length - planned - active - finished;
  const plannedEnd = (planned / allPromotions.length) * 100;
  const activeEnd = plannedEnd + (active / allPromotions.length) * 100;
  const finishedEnd = activeEnd + (finished / allPromotions.length) * 100;

  return (
    <div className="product-page mx-auto max-w-6xl space-y-10">
      <section className="dashboard-summary px-0 py-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy-900 md:text-4xl">Bonjour {user.firstName}</h1>
            <p className="mt-2 text-lg text-navy-500">Votre activité promotionnelle en un coup d’œil.</p>
          </div>
          <Button className="self-start" variant="ghost" onClick={() => setShowKpiSettings(!showKpiSettings)}><Settings2 className="mr-2" size={16} />Modifier les KPI</Button>
        </div>

        <div className="dashboard-kpis mt-9 grid sm:grid-cols-2 lg:grid-cols-4">
          <div className="dashboard-kpi">
            <p className="dashboard-kpi__label">CA promotionnel</p>
            <p className="dashboard-kpi__value mt-2">{euro(28450)}</p>
            <p className="dashboard-kpi__meta mt-1"><span className="dashboard-kpi__positive">+12,4 %</span> vs période précédente</p>
            <svg aria-label="Évolution positive du chiffre d’affaires" className="kpi-sparkline" preserveAspectRatio="none" viewBox="0 0 180 34"><path className="area" d="M0 31 L0 26 L22 24 L45 27 L68 18 L90 20 L113 12 L136 15 L158 7 L180 4 L180 31 Z"/><path d="M0 26 L22 24 L45 27 L68 18 L90 20 L113 12 L136 15 L158 7 L180 4"/></svg>
          </div>
          <div className="dashboard-kpi">
            <p className="dashboard-kpi__label">Marge promotionnelle</p>
            <p className="dashboard-kpi__value mt-2">17,8 %</p>
            <p className="dashboard-kpi__meta mt-1">Objectif : 15 %</p>
            <div aria-label="Marge au-dessus de l’objectif" className="kpi-gauge"><span className="kpi-gauge__value"/><span className="kpi-gauge__target" title="Objectif 15 %"/></div>
          </div>
          <div className="dashboard-kpi">
            <p className="dashboard-kpi__label flex items-center gap-1" title="Rapport entre le gain généré par les opérations et les dépenses associées.">ROI moyen <Info aria-hidden="true" size={12}/></p>
            <p className="dashboard-kpi__value mt-2">2,9×</p>
            <p className="dashboard-kpi__meta mt-1 flex items-center gap-1"><TrendingUp className="text-green-700" size={14}/><span className="font-semibold text-green-700">+0,4×</span> vs période précédente</p>
          </div>
          <div className="dashboard-kpi flex items-center justify-between gap-5">
            <div><p className="dashboard-kpi__label">Promotions</p><p className="dashboard-kpi__value mt-2">{allPromotions.length}</p><p className="dashboard-kpi__meta mt-1">{planned} planifiées · {active} en cours<br/>{finished} terminées · {otherStatuses} autres</p></div>
            <div aria-label={`${allPromotions.length} promotions réparties par statut`} className="kpi-donut shrink-0" role="img" style={{ background: `conic-gradient(#35c894 0 ${plannedEnd}%, #4b78a8 ${plannedEnd}% ${activeEnd}%, #17364b ${activeEnd}% ${finishedEnd}%, #d8e3e8 ${finishedEnd}% 100%)` }} />
          </div>
        </div>
        {showKpiSettings && <div className="mt-5 rounded-xl border border-navy-100 bg-white p-4 text-sm text-navy-600">KPI disponibles : {availableKpis.join(' · ')}. La sélection est mockée pour le prototype.</div>}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr]">
        <Card className="content-panel p-0 pt-6">
          <h2 className="section-label text-sm font-bold uppercase tracking-[0.16em] text-navy-400">Actions importantes</h2>
          <div className="mt-4">
            <ActionLine id="problems" category="regulatory" icon={<AlertTriangle size={17} className="text-red-600" />} title={`${problemPromotions.length} promotions présentent un problème réglementaire`} action="Voir les promotions" promotions={problemPromotions} />
            <ActionLine id="margins" category="performance" icon={<TrendingDown size={17} className="text-orange-600" />} title={`${lowMarginPromotions.length} promotions sont sous votre objectif de marge`} action="Analyser" promotions={lowMarginPromotions} />
            <ActionLine id="week" category="operational" icon={<CalendarDays size={17} className="text-blue-600" />} title="2 promotions commencent prochainement" action="Vérifier" promotions={upcomingPromotions.slice(0, 2)} />
          </div>
        </Card>

        <Card className="content-panel p-0 pt-6">
          <div className="flex items-center justify-between gap-3"><h2 className="section-label text-sm font-bold uppercase tracking-[0.16em] text-navy-400">Prochaines promotions</h2><Link className="text-sm font-semibold text-mint-600" href="/calendar">Voir le calendrier</Link></div>
          <div className="mt-5 space-y-2">
            {displayedPromotions.map((promotion) => <Link key={promotion.id} href={`/promotions/${promotion.id}`} className="promotion-link block p-3"><div className="flex items-start justify-between gap-4"><div><p className="font-bold text-navy-900">{getChannel(promotion.channelIds[0]).name} — {getLine(promotion.productLineId).name}</p><p className="mt-1 text-sm tabular-nums text-navy-500">{compactRange(promotion)}</p></div><StatusBadge status={promotion.operationalStatus}/></div>{promotion.controlStatus !== 'Conforme' && <p className={cn('mt-2 text-sm font-semibold', promotion.controlStatus === 'Problème' ? 'text-red-700' : 'text-orange-700')}>{promotion.controlStatus === 'Problème' ? 'Problème détecté' : 'Recommandation disponible'}</p>}</Link>)}
          </div>
          <button className="mt-3 text-sm font-semibold text-mint-600 transition hover:text-mint-700" onClick={() => setShowAllPromotions(!showAllPromotions)} type="button">{showAllPromotions ? 'Réduire la liste' : '+ Voir les autres promotions'}</button>
        </Card>
      </div>
    </div>
  );
}
