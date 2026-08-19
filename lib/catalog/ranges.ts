import type {Product,ProductLine} from '@/types/promo';import {referencesOf} from './index';
export type CommercialRange=ProductLine;
export function migrateLegacyRanges(products:Product[],legacy:ProductLine[],stored:ProductLine[]=[]):CommercialRange[]{
 const byId=new Map([...legacy,...stored].map(range=>[range.id,{...range,referenceIds:[...(range.referenceIds??[])]}]));
 products.forEach(product=>{const range=byId.get(product.lineId);if(!range)return;const ids=referencesOf(product).map(ref=>ref.id);range.referenceIds=Array.from(new Set([...(range.referenceIds??[]),...ids]));});return [...byId.values()];
}
export function referencesInRange(range:CommercialRange,products:Product[]){const wanted=new Set(range.referenceIds??[]);return products.flatMap(product=>referencesOf(product).filter(reference=>wanted.has(reference.id)).map(reference=>({product,reference})));}
export function setRangeMembership(range:CommercialRange,referenceIds:string[]):CommercialRange{return{...range,referenceIds:Array.from(new Set(referenceIds))};}
export function snapshotRange(range:CommercialRange){return[...(range.referenceIds??[])];}
