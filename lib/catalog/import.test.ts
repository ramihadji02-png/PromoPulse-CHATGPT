import assert from 'node:assert/strict';import test from 'node:test';
import {suggestMapping,validateEan} from './index';
test('recognises common catalogue headings',()=>{const map=suggestMapping(['Code-barres','PA','Prix vente']);assert.equal(map['Code-barres'],'ean');assert.equal(map.PA,'unitCost');assert.equal(map['Prix vente'],'usualPrice')});
test('validates EAN-13 check digit and allows empty values',()=>{assert.equal(validateEan('4006381333931'),true);assert.equal(validateEan('3760001000000'),false);assert.equal(validateEan(''),true)});
