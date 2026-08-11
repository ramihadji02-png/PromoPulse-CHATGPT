import Link from 'next/link';
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

export function PromotionTable({ items }: { items: Promotion[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-navy-50 text-navy-500">
          <tr>{['Promotion', 'Produits', 'Canal', 'Période', 'Mécanique', 'Marge', 'ROI', 'Contrôle', 'Statut'].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((promotion) => (
            <tr className="border-t border-navy-100" key={promotion.id}>
              <td className="p-3 font-semibold"><Link href={`/promotions/${promotion.id}`}>{promotion.name}</Link></td>
              <td className="p-3">{getLine(promotion.productLineId).name}</td>
              <td className="p-3">{getChannel(promotion.channelIds[0]).name}</td>
              <td className="p-3">{shortDate(promotion.startDate)} → {shortDate(promotion.endDate)}</td>
              <td className="p-3">{promotion.mechanic}</td>
              <td className="p-3">{promotion.marginRate}%</td>
              <td className="p-3">{promotion.roi}x</td>
              <td className="p-3"><StatusBadge status={promotion.controlStatus} /></td>
              <td className="p-3"><StatusBadge status={promotion.operationalStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
