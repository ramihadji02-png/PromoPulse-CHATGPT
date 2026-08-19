'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getChannel, getLine } from '@/data/mock';
import { euro, shortDate } from '@/lib/utils';
import type { Promotion } from '@/types/promo';
import { Button, Card, StatusBadge } from './ui';

export function PromotionTimeline({ items }: { items: Promotion[] }) {
  return (
    <div className="divide-y divide-navy-100">
      {items.map((promotion) => (
        <Link key={promotion.id} href={`/promotions/${promotion.id}`} className="group flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900 group-hover:text-mint-600">{promotion.name}</p>
            <p className="mt-1 text-sm text-navy-500">
              {shortDate(promotion.startDate)} → {shortDate(promotion.endDate)} · {getLine(promotion.productLineId).name} · {getChannel(promotion.channelIds[0]).name} · {promotion.mechanic}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={promotion.operationalStatus} />
            <ArrowRight className="text-navy-300 group-hover:text-mint-600" size={17} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function AiRecommendation({ promo }: { promo: Promotion }) {
  return (
    <Card className="border-mint-200 p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-mint-700">
        <Sparkles size={15} strokeWidth={1.8} />
        Recommandation
      </div>
      <p className="font-semibold text-navy-900">
        {getLine(promo.productLineId).name} — {getChannel(promo.channelIds[0]).name}
      </p>
      <div className="mt-3 rounded-2xl bg-navy-50 p-4 text-sm text-navy-600">
        <p>Marge prévue : {promo.marginRate.toFixed(1)} %</p>
        <p>Objectif : 15 %</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-navy-600">Promo Pulse recommande de passer de -{promo.discountRate} % à -20 %. Marge estimée : 15,8 %.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/promotions/${promo.id}`}>
          <Button>Voir la promotion</Button>
        </Link>
        <Button variant="secondary">Comparer les scénarios</Button>
      </div>
    </Card>
  );
}

export function PromotionTable({ items, status }: { items: Promotion[]; status?: string }) {
  const router = useRouter();
  const [localItems, setLocalItems] = useState<Promotion[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLocalItems(JSON.parse(window.localStorage.getItem('promo-pulse-promotions') || '[]')), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const allItems = Array.from(new Map([...items, ...localItems].map((promotion) => [promotion.id, promotion])).values());
  const displayedItems = status && status !== 'Toutes'
    ? allItems.filter((promotion) => promotion.operationalStatus === status.replace(/s$/, ''))
    : allItems;

  return (
    <div className="promotion-table-wrap overflow-x-auto rounded-2xl border border-navy-100 bg-white">
      <table className="w-full min-w-[860px] table-fixed text-left text-sm">
        <colgroup><col className="w-[14%]" /><col className="w-[25%]" /><col className="w-[18%]" /><col className="w-[19%]" /><col className="w-[12%]" /><col className="w-[12%]" /></colgroup>
        <thead className="bg-navy-50 text-navy-500">
          <tr>{['Enseigne', 'Promotion', 'Produits', 'Période', 'Contrôle', 'Statut'].map((heading) => <th className="whitespace-nowrap p-4" key={heading}>{heading}</th>)}</tr>
        </thead>
        <tbody>
          {displayedItems.map((promotion) => (
            <tr className="group cursor-pointer border-t border-navy-100 transition hover:bg-navy-50/70 focus-within:bg-navy-50/70" key={promotion.id} onClick={() => router.push(`/promotions/${promotion.id}`)}>
              <td className="w-[14%] truncate p-4 font-semibold" title={getChannel(promotion.channelIds[0]).name}><Link className="block" href={`/promotions/${promotion.id}`}>{getChannel(promotion.channelIds[0]).name}</Link></td>
              <td className="w-[25%] p-4 font-semibold text-navy-900" title={promotion.name.replace(`${getChannel(promotion.channelIds[0]).name} — `, '')}><Link className="flex items-center justify-between gap-2" href={`/promotions/${promotion.id}`}><span className="truncate">{promotion.name.replace(`${getChannel(promotion.channelIds[0]).name} — `, '')}</span><ArrowRight aria-hidden="true" className="row-affordance shrink-0 text-mint-600" size={15} /></Link></td>
              <td className="w-[18%] truncate p-4" title={getLine(promotion.productLineId).name}>{getLine(promotion.productLineId).name}</td>
              <td className="w-[19%] whitespace-nowrap p-4">{shortDate(promotion.startDate)} → {shortDate(promotion.endDate)}</td>
              <td className="w-[12%] whitespace-nowrap p-4"><StatusBadge status={promotion.controlStatus} /></td>
              <td className="w-[12%] whitespace-nowrap p-4"><StatusBadge status={promotion.operationalStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
