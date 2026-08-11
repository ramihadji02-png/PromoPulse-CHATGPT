export type PromotionInputs = {
  usualPrice: number;
  promoPrice: number;
  costPrice: number;
  volume: number;
  expenses: number;
};

export type PromotionMetrics = {
  discountRate: number;
  revenue: number;
  grossMargin: number;
  marginAfterExpenses: number;
  marginRate: number;
  roi: number;
};

/**
 * Prototype economic definitions — to be validated with Promo Pulse domain experts.
 * Revenue = promo price × forecast volume.
 * Gross margin = (promo price − unit cost/PRI) × forecast volume.
 * Margin after expenses = gross margin − operation-specific expenses.
 * Margin rate = margin after expenses / revenue.
 * Promotional ROI = margin after expenses / operation-specific expenses.
 * When revenue or expenses are zero, their dependent ratio is reported as zero.
 */
export function calculatePromotion(inputs: PromotionInputs): PromotionMetrics {
  const revenue = inputs.promoPrice * inputs.volume;
  const grossMargin = (inputs.promoPrice - inputs.costPrice) * inputs.volume;
  const marginAfterExpenses = grossMargin - inputs.expenses;
  const discountRate = inputs.usualPrice > 0 ? ((inputs.usualPrice - inputs.promoPrice) / inputs.usualPrice) * 100 : 0;
  const marginRate = revenue > 0 ? (marginAfterExpenses / revenue) * 100 : 0;
  const roi = inputs.expenses > 0 ? marginAfterExpenses / inputs.expenses : 0;

  return { discountRate, revenue, grossMargin, marginAfterExpenses, marginRate, roi };
}

export function buildScenarios(inputs: PromotionInputs, minimumMarginRate: number) {
  const current = calculatePromotion(inputs);
  const targetRate = Math.min(95, Math.max(0, minimumMarginRate)) / 100;
  const priceForTarget = inputs.volume > 0 ? (inputs.costPrice + inputs.expenses / inputs.volume) / (1 - targetRate) : inputs.promoPrice;
  const recommendedPrice = Math.min(inputs.usualPrice, Math.max(inputs.promoPrice, priceForTarget));
  const recommended = calculatePromotion({ ...inputs, promoPrice: recommendedPrice });
  const conservativePrice = Math.min(inputs.usualPrice, Math.max(recommendedPrice, inputs.usualPrice * 0.9));
  const conservative = calculatePromotion({ ...inputs, promoPrice: conservativePrice });

  return [
    { name: 'Actuel', price: inputs.promoPrice, metrics: current, recommended: false },
    { name: 'Recommandé', price: recommendedPrice, metrics: recommended, recommended: current.marginRate < minimumMarginRate },
    { name: 'Alternative', price: conservativePrice, metrics: conservative, recommended: false },
  ];
}
