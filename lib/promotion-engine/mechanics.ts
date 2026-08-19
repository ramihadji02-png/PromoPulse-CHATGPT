import type { ChannelType } from '@/types/promo';

export type MechanicId = 'immediate-discount' | 'second-product' | 'multi-buy' | 'promo-pack' | 'extra-quantity' | 'loyalty-credit' | 'coupon-refund';
export type MechanicObjective = 'revenue' | 'volume' | 'acquisition' | 'discovery' | 'loyalty' | 'marginProtection' | 'visibility';
export type ObjectiveScores = Record<MechanicObjective, number>;
export type MechanicConfiguration = {
  value: number;
  boughtQuantity: number;
  freeQuantity: number;
  packUnits: number;
  packRegularPrice: number;
  packPrice: number;
  packExtraQuantity: number;
  couponType: 'BRI / coupon immédiat' | 'Bon de réduction différé' | 'ODR / remboursement';
  couponUnit: '€' | '%';
};

export type PromotionMechanic = {
  id: MechanicId;
  name: string;
  family: string;
  description: string;
  subtitle?: string;
  presets: number[];
  applicableChannels: ChannelType[];
  objectiveScores: ObjectiveScores;
  strengths: string[];
  watchouts: string[];
  profile: Partial<Record<MechanicObjective | 'priceFace', number>>;
  regulatoryMetadata: { requiresCategory: boolean; supportsCombinedBenefits: boolean };
  customizationSchema: string[];
};

/**
 * V1 heuristic catalog. Scores are directional aids (1–5), not scientific
 * measurements or performance promises. Future company history can be supplied
 * separately and should outweigh these general heuristics once sufficiently robust.
 */
export const promotionMechanics: PromotionMechanic[] = [
  { id:'immediate-discount', name:'Remise immédiate', family:'Remise immédiate', description:'Réduction directement appliquée au prix du produit.', presets:[15,20,25,30,34], applicableChannels:['GMS','Marketplace','E-commerce'], objectiveScores:{revenue:5,volume:4,acquisition:5,discovery:5,loyalty:2,marginProtection:2,visibility:5}, strengths:["déclencher rapidement l’achat","favoriser l’essai","rendre l’offre immédiatement compréhensible"], watchouts:['impact direct sur la marge','profondeur et répétition de la remise'], profile:{revenue:5,volume:4,acquisition:5,loyalty:2,marginProtection:2}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['value'] },
  { id:'second-product', name:'2e produit à -X %', family:'2e produit à -X %', description:"L’avantage s’applique à la deuxième unité achetée.", presets:[20,25,30,50,68], applicableChannels:['GMS','Marketplace','E-commerce'], objectiveScores:{revenue:4,volume:5,acquisition:2,discovery:2,loyalty:2,marginProtection:3,visibility:4}, strengths:['augmenter les unités achetées par acte','développer le volume','augmenter le panier sur la référence'], watchouts:['achat de deux unités nécessaire','potentiel stockage consommateur'], profile:{revenue:4,volume:5,acquisition:2,loyalty:2,marginProtection:3}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['value'] },
  { id:'multi-buy', name:'Multi-achat', family:'Multi-achat', description:'Plusieurs unités achetées donnent droit à une ou plusieurs unités offertes.', presets:[2], applicableChannels:['GMS','Marketplace','E-commerce'], objectiveScores:{revenue:4,volume:5,acquisition:2,discovery:2,loyalty:2,marginProtection:2,visibility:5}, strengths:['générer du volume','augmenter fortement les unités par panier','créer une offre très visible'], watchouts:['achat de plusieurs unités nécessaire','stockage et achats anticipés'], profile:{revenue:4,volume:5,acquisition:2,loyalty:2,marginProtection:2}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['boughtQuantity','freeQuantity'] },
  { id:'promo-pack', name:'Pack promotionnel', family:'Pack promotionnel', subtitle:'Lot physique', description:'Plusieurs unités regroupées dans un conditionnement promotionnel spécifique.', presets:[], applicableChannels:['GMS','Marketplace','E-commerce'], objectiveScores:{revenue:4,volume:5,acquisition:2,discovery:2,loyalty:2,marginProtection:3,visibility:5}, strengths:['générer du volume','matérialiser fortement l’offre en rayon','créer un conditionnement identifiable'], watchouts:['coûts de conditionnement et logistique','fabrication spécifique'], profile:{revenue:4,volume:5,visibility:5,acquisition:2,marginProtection:3}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['packUnits','packRegularPrice','packPrice','packExtraQuantity'] },
  { id:'extra-quantity', name:'Quantité offerte', family:'Quantité offerte', subtitle:'+X % offert', description:'Le contenu augmente sans hausse correspondante du prix.', presets:[10,20,25,33,50], applicableChannels:['GMS','Marketplace','E-commerce'], objectiveScores:{revenue:3,volume:5,acquisition:3,discovery:3,loyalty:2,marginProtection:4,visibility:5}, strengths:['augmenter le volume produit','préserver le prix facial','renforcer la perception de générosité'], watchouts:['conditionnement spécifique souvent nécessaire','impact industriel ou logistique'], profile:{revenue:3,volume:5,acquisition:3,priceFace:5,marginProtection:4}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['value'] },
  { id:'loyalty-credit', name:'Cagnottage', family:'Cagnottage', description:'Une partie du prix est créditée sur la carte de fidélité du client.', presets:[10,15,20,25,30,34], applicableChannels:['GMS'], objectiveScores:{revenue:3,volume:3,acquisition:2,discovery:2,loyalty:5,marginProtection:3,visibility:3}, strengths:['favoriser la fidélisation enseigne','soutenir le réachat','activer les porteurs de carte'], watchouts:['bénéfice moins immédiat','dépendance au programme de fidélité'], profile:{revenue:3,volume:3,acquisition:2,loyalty:5,marginProtection:3}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['value'] },
  { id:'coupon-refund', name:'Coupon / remboursement', family:'Coupon / BRI / ODR', description:'Un avantage immédiat, différé ou remboursé selon le dispositif.', presets:[], applicableChannels:['GMS','Marketplace','E-commerce'], objectiveScores:{revenue:3,volume:3,acquisition:4,discovery:4,loyalty:3,marginProtection:4,visibility:3}, strengths:['favoriser le recrutement et l’essai','activer une cible précise','maîtriser le coût selon la redemption'], watchouts:["friction d’utilisation",'taux de redemption variable'], profile:{revenue:3,volume:3,acquisition:4,loyalty:3,marginProtection:4}, regulatoryMetadata:{requiresCategory:true,supportsCombinedBenefits:true}, customizationSchema:['couponType','couponUnit','value'] },
];

export const defaultMechanicConfiguration: MechanicConfiguration = { value:20, boughtQuantity:2, freeQuantity:1, packUnits:3, packRegularPrice:30, packPrice:24, packExtraQuantity:0, couponType:'BRI / coupon immédiat', couponUnit:'€' };

export function getMechanic(id: string) { return promotionMechanics.find((mechanic) => mechanic.id === id); }
export function secondProductPriceBreakdown(regularPrice:number,discountPercent:number){const firstItemPrice=Math.max(0,regularPrice),rate=Math.max(0,discountPercent)/100,secondItemPrice=firstItemPrice*(1-rate),pairTotal=firstItemPrice+secondItemPrice,averageUnitPrice=pairTotal/2,averageDiscountRate=firstItemPrice>0?(1-averageUnitPrice/firstItemPrice)*100:0;return{firstItemPrice,secondItemPrice,pairTotal,averageUnitPrice,averageDiscountRate};}
export function equivalentSecondProductDiscount(discount: number) { return secondProductPriceBreakdown(1,discount).averageDiscountRate; }
export function equivalentMultiBuyBenefit(bought: number, free: number) { const total = Math.max(0,bought) + Math.max(0,free); return total > 0 ? Math.max(0,free) / total * 100 : 0; }
export function calculatePackBenefit(regularTotal: number, packPrice: number) { return regularTotal > 0 ? Math.max(0, regularTotal - packPrice) / regularTotal * 100 : 0; }
export function calculateEquivalentBenefit(id: MechanicId | '', config: MechanicConfiguration) {
  if (id === 'second-product') return equivalentSecondProductDiscount(config.value);
  if (id === 'multi-buy') return equivalentMultiBuyBenefit(config.boughtQuantity, config.freeQuantity);
  if (id === 'promo-pack') return calculatePackBenefit(config.packRegularPrice, config.packPrice);
  if (id === 'immediate-discount' || id === 'extra-quantity' || id === 'loyalty-credit') return Math.max(0, config.value);
  return config.couponUnit === '%' ? Math.max(0, config.value) : 0;
}
