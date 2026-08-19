import type {RetailerAsset,RetailerGroup,RetailerScope,RetailerScopeSelection} from '@/types/promo';
export const COMPANY_SCOPES_KEY='promo-pulse-company-scopes';
export const USER_FAVORITE_SCOPES_KEY='promo-pulse-favorite-scopes';
export const retailerAssets:Record<string,RetailerAsset>={
 carrefour:{id:'carrefour',localAssetPath:'/retailers/carrefour/logo.svg',officialSourceUrl:'https://www.carrefour.com/fr/groupe/points-de-vente',fallbackLabel:'C'},
 mousquetaires:{id:'mousquetaires',localAssetPath:'/retailers/mousquetaires/logo.svg',officialSourceUrl:'https://www.mousquetaires.com/nos-enseignes/',fallbackLabel:'IM'},
 u:{id:'u',localAssetPath:'/retailers/u/logo.svg',officialSourceUrl:'https://www.magasins-u.com/',fallbackLabel:'U'},
 leclerc:{id:'leclerc',localAssetPath:'/retailers/leclerc/logo.svg',officialSourceUrl:'https://www.e.leclerc/',fallbackLabel:'L'},
 auchan:{id:'auchan',localAssetPath:'/retailers/auchan/logo.svg',officialSourceUrl:'https://www.auchan-retail.com/',fallbackLabel:'A'},
 casino:{id:'casino',localAssetPath:'/retailers/casino/logo.svg',officialSourceUrl:'https://www.groupe-casino.fr/groupe/marques-et-activites/',fallbackLabel:'GC'},
 lidl:{id:'lidl',localAssetPath:'/retailers/lidl/logo.svg',officialSourceUrl:'https://corporate.lidl.fr/',fallbackLabel:'Li'},
 aldi:{id:'aldi',localAssetPath:'/retailers/aldi/logo.svg',officialSourceUrl:'https://www.aldi.fr/',fallbackLabel:'Al'},
 digital:{id:'digital',localAssetPath:'/retailers/digital/logo.svg',officialSourceUrl:'',fallbackLabel:'WEB'},
};
const child=(id:string,name:string,groupId:string,channelId:string,assetId:string,color:string,shortName=name):RetailerScope=>({id,name,shortName,groupId,channelId,assetId,calendarColor:color,selectable:true});
export const retailerGroups:RetailerGroup[]=[
 {id:'carrefour',name:'Groupe Carrefour',scopes:[child('carrefour-hyper','Carrefour Hypermarchés','carrefour','ch1','carrefour','#1B5AA6'),child('carrefour-market','Carrefour Market','carrefour','ch1','carrefour','#1B5AA6'),{...child('carrefour-proximity','Carrefour Proximité','carrefour','ch1','carrefour','#1B5AA6'),children:[child('carrefour-city','Carrefour City','carrefour','ch1','carrefour','#1B5AA6','City'),child('carrefour-contact','Carrefour Contact','carrefour','ch1','carrefour','#1B5AA6','Contact'),child('carrefour-express','Carrefour Express','carrefour','ch1','carrefour','#1B5AA6','Express'),child('proxi','Proxi','carrefour','ch1','carrefour','#1B5AA6','Proxi')]}]},
 {id:'mousquetaires',name:'Groupement Les Mousquetaires',scopes:[{...child('intermarche','Intermarché','mousquetaires','ch3','mousquetaires','#D71920'),children:[child('intermarche-hyper','Intermarché Hyper','mousquetaires','ch3','mousquetaires','#D71920','Hyper'),child('intermarche-super','Intermarché Super','mousquetaires','ch3','mousquetaires','#D71920','Super'),child('intermarche-contact','Intermarché Contact','mousquetaires','ch3','mousquetaires','#D71920','Contact'),child('intermarche-express','Intermarché Express','mousquetaires','ch3','mousquetaires','#D71920','Express')]},child('netto','Netto','mousquetaires','ch3','mousquetaires','#D71920')]},
 {id:'u',name:'Coopérative U',scopes:[{...child('cooperative-u','Coopérative U / Magasins U','u','ch8','u','#0B6BA8','Coopérative U'),children:[child('hyper-u','Hyper U','u','ch8','u','#0B6BA8','Hyper U'),child('super-u','Super U','u','ch8','u','#0B6BA8','Super U'),child('u-express','U Express','u','ch8','u','#0B6BA8','U Express'),child('utile','Utile','u','ch8','u','#0B6BA8','Utile')]}]},
 {id:'leclerc',name:'Mouvement E.Leclerc',scopes:[child('e-leclerc','E.Leclerc','leclerc','ch2','leclerc','#0874B9')]},
 {id:'auchan',name:'Auchan',scopes:[child('auchan','Auchan','auchan','ch7','auchan','#D91E2B')]},
 {id:'casino',name:'Groupe Casino',scopes:['Monoprix','Franprix','Naturalia','Casino','SPAR','Vival'].map((name,index)=>child(`casino-${name.toLowerCase()}`,name,'casino',index===0?'ch11':index===1?'ch12':`casino-${index}`,'casino','#6A244E'))},
 {id:'lidl',name:'Lidl',scopes:[child('lidl','Lidl','lidl','lidl','lidl','#0050AA')]},
 {id:'aldi',name:'ALDI',scopes:[child('aldi','ALDI','aldi','aldi','aldi','#00205B')]},
 {id:'digital',name:'Canaux e-commerce',scopes:[child('amazon','Amazon','digital','ch4','digital','#3B4450'),child('shopify','Shopify','digital','ch5','digital','#3B4450'),child('cdiscount','Cdiscount','digital','ch6','digital','#3B4450'),child('prestashop','PrestaShop','digital','ch9','digital','#3B4450'),child('manomano','ManoMano','digital','ch10','digital','#3B4450')]},
];
export const allRetailerScopes=retailerGroups.flatMap(group=>group.scopes);
export function getRetailerScope(id:string){return allRetailerScopes.find(scope=>scope.id===id)}
export function selectWholeScope(scope:RetailerScope):RetailerScopeSelection{return{scopeId:scope.id,childScopeIds:(scope.children??[]).map(item=>item.id)}}
export function selectionState(scope:RetailerScope,selection?:RetailerScopeSelection){if(!selection)return'none';const count=selection.childScopeIds.length,total=scope.children?.length??0;return total===0||count===total?'all':count===0?'none':'partial'}
export function selectionSummary(scope:RetailerScope,selection:RetailerScopeSelection){const children=scope.children??[];if(!children.length)return scope.name;if(selection.childScopeIds.length===children.length)return'Tous les formats inclus';const names=children.filter(child=>selection.childScopeIds.includes(child.id)).map(child=>child.shortName??child.name);return names.length<=2?names.join(' + '):`${names.length} formats sur ${children.length}`}
export function findScopes(query:string){const value=query.trim().toLowerCase();if(!value)return allRetailerScopes;return allRetailerScopes.filter(scope=>[scope.name,...(scope.children??[]).map(child=>child.name)].some(name=>name.toLowerCase().includes(value)))}
export function channelIdsForSelections(selections:RetailerScopeSelection[]){return Array.from(new Set(selections.map(item=>getRetailerScope(item.scopeId)?.channelId).filter((id):id is string=>Boolean(id))))}
export function resolveScopeSetting<T>(childValue:T|undefined,parentValue:T|undefined,companyValue:T){return childValue??parentValue??companyValue}

export function selectionsFromLegacyChannelIds(channelIds:string[]){return channelIds.map(channelId=>allRetailerScopes.find(scope=>scope.channelId===channelId)).filter((scope):scope is RetailerScope=>Boolean(scope)).map(selectWholeScope)}
export function orderScopesForWizard(scopes:RetailerScope[],favoriteIds:string[],companyIds:string[]){const favorites=scopes.filter(scope=>favoriteIds.includes(scope.id));const favoriteSet=new Set(favorites.map(scope=>scope.id));const company=scopes.filter(scope=>companyIds.includes(scope.id)&&!favoriteSet.has(scope.id));const occupied=new Set([...favoriteSet,...company.map(scope=>scope.id)]);return{favorites,company,other:scopes.filter(scope=>!occupied.has(scope.id))}}
