import type {Product,ProductReference} from '@/types/promo';

export const PRODUCT_STORAGE_KEY='promo-pulse-products';
export const LINE_STORAGE_KEY='promo-pulse-product-lines';
export const CHANNEL_SETTINGS_KEY='promo-pulse-channel-settings';
export const COMPANY_MARGIN_TARGET=15;

export function referencesOf(product:Product):ProductReference[]{
 if(product.references?.length)return product.references;
 return [{id:`${product.id}-ref`,label:product.ean.packaging||product.name,ean:product.ean.code||undefined,packaging:product.ean.packaging,usualPrice:product.usualPrice,recommendedPrice:product.recommendedPrice,unitCost:product.pri,minimumMarginRate:product.minMarginRate,status:product.status??'Actif',channelIds:product.channelIds??[]}];
}
// Migration explicite : l'ancien `pri` reste le coût fournisseur et `usualPrice`
// reste le prix consommateur habituel. Aucun prix de vente enseigne n'est inventé.
export function normalizeProduct(product:Product):Product{return {...product,status:product.status??'Actif',references:referencesOf(product)};}
export function validateEan(value:string){
 const digits=value.replace(/\s/g,'');if(!digits)return true;if(!/^\d{8}$|^\d{13}$/.test(digits))return false;
 const body=digits.slice(0,-1).split('').map(Number).reverse();const sum=body.reduce((total,digit,index)=>total+digit*(index%2===0?3:1),0);return (10-sum%10)%10===Number(digits.at(-1));
}
export const importFields=[
 ['line','Gamme'],['name','Nom du produit'],['reference','Libellé référence'],['ean','EAN'],['category','Catégorie'],['packaging','Conditionnement'],['quantity','Poids / volume'],['unit','Unité'],['usualPrice','Prix habituel'],['recommendedPrice','Prix conseillé'],['unitCost','PRI / coût de revient'],['vatRate','TVA'],['minimumPrice','Prix minimum acceptable'],['minimumMarginRate','Marge minimum acceptable'],['logisticsCost','Coût logistique'],
] as const;
export type ImportField=typeof importFields[number][0];
const aliases:Record<string,ImportField>={gamme:'line','nom du produit':'name',produit:'name','libellé référence':'reference',reference:'reference','référence':'reference',ean:'ean','code ean':'ean','code-barres':'ean','code barre':'ean',barcode:'ean','catégorie':'category',categorie:'category',conditionnement:'packaging','poids / volume':'quantity',volume:'quantity',unité:'unit',unite:'unit','prix habituel':'usualPrice',prix:'usualPrice','prix vente':'usualPrice',pv:'usualPrice','prix conseillé':'recommendedPrice',pri:'unitCost',pa:'unitCost','prix achat':'unitCost','coût':'unitCost',cost:'unitCost',tva:'vatRate','prix minimum acceptable':'minimumPrice','marge minimum acceptable':'minimumMarginRate','coût logistique':'logisticsCost'};
export function suggestMapping(headers:string[]){return Object.fromEntries(headers.map((header)=>[header,aliases[header.trim().toLowerCase()]??''])) as Record<string,ImportField|''>;}
export function parseNumber(value:unknown){if(value==null||value==='')return undefined;const parsed=Number(String(value).replace(/\s/g,'').replace(',','.'));return Number.isFinite(parsed)?parsed:undefined;}
