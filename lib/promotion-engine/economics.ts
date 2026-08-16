import type { ChannelType } from '@/types/promo';
import type { MechanicConfiguration, MechanicId } from './mechanics';
import { calculateEquivalentBenefit } from './mechanics';

export type PromotionEconomicsProduct = {
  id: string;
  regularPrice: number;
  unitCost: number;
  forecastVolume: number;
  promotionalUnitCost?: number;
};

export type PromotionEconomicsInput = {
  mechanic: { id: MechanicId | ''; configuration: MechanicConfiguration };
  regularPrice: number;
  promotionalPrice: number;
  unitCost: number;
  promotionalUnitCost?: number;
  forecastVolume: number;
  expenses: number;
  marginTarget: number;
  products?: PromotionEconomicsProduct[];
  channel?: ChannelType;
};

export type MechanicPriceBreakdown = {
  regularTransactionValue: number;
  paidTransactionValue: number;
  deliveredUnits: number;
  paidUnits: number;
  consumerSaving: number;
  effectiveDiscount: number;
  averageSellingPrice: number;
};

export type PromotionEconomicsResult = {
  effectiveDiscount: number;
  promotionalRevenue: number;
  productCost: number;
  totalExpenses: number;
  grossMarginBeforeExpenses: number;
  grossMargin: number;
  marginRate: number;
  promotionalROI: number;
  forecastVolume: number;
  averageSellingPrice: number;
  marginGapToTarget: number;
  priceBreakdown: MechanicPriceBreakdown;
};

/**
 * Prototype conventions requiring final domain validation:
 * - forecastVolume represents units/formats delivered to consumers, not baskets.
 * - revenue = average effective selling price × delivered forecast volume.
 * - product cost = actual unit/format cost × delivered forecast volume. Thus a
 *   2+1 offer includes the cost of all three units, including the offered unit.
 * - gross margin = revenue − product cost − directly attributable expenses.
 * - margin rate = gross margin / revenue.
 * - promotional ROI retains the existing prototype convention:
 *   gross margin after attributable expenses / attributable expenses.
 *   It is intentionally exposed in the UI because this convention is not yet
 *   a final, validated business definition.
 * - extra quantity keeps the facial price. Its actual promotional-format cost
 *   is used only when promotionalUnitCost is explicitly supplied.
 */
export function calculatePromotionEconomics(input: PromotionEconomicsInput): PromotionEconomicsResult {
  const rows = input.products?.filter((product) => product.forecastVolume > 0);
  if (rows?.length) {
    const rowResults = rows.map((product) => calculateSingle({ ...input, products: undefined, regularPrice: product.regularPrice, unitCost: product.unitCost, promotionalUnitCost: product.promotionalUnitCost, forecastVolume: product.forecastVolume }));
    const promotionalRevenue = rowResults.reduce((sum, result) => sum + result.promotionalRevenue, 0);
    const productCost = rowResults.reduce((sum, result) => sum + result.productCost, 0);
    const forecastVolume = rowResults.reduce((sum, result) => sum + result.forecastVolume, 0);
    return finalize(input, promotionalRevenue, productCost, forecastVolume, rowResults[0]?.priceBreakdown ?? getMechanicPriceBreakdown(input));
  }
  return calculateSingle(input);
}

function calculateSingle(input: PromotionEconomicsInput): PromotionEconomicsResult {
  const priceBreakdown = getMechanicPriceBreakdown(input);
  const promotionalRevenue = priceBreakdown.averageSellingPrice * Math.max(0, input.forecastVolume);
  const appliedUnitCost = input.mechanic.id === 'extra-quantity' && input.promotionalUnitCost != null ? input.promotionalUnitCost : input.unitCost;
  const productCost = Math.max(0, appliedUnitCost) * Math.max(0, input.forecastVolume);
  return finalize(input, promotionalRevenue, productCost, Math.max(0, input.forecastVolume), priceBreakdown);
}

function finalize(input: PromotionEconomicsInput, promotionalRevenue: number, productCost: number, forecastVolume: number, priceBreakdown: MechanicPriceBreakdown): PromotionEconomicsResult {
  const totalExpenses = Math.max(0, input.expenses);
  const grossMarginBeforeExpenses = promotionalRevenue - productCost;
  const grossMargin = grossMarginBeforeExpenses - totalExpenses;
  const marginRate = promotionalRevenue > 0 ? grossMargin / promotionalRevenue * 100 : 0;
  const promotionalROI = totalExpenses > 0 ? grossMargin / totalExpenses : 0;
  return { effectiveDiscount: priceBreakdown.effectiveDiscount, promotionalRevenue, productCost, totalExpenses, grossMarginBeforeExpenses, grossMargin, marginRate, promotionalROI, forecastVolume, averageSellingPrice: forecastVolume > 0 ? promotionalRevenue / forecastVolume : 0, marginGapToTarget: marginRate - input.marginTarget, priceBreakdown };
}

export function getMechanicPriceBreakdown(input: PromotionEconomicsInput): MechanicPriceBreakdown {
  const regular = Math.max(0, input.regularPrice);
  const config = input.mechanic.configuration;
  const effectiveDiscount = calculateEquivalentBenefit(input.mechanic.id, config);
  if (input.mechanic.id === 'second-product') return transaction(regular * 2, regular * (2 - config.value / 100), 2, 2);
  if (input.mechanic.id === 'multi-buy') {
    const delivered = Math.max(1, config.boughtQuantity + config.freeQuantity);
    return transaction(regular * delivered, regular * Math.max(0, config.boughtQuantity), delivered, Math.max(0, config.boughtQuantity));
  }
  if (input.mechanic.id === 'promo-pack') {
    const delivered = Math.max(1, config.packUnits + config.packExtraQuantity);
    return transaction(Math.max(0, config.packRegularPrice), Math.max(0, config.packPrice), delivered, delivered);
  }
  if (input.mechanic.id === 'extra-quantity') return transaction(regular, regular, 1, 1, effectiveDiscount);
  if (input.mechanic.id === 'immediate-discount') return transaction(regular, Math.max(0, input.promotionalPrice), 1, 1);
  if (input.mechanic.id === 'loyalty-credit' || (input.mechanic.id === 'coupon-refund' && config.couponUnit === '%')) return transaction(regular, regular * (1 - config.value / 100), 1, 1);
  if (input.mechanic.id === 'coupon-refund' && config.couponUnit === '€') return transaction(regular, Math.max(0, regular - config.value), 1, 1);
  return transaction(regular, Math.max(0, input.promotionalPrice), 1, 1);
}

function transaction(regularTransactionValue: number, paidTransactionValue: number, deliveredUnits: number, paidUnits: number, explicitBenefit?: number): MechanicPriceBreakdown {
  const consumerSaving = Math.max(0, regularTransactionValue - paidTransactionValue);
  const effectiveDiscount = explicitBenefit ?? (regularTransactionValue > 0 ? consumerSaving / regularTransactionValue * 100 : 0);
  return { regularTransactionValue, paidTransactionValue, deliveredUnits, paidUnits, consumerSaving, effectiveDiscount, averageSellingPrice: deliveredUnits > 0 ? paidTransactionValue / deliveredUnits : 0 };
}
