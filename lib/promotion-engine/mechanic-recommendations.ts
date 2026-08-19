import { promotionMechanics, type MechanicId, type MechanicObjective } from './mechanics';
import type { ChannelType } from '@/types/promo';

export const mechanicObjectives: { id: MechanicObjective; label: string }[] = [
  {id:'revenue',label:"Maximiser le chiffre d’affaires"},{id:'volume',label:'Faire du volume'},{id:'acquisition',label:'Recruter de nouveaux acheteurs'},
  {id:'discovery',label:'Faire découvrir un produit'},{id:'loyalty',label:'Fidéliser'},{id:'marginProtection',label:'Protéger la marge'},{id:'visibility',label:'Créer une opération très visible'},
];
export type MechanicHistorySignal = { mechanicId: MechanicId; sampleSize: number; roi?: number; volumeLift?: number };
export type RecommendationContext = { objectives: MechanicObjective[]; channel?: ChannelType; category?: string; history?: MechanicHistorySignal[] };

/** V1 ranking based solely on documented heuristics. `history` is reserved for
 * future verified company results; no simulated performance data is generated. */
export function recommendMechanics({ objectives, channel }: RecommendationContext) {
  if (!objectives.length) return [];
  const preferredOrder = objectives.includes('volume') && objectives.includes('marginProtection')
    ? ['second-product','extra-quantity','promo-pack']
    : objectives.length === 1 ? objectiveGuidance[objectives[0]]?.preferred ?? [] : [];
  return promotionMechanics
    .filter((mechanic) => !channel || mechanic.applicableChannels.includes(channel))
    .map((mechanic) => { const preferredIndex = preferredOrder.indexOf(mechanic.id); return { mechanic, rank: objectives.reduce((sum, objective) => sum + mechanic.objectiveScores[objective], 0) / objectives.length + (preferredIndex < 0 ? 0 : 10-preferredIndex) }; })
    .sort((a,b) => b.rank-a.rank)
    .slice(0,3)
    .map(({mechanic}) => mechanic);
}

export const objectiveGuidance: Partial<Record<MechanicObjective, { message:string; watchout:string; preferred?:MechanicId[] }>> = {
  revenue:{message:"Les avantages immédiatement perceptibles peuvent favoriser le déclenchement d’achat et les ventes à court terme.",watchout:'Une remise plus profonde ne signifie pas automatiquement une meilleure rentabilité.',preferred:['immediate-discount','second-product','multi-buy']},
  volume:{message:"Ces mécaniques favorisent l’achat de plusieurs unités ou augmentent directement la quantité obtenue.",watchout:'Une partie du volume supplémentaire peut correspondre à du stockage ou à des achats anticipés.',preferred:['multi-buy','second-product','extra-quantity']},
  acquisition:{message:"Réduire le coût ou le risque perçu du premier achat peut faciliter l’essai et le changement de marque.",watchout:'La performance dépend du produit, du canal et de l’exécution.',preferred:['immediate-discount','coupon-refund','extra-quantity']},
  discovery:{message:"Une offre simple peut faciliter le premier essai sans imposer l’achat de plusieurs unités.",watchout:'Le multi-achat est moins naturel pour un produit encore inconnu.',preferred:['immediate-discount','coupon-refund','extra-quantity']},
  loyalty:{message:'Le cagnottage et les avantages différés peuvent soutenir le réachat.',watchout:'La fidélisation dépend fortement du dispositif enseigne et du comportement réel des clients.',preferred:['loyalty-credit','coupon-refund']},
  marginProtection:{message:'Le choix de la mécanique seul ne suffit pas : prix, PRI, volume, dépenses et redemption restent déterminants.',watchout:'La rentabilité réelle sera calculée à l’étape Économie à partir de vos données.',preferred:['extra-quantity','coupon-refund','second-product']},
  visibility:{message:'Les mécaniques très lisibles ou matérialisées peuvent renforcer la perception de l’opération.',watchout:'La visibilité dépend aussi de la mise en avant, du prospectus, de la PLV et du dispositif commercial.',preferred:['immediate-discount','multi-buy','promo-pack','extra-quantity']},
};
