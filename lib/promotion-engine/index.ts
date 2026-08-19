import { calculatePromotionEconomics } from './economics';
import { defaultMechanicConfiguration } from './mechanics';

export type PromotionInputs = { usualPrice:number; promoPrice:number; costPrice:number; volume:number; expenses:number };
export type PromotionMetrics = { discountRate:number; revenue:number; grossMargin:number; marginAfterExpenses:number; marginRate:number; roi:number };

/** Backward-compatible adapter for existing prototype screens. New wizard work
 * should use calculatePromotionEconomics directly. */
export function calculatePromotion(inputs: PromotionInputs): PromotionMetrics {
  const result = calculatePromotionEconomics({ mechanic:{id:'',configuration:defaultMechanicConfiguration}, regularPrice:inputs.usualPrice, promotionalPrice:inputs.promoPrice, unitCost:inputs.costPrice, forecastVolume:inputs.volume, expenses:inputs.expenses, marginTarget:0 });
  return { discountRate:result.effectiveDiscount, revenue:result.promotionalRevenue, grossMargin:result.grossMarginBeforeExpenses, marginAfterExpenses:result.grossMargin, marginRate:result.marginRate, roi:result.promotionalROI };
}

export function buildScenarios(inputs: PromotionInputs, minimumMarginRate: number) {
  const current = calculatePromotion(inputs);
  const targetRate = Math.min(95, Math.max(0, minimumMarginRate)) / 100;
  const priceForTarget = inputs.volume > 0 ? (inputs.costPrice + inputs.expenses / inputs.volume) / (1 - targetRate) : inputs.promoPrice;
  const recommendedPrice = Math.min(inputs.usualPrice, Math.max(inputs.promoPrice, priceForTarget));
  const recommended = calculatePromotion({ ...inputs, promoPrice: recommendedPrice });
  const conservativePrice = Math.min(inputs.usualPrice, Math.max(recommendedPrice, inputs.usualPrice * 0.9));
  const conservative = calculatePromotion({ ...inputs, promoPrice: conservativePrice });
  return [{name:'Actuel',price:inputs.promoPrice,metrics:current,recommended:false},{name:'Recommandé',price:recommendedPrice,metrics:recommended,recommended:current.marginRate<minimumMarginRate},{name:'Alternative',price:conservativePrice,metrics:conservative,recommended:false}];
}

export { calculatePromotionEconomics, type PromotionEconomicsInput } from './economics';
