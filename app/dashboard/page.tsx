import Link from 'next/link';
import { AlertTriangle, CalendarClock, LineChart, Lightbulb, TrendingUp, WalletCards } from 'lucide-react';
import { AiRecommendation, PromotionTimeline } from '@/components/promotion';
import { Button, Card, KpiCard } from '@/components/ui';
import { promotions, user } from '@/data/mock';
import { euro } from '@/lib/utils';

export default function Dashboard() {
  const actionPromotions = promotions.filter((promotion) => promotion.controlStatus === 'Problème');
  const optimizationPromotions = promotions.filter((promotion) => promotion.marginRate < 15);
  const upcomingPromotions = promotions.filter((promotion) => promotion.operationalStatus !== 'Terminée').slice(0, 5);
  const recommendations = optimizationPromotions.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col justify-between gap-5 rounded-[2rem] border border-navy-100 bg-white px-7 py-6 shadow-soft lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-600">Cockpit promotionnel</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-navy-900 md:text-4xl">Bonjour {user.firstName}</h1>
          <p className="mt-2 text-lg text-navy-500">Votre activité promotionnelle en un coup d’œil.</p>
        </div>
        <div className="rounded-2xl bg-navy-50 px-5 py-4 text-sm text-navy-600">
          <p className="font-semibold text-navy-900">Priorité du jour</p>
          <p className="mt-1">Traiter les promotions à risque avant les validations enseignes.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<AlertTriangle size={18} />} label="Actions requises" value={actionPromotions.length} tone="danger" caption="Promotions avec problème identifié" />
        <KpiCard icon={<TrendingUp size={18} />} label="À optimiser" value={optimizationPromotions.length} tone="warning" caption="Marge prévue sous objectif" />
        <KpiCard icon={<CalendarClock size={18} />} label="Cette semaine" value={4} tone="info" caption="Opérations à préparer ou vérifier" />
        <KpiCard icon={<Lightbulb size={18} />} label="Opportunités" value={3} tone="success" caption="Pistes détectées dans l’historique" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,.6fr)]">
        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-navy-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Prochaines promotions</h2>
              <p className="mt-1 text-sm text-navy-500">Les opérations à surveiller dans les prochaines semaines.</p>
            </div>
            <Link href="/calendar">
              <Button variant="secondary">Voir le calendrier</Button>
            </Link>
          </div>
          <div className="p-5">
            <PromotionTimeline items={upcomingPromotions} />
          </div>
        </Card>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Promo Pulse vous recommande</h2>
            <p className="mt-1 text-sm text-navy-500">Maximum trois recommandations, classées par impact.</p>
          </div>
          {recommendations.map((promotion) => (
            <AiRecommendation key={promotion.id} promo={promotion} />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Indicateurs clés</h2>
            <p className="mt-1 text-sm text-navy-500">Une lecture synthétique de la performance promotionnelle.</p>
          </div>
          <Button variant="ghost">Personnaliser les KPI</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard icon={<WalletCards size={18} />} label="CA promotionnel" value={euro(284000)} />
          <KpiCard icon={<LineChart size={18} />} label="Marge promotionnelle" value={euro(57200)} />
          <KpiCard icon={<TrendingUp size={18} />} label="ROI moyen" value="2,4x" caption="Rentabilité moyenne de l’investissement" />
          <KpiCard icon={<CalendarClock size={18} />} label="Nombre de promotions" value={promotions.length} />
        </div>
      </section>
    </div>
  );
}
