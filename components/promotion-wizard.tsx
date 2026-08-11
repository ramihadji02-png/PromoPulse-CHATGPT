'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Info, Plus, X } from 'lucide-react';
import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import { channels, getChannel, getLine, productLines, products, promotions } from '@/data/mock';
import { runPrototypeCompliance } from '@/lib/compliance-engine';
import { buildScenarios, calculatePromotion } from '@/lib/promotion-engine';
import { cn, euro, shortDate } from '@/lib/utils';
import type { Product, Promotion, PromotionExpense } from '@/types/promo';

const steps = ['Produits', 'Canal', 'Période', 'Mécanique', 'Économie', 'Analyse', 'Validation'];
const expenseLabels = {
  GMS: ['Catalogue / prospectus', 'Trade marketing', 'PLV / ILV', 'Animation', 'Marketing', 'Autre'],
  ecommerce: ['Amazon Ads', 'Google Ads', 'Meta Ads', 'Influence', 'Affiliation', 'Autre'],
};
const draftKey = 'promo-pulse-draft';
const savedKey = 'promo-pulse-promotions';
const localProductsKey = 'promo-pulse-products';

type Draft = {
  selectedProducts: string[]; channelIds: string[]; startDate: string; endDate: string; mechanic: string;
  volumeMode: 'global' | 'reference'; globalVolume: number; referenceVolumes: Record<string, number>;
  usualPrice: number; promoPrice: number; costPrice: number; expenses: number; expenseDetails: Record<string, number>;
  minimumMarginRate: number; name: string;
};

const initialDraft: Draft = {
  selectedProducts: ['p1'], channelIds: ['ch1'], startDate: '2026-09-12', endDate: '2026-09-19', mechanic: 'Remise immédiate %',
  volumeMode: 'global', globalVolume: 10000, referenceVolumes: { p1: 10000 }, usualPrice: 10, promoPrice: 8, costPrice: 5,
  expenses: 2000, expenseDetails: {}, minimumMarginRate: 15, name: 'Gamme Zéro — Temps fort septembre',
};

function mechanicsFor(channelIds: string[]) {
  const selected = channelIds.map(getChannel);
  if (selected.some((channel) => channel.name === 'Shopify')) return ['Réduction %', 'Réduction €', 'Code promotionnel', 'Réduction automatique', 'X acheté = Y offert', 'Livraison offerte', 'Autre'];
  if (selected.some((channel) => channel.name === 'Amazon')) return ['Prix promotionnel', 'Coupon', 'Offre', 'Vente flash', 'Autre'];
  return ['Remise immédiate %', 'Remise immédiate €', 'Prix promotionnel', '2+1', '1 acheté = 1 offert', 'Cagnottage', 'Coupon', 'Lot', 'Autre'];
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-2 flex items-center gap-1 text-sm font-semibold text-navy-700">{label}{hint && <span title={hint}><Info size={14} className="text-navy-400" /></span>}</span>{children}</label>;
}
const inputClass = 'w-full rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-mint-500 focus:ring-2 focus:ring-mint-100';

export function PromotionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(draftKey);
    const timer = window.setTimeout(() => {
      if (stored) setDraft({ ...initialDraft, ...JSON.parse(stored) });
      setLocalProducts(JSON.parse(window.localStorage.getItem(localProductsKey) || '[]'));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, ready]);

  const catalog = [...products, ...localProducts];
  const selectedProducts = catalog.filter((product) => draft.selectedProducts.includes(product.id));
  const selectedLineId = selectedProducts[0]?.lineId ?? 'l1';
  const totalVolume = draft.volumeMode === 'global' ? draft.globalVolume : draft.selectedProducts.reduce((sum, id) => sum + (draft.referenceVolumes[id] || 0), 0);
  const detailedExpenses = Object.values(draft.expenseDetails).reduce((sum, amount) => sum + Number(amount || 0), 0);
  const expenses = showExpenses ? detailedExpenses : draft.expenses;
  const metrics = calculatePromotion({ usualPrice: draft.usualPrice, promoPrice: draft.promoPrice, costPrice: draft.costPrice, volume: totalVolume, expenses });
  const scenarios = buildScenarios({ usualPrice: draft.usualPrice, promoPrice: draft.promoPrice, costPrice: draft.costPrice, volume: totalVolume, expenses }, draft.minimumMarginRate);
  const compliance = runPrototypeCompliance(totalVolume);
  const overlaps = promotions.filter((promotion) => promotion.productLineId === selectedLineId && promotion.startDate <= draft.endDate && promotion.endDate >= draft.startDate).slice(0, 2);
  const duration = draft.startDate && draft.endDate ? Math.max(0, Math.floor((new Date(draft.endDate).getTime() - new Date(draft.startDate).getTime()) / 86400000) + 1) : 0;
  const options = mechanicsFor(draft.channelIds);
  const filteredProducts = catalog.filter((product) => `${product.name} ${product.ean.code} ${getLine(product.lineId).name}`.toLowerCase().includes(search.toLowerCase()));
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  function toggleProduct(id: string) { update('selectedProducts', draft.selectedProducts.includes(id) ? draft.selectedProducts.filter((item) => item !== id) : [...draft.selectedProducts, id]); }
  function toggleChannel(id: string) {
    const channelIds = draft.channelIds.includes(id) ? draft.channelIds.filter((item) => item !== id) : [...draft.channelIds, id];
    const nextMechanics = mechanicsFor(channelIds);
    setDraft((current) => ({ ...current, channelIds, mechanic: nextMechanics.includes(current.mechanic) ? current.mechanic : nextMechanics[0] }));
  }
  function createProduct() {
    if (!quickProductName.trim()) return;
    const suffix = localProducts.length + 1;
    const product: Product = { id: `local-product-${suffix}`, lineId: 'l1', name: quickProductName.trim(), ean: { code: `LOCAL${suffix}`, packaging: 'Unité' }, pri: 0, usualPrice: 0, recommendedPrice: 0, minMarginRate: 0 };
    const nextProducts = [...localProducts, product];
    setLocalProducts(nextProducts); window.localStorage.setItem(localProductsKey, JSON.stringify(nextProducts)); update('selectedProducts', [...draft.selectedProducts, product.id]); setQuickProductName(''); setShowProductModal(false);
  }
  function save(status: 'Brouillon' | 'Planifiée') {
    const saved = JSON.parse(window.localStorage.getItem(savedKey) || '[]') as Promotion[];
    const id = `local-${saved.length + 1}`;
    const detailExpenses: PromotionExpense[] = showExpenses
      ? Object.entries(draft.expenseDetails).filter(([, amount]) => amount > 0).map(([label, amount]) => ({ label, amount, type: getChannel(draft.channelIds[0])?.type === 'GMS' ? 'GMS' : 'E-commerce' }))
      : [{ label: 'Dépenses liées à l’opération', amount: expenses, type: getChannel(draft.channelIds[0])?.type === 'GMS' ? 'GMS' : 'E-commerce' }];
    const promotion: Promotion = {
      id, name: draft.name, productLineId: selectedLineId, products: draft.selectedProducts.map((productId) => ({ productId, forecastVolume: draft.volumeMode === 'global' ? Math.round(totalVolume / Math.max(1, draft.selectedProducts.length)) : draft.referenceVolumes[productId] || 0 })),
      channelIds: draft.channelIds, startDate: draft.startDate, endDate: draft.endDate, mechanic: draft.mechanic, discountRate: metrics.discountRate,
      usualPrice: draft.usualPrice, promoPrice: draft.promoPrice, costPrice: draft.costPrice, minimumMarginRate: draft.minimumMarginRate,
      forecastRevenue: metrics.revenue, forecastMargin: metrics.marginAfterExpenses, marginRate: metrics.marginRate, roi: metrics.roi, expenses: detailExpenses,
      operationalStatus: status, controlStatus: compliance.some((check) => check.status === 'Problème') ? 'Problème' : compliance.some((check) => check.status === 'Vigilance') ? 'Vigilance' : 'Non vérifié', owner: 'Camille', checks: compliance,
      scenarios: scenarios.map((scenario) => ({ name: scenario.name, discountRate: scenario.metrics.discountRate, marginRate: scenario.metrics.marginRate, roi: scenario.metrics.roi, recommendation: scenario.recommended ? 'Scénario déterministe recommandé pour se rapprocher de l’objectif saisi.' : '' })),
    };
    window.localStorage.setItem(savedKey, JSON.stringify([promotion, ...saved])); window.localStorage.removeItem(draftKey); router.push(`/promotions/${id}`);
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint-600">Création guidée</p><h1 className="mt-2 text-3xl font-black">Nouvelle promotion</h1><p className="mt-2 text-navy-500">Votre brouillon est sauvegardé automatiquement sur cet appareil.</p></div>
    <nav aria-label="Étapes de création" className="overflow-x-auto rounded-2xl border border-navy-100 bg-white p-3"><ol className="flex min-w-[760px] items-center">{steps.map((label, index) => <li className="flex flex-1 items-center" key={label}><button className={cn('flex items-center gap-2 text-left text-xs font-semibold', index === step ? 'text-navy-900' : index < step ? 'text-mint-600' : 'text-navy-400')} onClick={() => index <= step && setStep(index)} type="button"><span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', index === step ? 'border-navy-900 bg-navy-900 text-white' : index < step ? 'border-mint-500 bg-mint-50' : 'border-navy-100')}>{index < step ? <Check size={14} /> : index + 1}</span>{label}</button>{index < steps.length - 1 && <span className="mx-2 h-px flex-1 bg-navy-100" />}</li>)}</ol></nav>

    <Card className="min-h-[430px] p-6 md:p-8">
      {step === 0 && <section><h2 className="text-2xl font-bold">Que souhaitez-vous promouvoir ?</h2><p className="mt-2 text-navy-500">Sélectionnez une gamme, un ou plusieurs produits ou leurs références EAN.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input className={inputClass} placeholder="Rechercher un produit, une gamme ou un EAN" value={search} onChange={(event) => setSearch(event.target.value)} /><Button variant="secondary" onClick={() => setShowProductModal(true)}><Plus className="mr-2" size={16} />Créer un produit</Button></div><div className="mt-5 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{filteredProducts.map((product) => <button key={product.id} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left', draft.selectedProducts.includes(product.id) ? 'border-mint-500 bg-mint-50' : 'border-navy-100')} onClick={() => toggleProduct(product.id)} type="button"><span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', draft.selectedProducts.includes(product.id) && 'border-mint-500 bg-mint-500')} >{draft.selectedProducts.includes(product.id) && <Check size={13} />}</span><span className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><span className="block truncate text-xs text-navy-500">{getLine(product.lineId).name} · {product.ean.code}</span></span></button>)}</div><p className="mt-4 text-sm text-navy-500">La sélection est facultative. Vous pourrez également compléter votre catalogue plus tard.</p><div className="mt-6 border-t border-navy-100 pt-6"><h3 className="font-bold">Volume prévisionnel</h3><div className="mt-3 flex gap-2"><Button variant={draft.volumeMode === 'global' ? 'primary' : 'secondary'} onClick={() => update('volumeMode', 'global')}>Volume global</Button><Button variant={draft.volumeMode === 'reference' ? 'primary' : 'secondary'} onClick={() => update('volumeMode', 'reference')}>Par référence</Button></div>{draft.volumeMode === 'global' ? <Field label="Volume global"><input className={`${inputClass} mt-3 max-w-xs`} min="0" type="number" value={draft.globalVolume} onChange={(event) => update('globalVolume', Number(event.target.value))} /></Field> : <div className="mt-4 space-y-2">{selectedProducts.map((product) => <div className="grid grid-cols-[1fr_140px] items-center gap-3" key={product.id}><span className="truncate text-sm">{product.name}</span><input className={inputClass} min="0" type="number" value={draft.referenceVolumes[product.id] || 0} onChange={(event) => update('referenceVolumes', { ...draft.referenceVolumes, [product.id]: Number(event.target.value) })} /></div>)}<p className="pt-2 font-bold">Total : {totalVolume.toLocaleString('fr-FR')} unités</p></div>}</div></section>}
      {step === 1 && <section><h2 className="text-2xl font-bold">Où aura lieu cette promotion ?</h2><p className="mt-2 text-navy-500">Sélectionnez une ou plusieurs enseignes disponibles pour Maison Alba.</p>{(['GMS', 'E-commerce'] as const).map((group) => <div className="mt-6" key={group}><h3 className="text-sm font-bold uppercase tracking-wider text-navy-400">{group}</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{channels.filter((channel) => channel.selected && (group === 'GMS' ? channel.type === 'GMS' : channel.type !== 'GMS')).map((channel) => <button className={cn('flex items-center gap-3 rounded-2xl border p-4 text-left', draft.channelIds.includes(channel.id) ? 'border-mint-500 bg-mint-50' : 'border-navy-100')} key={channel.id} onClick={() => toggleChannel(channel.id)} type="button"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black shadow-sm">{channel.logo}</span><span><strong className="block">{channel.name === 'Leclerc' ? 'E.Leclerc' : channel.name}</strong><span className="text-xs text-navy-500">{channel.type}</span></span></button>)}</div></div>)}{draft.channelIds.length > 1 && <div className="mt-6 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><Info className="shrink-0" size={18} />Les prix, volumes ou mécaniques pourront différer selon l’enseigne. Le prototype utilise ici des paramètres communs.</div>}</section>}
      {step === 2 && <section><h2 className="text-2xl font-bold">Quand aura lieu la promotion ?</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Date de début"><input className={inputClass} type="date" value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} /></Field><Field label="Date de fin"><input className={inputClass} min={draft.startDate} type="date" value={draft.endDate} onChange={(event) => update('endDate', event.target.value)} /></Field></div><p className="mt-4 font-semibold">Durée : {duration} jour{duration > 1 ? 's' : ''}</p>{overlaps.length > 0 && <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-4"><div className="flex gap-3 text-orange-800"><AlertTriangle className="shrink-0" size={18} /><div><strong>À vérifier — chevauchement détecté</strong><p className="mt-1 text-sm">Une autre opération concernant cette gamme est prévue sur une partie de cette période. Ce chevauchement n’est pas qualifié de problème réglementaire.</p></div></div>{overlaps.map((promotion) => <a className="mt-3 block text-sm font-semibold text-orange-800 underline" href={`/promotions/${promotion.id}`} key={promotion.id}>{promotion.name} · {shortDate(promotion.startDate)} → {shortDate(promotion.endDate)}</a>)}</div>}</section>}
      {step === 3 && <section><h2 className="text-2xl font-bold">Quelle mécanique souhaitez-vous utiliser ?</h2><p className="mt-2 text-navy-500">Les choix sont adaptés au canal sélectionné.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{options.map((mechanic) => <button className={cn('rounded-2xl border p-4 text-left font-semibold', draft.mechanic === mechanic ? 'border-mint-500 bg-mint-50' : 'border-navy-100')} key={mechanic} onClick={() => update('mechanic', mechanic)} type="button">{mechanic}</button>)}</div></section>}
      {step === 4 && <section><h2 className="text-2xl font-bold">Économie de la promotion</h2><p className="mt-2 text-navy-500">Les résultats se recalculent immédiatement.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Prix habituel"><input className={inputClass} min="0" step="0.01" type="number" value={draft.usualPrice} onChange={(event) => update('usualPrice', Number(event.target.value))} /></Field><Field label="Prix promotionnel"><input className={inputClass} min="0" step="0.01" type="number" value={draft.promoPrice} onChange={(event) => update('promoPrice', Number(event.target.value))} /></Field><Field label="PRI / coût de revient" hint="Coût unitaire retenu pour estimer la marge brute."><input className={inputClass} min="0" step="0.01" type="number" value={draft.costPrice} onChange={(event) => update('costPrice', Number(event.target.value))} /></Field><Field label="Volume prévisionnel"><input className={inputClass} min="0" type="number" value={totalVolume} onChange={(event) => { update('volumeMode', 'global'); update('globalVolume', Number(event.target.value)); }} /></Field><Field label="Dépenses liées à l’opération"><input className={inputClass} disabled={showExpenses} min="0" type="number" value={expenses} onChange={(event) => update('expenses', Number(event.target.value))} /></Field><Field label="Objectif minimum de marge"><input className={inputClass} min="0" step="0.1" type="number" value={draft.minimumMarginRate} onChange={(event) => update('minimumMarginRate', Number(event.target.value))} /></Field></div><div className="mt-3 flex items-center justify-between"><p className="font-bold text-mint-700">Remise : -{metrics.discountRate.toFixed(1)} %</p><Button variant="ghost" onClick={() => setShowExpenses(!showExpenses)}>{showExpenses ? 'Masquer le détail' : '+ Détailler les dépenses'}</Button></div>{showExpenses && <div className="mt-4 grid gap-3 rounded-2xl bg-navy-50 p-4 sm:grid-cols-2">{(getChannel(draft.channelIds[0])?.type === 'GMS' ? expenseLabels.GMS : expenseLabels.ecommerce).map((label) => <Field label={label} key={label}><input className={inputClass} min="0" type="number" value={draft.expenseDetails[label] || 0} onChange={(event) => update('expenseDetails', { ...draft.expenseDetails, [label]: Number(event.target.value) })} /></Field>)}<p className="font-bold sm:col-span-2">Total détaillé : {euro(detailedExpenses)}</p></div>}<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['CA prévisionnel', euro(metrics.revenue)], ['Marge après dépenses', euro(metrics.marginAfterExpenses)], ['Taux de marge', `${metrics.marginRate.toFixed(1)} %`], ['ROI promotionnel', `${metrics.roi.toFixed(1)}×`]].map(([label, value]) => <div className="rounded-2xl border border-navy-100 p-4" key={label}><p className="text-xs font-semibold text-navy-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>)}</div></section>}
      {step === 5 && <section><h2 className="text-2xl font-bold">Analyse de votre promotion</h2><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['CA prévisionnel', euro(metrics.revenue)], ['Marge', `${metrics.marginRate.toFixed(1)} %`], ['ROI', `${metrics.roi.toFixed(1)}×`], ['Volume', totalVolume.toLocaleString('fr-FR')]].map(([label, value]) => <div className="rounded-2xl bg-navy-50 p-4" key={label}><p className="text-sm text-navy-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</div><div className="mt-7 grid gap-4 md:grid-cols-3"><Control title="Réglementation" status={compliance[0].status} text={compliance[0].explanation} /><Control title="Rentabilité" status={metrics.marginRate >= draft.minimumMarginRate ? 'Conforme' : 'Vigilance'} text={metrics.marginRate >= draft.minimumMarginRate ? 'L’objectif de marge saisi est atteint.' : `Marge ${metrics.marginRate.toFixed(1)} % sous l’objectif de ${draft.minimumMarginRate} %.`} /><Control title="Cohérence / opérationnel" status={overlaps.length ? 'Vigilance' : 'Conforme'} text={overlaps.length ? 'Un chevauchement doit être vérifié.' : 'Dates et données essentielles cohérentes.'} /></div>{metrics.marginRate < draft.minimumMarginRate && <div className="mt-6 rounded-2xl border border-mint-200 bg-mint-50 p-5"><Badge tone="success">Recommandation déterministe</Badge><div className="mt-4 grid gap-4 md:grid-cols-2"><div><p className="text-sm text-navy-500">Votre scénario</p><p className="mt-1 font-bold">Remise -{metrics.discountRate.toFixed(1)} % · Marge {metrics.marginRate.toFixed(1)} %</p></div><div><p className="text-sm text-navy-500">Alternative proposée</p><p className="mt-1 font-bold">Passer à -{scenarios[1].metrics.discountRate.toFixed(1)} % · Marge {scenarios[1].metrics.marginRate.toFixed(1)} % · ROI {scenarios[1].metrics.roi.toFixed(1)}×</p></div></div><Button className="mt-4" variant="secondary" onClick={() => setShowScenarios(!showScenarios)}>Comparer les scénarios</Button></div>}{showScenarios && <ScenarioTable scenarios={scenarios} />}</section>}
      {step === 6 && <section><h2 className="text-2xl font-bold">Récapitulatif de la promotion</h2><Field label="Nom de la promotion"><input className={`${inputClass} mt-5`} value={draft.name} onChange={(event) => update('name', event.target.value)} /></Field><dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">{[['Enseigne / canal', draft.channelIds.map((id) => getChannel(id).name).join(', ') || 'À compléter'], ['Produit / gamme', selectedProducts.map((product) => product.name).join(', ') || 'À compléter plus tard'], ['Période', `${shortDate(draft.startDate)} → ${shortDate(draft.endDate)}`], ['Mécanique', draft.mechanic], ['Volume', `${totalVolume.toLocaleString('fr-FR')} unités`], ['Prix', `${euro(draft.usualPrice)} → ${euro(draft.promoPrice)}`], ['Dépenses', euro(expenses)], ['CA prévisionnel', euro(metrics.revenue)], ['Marge', `${metrics.marginRate.toFixed(1)} %`], ['ROI', `${metrics.roi.toFixed(1)}×`]].map(([label, value]) => <div className="border-b border-navy-100 pb-3" key={label}><dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</dt><dd className="mt-1 truncate font-semibold" title={value}>{value}</dd></div>)}</dl><div className="mt-6 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><Info className="shrink-0" size={18} /><p>Le contrôle réglementaire est mocké et informatif. Il n’empêche pas l’enregistrement ou la planification.</p></div><div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => save('Brouillon')}>Enregistrer comme brouillon</Button><Button onClick={() => save('Planifiée')}>Planifier la promotion</Button></div></section>}
    </Card>
    <div className="flex items-center justify-between"><Button disabled={step === 0} variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))}><ChevronLeft className="mr-2" size={16} />Précédent</Button>{step < steps.length - 1 && <Button onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Continuer<ChevronRight className="ml-2" size={16} /></Button>}</div>

    {showProductModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/30 p-4" onClick={() => setShowProductModal(false)} role="presentation"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Créer un produit rapidement</h2><button aria-label="Fermer" onClick={() => setShowProductModal(false)} type="button"><X size={18} /></button></div><p className="mt-2 text-sm text-navy-500">Vous pourrez compléter ses informations dans le catalogue plus tard.</p><Field label="Nom du produit"><input autoFocus className={`${inputClass} mt-5`} value={quickProductName} onChange={(event) => setQuickProductName(event.target.value)} /></Field><Button className="mt-5 w-full" onClick={createProduct}>Créer et sélectionner</Button></div></div>}
  </div>;
}

function Control({ title, status, text }: { title: string; status: 'Non vérifié' | 'Conforme' | 'Vigilance' | 'Problème'; text: string }) {
  return <div className="rounded-2xl border border-navy-100 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-bold">{title}</h3><StatusBadge status={status} /></div><p className="mt-3 text-sm leading-6 text-navy-500">{text}</p></div>;
}
function ScenarioTable({ scenarios }: { scenarios: ReturnType<typeof buildScenarios> }) {
  return <div className="mt-5 overflow-x-auto rounded-2xl border border-navy-100"><table className="w-full min-w-[620px] text-sm"><thead><tr><th className="p-3 text-left" /><th className="p-3">Actuel</th><th className="bg-mint-50 p-3">Recommandé</th><th className="p-3">Alternative</th></tr></thead><tbody>{[['Remise', ...scenarios.map((item) => `-${item.metrics.discountRate.toFixed(1)} %`)], ['Prix promo', ...scenarios.map((item) => euro(item.price))], ['Marge', ...scenarios.map((item) => `${item.metrics.marginRate.toFixed(1)} %`)], ['ROI', ...scenarios.map((item) => `${item.metrics.roi.toFixed(1)}×`)]].map((row) => <tr className="border-t border-navy-100" key={row[0]}>{row.map((cell, index) => <td className={cn('p-3 text-center', index === 0 && 'text-left font-semibold', index === 2 && 'bg-mint-50')} key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
