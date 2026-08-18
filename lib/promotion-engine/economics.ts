import type { ChannelType, ExpenseBase, ExpenseMode } from '@/types/promo';
import type { MechanicConfiguration, MechanicId } from './mechanics';
import { calculateEquivalentBenefit } from './mechanics';

export type PromotionEconomicsProduct = {
  id: string;
  regularPrice: number;
  unitCost: number;
  sellInPrice?: number;
  forecastVolume: number;
  promotionalUnitCost?: number;
};

export type EconomicsExpense={label:string;amount:number;mode:ExpenseMode;base?:ExpenseBase};
export type PromotionFunding={mode:'global'|'perUnit'|'percentOfConsumerSaving';value:number};

export type PromotionEconomicsInput = {
  mechanic: { id: MechanicId | ''; configuration: MechanicConfiguration };
  regularPrice: number;
  promotionalPrice: number;
  unitCost: number;
  promotionalUnitCost?: number;
  forecastVolume: number;
  expenses: number;
  expenseLines?: EconomicsExpense[];
  sellInPrice?: number;
  supplierFunding?: PromotionFunding;
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
  consumerSales: number;
  supplierGrossRevenue: number;
  supplierFundingCost: number;
  operationExpenses: number;
  contribution: number;
  contributionRate: number;
  billedVolume: number;
  productCost: number;
  totalExpenses: number;
  grossMarginBeforeExpenses: number;
  grossMargin: number;
  marginRate: number;
  promotionalROI: number;
  forecastVolume: number;
  inputVolume: number;
  paidVolume: number;
  freeVolume: number;
  transactionCount: number;
  remainderUnits: number;
  averageSellingPrice: number;
  marginGapToTarget: number;
  priceBreakdown: MechanicPriceBreakdown;
};

/**
 * Conventions V1 centralisées :
 * - consumerSales décrit les ventes au consommateur selon la mécanique ;
 * - supplierGrossRevenue = unités facturées × prix de vente enseigne ;
 * - productCost = unités physiques × coût de revient ;
 * - contribution = CA fournisseur − coût produits − financement − dépenses ;
 * - contributionRate = contribution / CA fournisseur.
 * Les unités physiques sont facturées par défaut. Un financement fournisseur est
 * toujours explicite et n'est jamais déduit de l'avantage consommateur.
 */
export function calculatePromotionEconomics(input: PromotionEconomicsInput): PromotionEconomicsResult {
  const rows=input.products?.filter(product=>product.forecastVolume>0);
  if(rows?.length){
    const rowResults=rows.map(product=>calculateSingle({...input,products:undefined,expenses:0,expenseLines:[],regularPrice:product.regularPrice,unitCost:product.unitCost,sellInPrice:product.sellInPrice??input.sellInPrice,promotionalUnitCost:product.promotionalUnitCost,forecastVolume:product.forecastVolume,supplierFunding:undefined}));
    const physical=rowResults.reduce((sum,row)=>sum+row.forecastVolume,0),billed=rowResults.reduce((sum,row)=>sum+row.billedVolume,0),consumer=rowResults.reduce((sum,row)=>sum+row.consumerSales,0),supplier=rowResults.reduce((sum,row)=>sum+row.supplierGrossRevenue,0),cost=rowResults.reduce((sum,row)=>sum+row.productCost,0);
    return finalize(input,consumer,supplier,cost,physical,billed,rowResults[0]?.priceBreakdown??getMechanicPriceBreakdown(input));
  }
  return calculateSingle(input);
}

function calculateSingle(input:PromotionEconomicsInput):PromotionEconomicsResult{
  const regular=Math.max(0,input.regularPrice),volume=Math.max(0,Math.floor(input.forecastVolume)),config=input.mechanic.configuration;
  let consumer=0,physical=volume,paid=volume,free=0,transactions=volume,remainder=0;
  if(input.mechanic.id==='second-product'){transactions=Math.floor(volume/2);remainder=volume%2;consumer=transactions*regular*(2-config.value/100)+remainder*regular;}
  else if(input.mechanic.id==='multi-buy'){const bought=Math.max(1,Math.floor(config.boughtQuantity)),offered=Math.max(0,Math.floor(config.freeQuantity)),size=bought+offered;transactions=Math.floor(volume/size);remainder=volume%size;free=transactions*offered;paid=volume-free;consumer=paid*regular;}
  else if(input.mechanic.id==='promo-pack'){const units=Math.max(1,Math.floor(config.packUnits+config.packExtraQuantity));transactions=volume;physical=volume*units;paid=physical;consumer=volume*Math.max(0,config.packPrice);}
  else consumer=getMechanicPriceBreakdown(input).averageSellingPrice*volume;
  const breakdown=getMechanicPriceBreakdown(input),applied=input.mechanic.id==='extra-quantity'&&input.promotionalUnitCost!=null?input.promotionalUnitCost:input.unitCost;
  // V1 convention: physical units delivered to the retailer are billed. Any supplier
  // support is represented explicitly as funding, never inferred from the consumer offer.
  const billed=physical,supplier=billed*Math.max(0,input.sellInPrice??breakdown.averageSellingPrice);
  return finalize(input,consumer,supplier,Math.max(0,applied)*physical,physical,billed,breakdown,volume,paid,free,transactions,remainder);
}

export function calculateExpenseTotal(lines:EconomicsExpense[],volumes:{physicalUnits:number;billedUnits:number;packs:number;orders:number}){
 return lines.reduce((sum,line)=>sum+(line.mode==='global'?Math.max(0,line.amount):Math.max(0,line.amount)*Math.max(0,volumes[line.base??'physicalUnits'])),0);
}
function fundingTotal(funding:PromotionFunding|undefined,physical:number,consumerSaving:number){if(!funding)return 0;if(funding.mode==='global')return Math.max(0,funding.value);if(funding.mode==='perUnit')return Math.max(0,funding.value)*physical;return Math.max(0,funding.value)/100*Math.max(0,consumerSaving);}
function finalize(input:PromotionEconomicsInput,consumerSales:number,supplierGrossRevenue:number,productCost:number,forecastVolume:number,billedVolume:number,priceBreakdown:MechanicPriceBreakdown,inputVolume=forecastVolume,paidVolume=forecastVolume,freeVolume=0,transactionCount=forecastVolume,remainderUnits=0):PromotionEconomicsResult{
 const operationExpenses=input.expenseLines?calculateExpenseTotal(input.expenseLines,{physicalUnits:forecastVolume,billedUnits:billedVolume,packs:input.mechanic.id==='promo-pack'?inputVolume:0,orders:transactionCount}):Math.max(0,input.expenses);
 const saving=Math.max(0,input.regularPrice*forecastVolume-consumerSales),supplierFundingCost=fundingTotal(input.supplierFunding,forecastVolume,saving),contribution=supplierGrossRevenue-productCost-supplierFundingCost-operationExpenses,rate=supplierGrossRevenue>0?contribution/supplierGrossRevenue*100:0;
 return {effectiveDiscount:priceBreakdown.effectiveDiscount,promotionalRevenue:consumerSales,consumerSales,supplierGrossRevenue,supplierFundingCost,operationExpenses,contribution,contributionRate:rate,billedVolume,productCost,totalExpenses:operationExpenses+supplierFundingCost,grossMarginBeforeExpenses:supplierGrossRevenue-productCost,grossMargin:contribution,marginRate:rate,promotionalROI:0,forecastVolume,inputVolume,paidVolume,freeVolume,transactionCount,remainderUnits,averageSellingPrice:forecastVolume>0?consumerSales/forecastVolume:0,marginGapToTarget:rate-input.marginTarget,priceBreakdown};
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
