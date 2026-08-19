import assert from 'node:assert/strict';
import test from 'node:test';
import { assessMechanicCompliance } from '../compliance-engine';
import { calculatePromotionEconomics } from './economics';
import { defaultMechanicConfiguration, promotionMechanics, secondProductPriceBreakdown } from './mechanics';
import { projectionOrder } from './objectives';

test('2e produit à -50 % calcule le prix de la paire et l avantage moyen', () => {
  assert.deepEqual(secondProductPriceBreakdown(10, 50), {
    firstItemPrice: 10, secondItemPrice: 5, pairTotal: 15,
    averageUnitPrice: 7.5, averageDiscountRate: 25,
  });
});

test('2e produit à -68 % produit 3,20 euros puis 34 % d avantage moyen', () => {
  const result = secondProductPriceBreakdown(10, 68);
  assert.ok(Math.abs(result.secondItemPrice - 3.2) < 1e-10);
  assert.ok(Math.abs(result.pairTotal - 13.2) < 1e-10);
  assert.ok(Math.abs(result.averageUnitPrice - 6.6) < 1e-10);
  assert.ok(Math.abs(result.averageDiscountRate - 34) < 1e-10);
  assert.equal(assessMechanicCompliance({ mechanicId: 'second-product', equivalentBenefits: [result.averageDiscountRate] }).cumulativeBenefit, result.averageDiscountRate);
});

test('les presets attendus restent disponibles sans bloquer le choix', () => {
  const mechanic = promotionMechanics.find(item => item.id === 'second-product');
  assert.deepEqual(mechanic?.presets, [20, 25, 30, 50, 68]);
});

test('la priorité des KPI change selon l objectif sans changer de moteur', () => {
  assert.deepEqual(projectionOrder('volume'), ['volume', 'unitCost', 'revenue', 'contribution']);
  assert.deepEqual(projectionOrder('revenue'), ['revenue', 'volume', 'contribution', 'cost']);
  assert.deepEqual(projectionOrder('marginProtection'), ['contribution', 'rate', 'unitMargin', 'cost']);
});

test('global et unitaire se recalculent avec le volume et une donnée manquante reste incomplète', () => {
  const make = (forecastVolume: number, unitCost = 2) => calculatePromotionEconomics({
    mechanic: { id: 'immediate-discount', configuration: { ...defaultMechanicConfiguration, value: 20 } },
    regularPrice: 5, promotionalPrice: 4, unitCost, sellInPrice: 3,
    forecastVolume, expenses: 0, marginTarget: 15,
    expenseLines: [{ label: 'Marketing', mode: 'global', amount: 2000 }, { label: 'Autre', mode: 'perUnit', amount: .2, base: 'physicalUnits' }],
  });
  assert.equal(make(10000).operationExpenses, 4000);
  assert.equal(make(12000).operationExpenses, 4400);
  assert.equal(make(10000, 0).isComplete, false);
});
