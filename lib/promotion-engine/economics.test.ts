import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePromotionEconomics } from './economics';
import { defaultMechanicConfiguration } from './mechanics';

const base={regularPrice:10,promotionalPrice:7.5,unitCost:5,forecastVolume:10000,expenses:2000,marginTarget:15,products:undefined};
const config={...defaultMechanicConfiguration};

test('immediate discount uses calculated promotional price',()=>{const r=calculatePromotionEconomics({...base,mechanic:{id:'immediate-discount',configuration:{...config,value:25}}});assert.equal(r.averageSellingPrice,7.5);assert.equal(r.promotionalRevenue,75000);assert.equal(r.productCost,50000);assert.equal(r.grossMargin,23000);});
test('second product discount uses average price across both units',()=>{const r=calculatePromotionEconomics({...base,mechanic:{id:'second-product',configuration:{...config,value:50}}});assert.equal(r.effectiveDiscount,25);assert.equal(r.priceBreakdown.paidTransactionValue,15);assert.equal(r.averageSellingPrice,7.5);});
test('2+1 includes all delivered units in product cost',()=>{const r=calculatePromotionEconomics({...base,mechanic:{id:'multi-buy',configuration:{...config,boughtQuantity:2,freeQuantity:1}}});assert.ok(Math.abs(r.effectiveDiscount-100/3)<0.001);assert.ok(Math.abs(r.averageSellingPrice-20/3)<0.001);assert.equal(r.productCost,50000);});
test('extra quantity preserves facial price and uses explicit format cost',()=>{const r=calculatePromotionEconomics({...base,regularPrice:4,promotionalPrice:4,unitCost:2,promotionalUnitCost:2.5,forecastVolume:100,expenses:0,mechanic:{id:'extra-quantity',configuration:{...config,value:25}}});assert.equal(r.averageSellingPrice,4);assert.equal(r.productCost,250);assert.equal(r.effectiveDiscount,25);});
test('pack uses pack value and price while costing delivered units',()=>{const r=calculatePromotionEconomics({...base,unitCost:3,forecastVolume:300,mechanic:{id:'promo-pack',configuration:{...config,packUnits:3,packExtraQuantity:0,packRegularPrice:15,packPrice:12}}});assert.equal(r.effectiveDiscount,20);assert.equal(r.averageSellingPrice,4);assert.equal(r.productCost,900);});
