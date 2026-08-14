'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Info, Plus, Save, X } from 'lucide-react';
import { Badge, Button, Card, PulseLoader, StatusBadge } from '@/components/ui';
import { channels, company, getChannel, getLine, productLines, products, promotions } from '@/data/mock';
import { runPrototypeCompliance } from '@/lib/compliance-engine';
import { buildScenarios, calculatePromotion } from '@/lib/promotion-engine';
import { cn, euro, shortDate } from '@/lib/utils';
import type { Product, Promotion, PromotionExpense } from '@/types/promo';

const steps = ['Produits', 'Canal', 'Période', 'Mécanique', 'Économie', 'Analyse', 'Validation'];
const draftKey = 'promo-pulse-draft';
const savedKey = 'promo-pulse-promotions';
const localProductsKey = 'promo-pulse-products';

const mechanics = {
  GMS: ['Remise immédiate %', 'Remise immédiate €', 'Prix promotionnel', '2+1', '1 acheté = 1 offert', '2e produit à -X %', 'Cagnottage', 'Coupon / BRI', 'Lot', 'Autre'],
  Amazon: ['Prix promotionnel', 'Coupon', 'Offre', 'Vente flash', 'Autre'],
  Shopify: ['Réduction %', 'Réduction €', 'Code promotionnel', 'Réduction automatique', 'X acheté = Y offert', 'Livraison offerte', 'Prix promotionnel', 'Autre'],
  PrestaShop: ['Règle panier', 'Règle catalogue', 'Réduction %', 'Réduction €', 'Autre'],
  ecommerce: ['Prix promotionnel', 'Coupon', 'Réduction %', 'Réduction €', 'Autre'],
};
const expensesByContext = {
  GMS: ['Catalogue / prospectus', 'PLV / ILV', 'Animation', 'Mise en avant', 'Trade marketing', 'Marketing', 'Autre'],
  ecommerce: ['Amazon Ads', 'Google Ads', 'Meta Ads', 'Influence', 'Affiliation', 'Création de contenu', 'Autre'],
};

type Draft = {
  selectedProducts: string[];
  selectedLineIds: string[];
  channelIds: string[];
  startDate: string;
  endDate: string;
  mechanic: string;
  mechanicValue: number;
  promoCode: string;
  volumeMode: 'global' | 'reference';
  globalVolume: number;
  referenceVolumes: Record<string, number>;
  usualPrice: number;
  promoPrice: number;
  costPrice: number;
  expenses: number;
  expenseDetails: Record<string, number>;
  minimumMarginRate: number;
  name: string;
};

const initialDraft: Draft = {
  selectedProducts: [], selectedLineIds: [], channelIds: [], startDate: '2026-09-12', endDate: '2026-09-19', mechanic: '', mechanicValue: 20, promoCode: '',
  volumeMode: 'global', globalVolume: 10000, referenceVolumes: {}, usualPrice: 10, promoPrice: 8, costPrice: 5, expenses: 2000, expenseDetails: {}, minimumMarginRate: 15, name: 'Temps fort septembre',
};

function channelMechanics(channelIds: string[]) {
  const selected = channelIds.map(getChannel).filter(Boolean);
  if (!selected.length) return [];
  if (selected.every((channel) => channel.type === 'GMS')) return mechanics.GMS;
  if (selected.some((channel) => channel.name === 'Shopify')) return mechanics.Shopify;
  if (selected.some((channel) => channel.name === 'Amazon')) return mechanics.Amazon;
  if (selected.some((channel) => channel.name === 'PrestaShop')) return mechanics.PrestaShop;
  return mechanics.ecommerce;
}

function needsPercent(mechanic: string) { return mechanic.includes('%') || mechanic.includes('-X'); }
function needsAmount(mechanic: string) { return mechanic.includes('€'); }
function needsPromoPrice(mechanic: string) { return mechanic === 'Prix promotionnel'; }
function needsCode(mechanic: string) { return mechanic.includes('Code promotionnel'); }

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy-700">{label}{hint && <span className="cursor-help text-navy-400" title={hint}><Info size={14} /></span>}</span>{children}</label>;
}
const inputClass = 'w-full rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-mint-500 focus:ring-2 focus:ring-mint-100';

function NumericField({ label, value, unit, step = 1, disabled, hint, onChange }: { label: string; value: number; unit: string; step?: number; disabled?: boolean; hint?: string; onChange: (value: number) => void }) {
  return <Field label={label} hint={hint}><div className={cn('flex items-center rounded-xl border border-navy-100 bg-white focus-within:border-mint-500 focus-within:ring-2 focus-within:ring-mint-100', disabled && 'bg-navy-50 opacity-70')}><input className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" disabled={disabled} inputMode="decimal" min="0" placeholder="0" step={step} type="number" value={Number.isFinite(value) ? value : ''} onFocus={(event) => { if (event.currentTarget.value === '0') event.currentTarget.select(); }} onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))} /><span className="border-l border-navy-100 px-3 text-xs font-semibold text-navy-400">{unit}</span></div></Field>;
}

export function PromotionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [ready, setReady] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [channelContext, setChannelContext] = useState<'GMS' | 'ecommerce'>(company.profile === 'ecommerce' ? 'ecommerce' : 'GMS');
  const [showProductModal, setShowProductModal] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(draftKey);
    const timer = window.setTimeout(() => {
      if (stored) setDraft({ ...initialDraft, ...JSON.parse(stored) });
      setLocalProducts(JSON.parse(window.localStorage.getItem(localProductsKey) || '[]'));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => { window.localStorage.setItem(draftKey, JSON.stringify(draft)); setSavedAt(new Date()); }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, ready]);

  const catalog = useMemo(() => [...products, ...localProducts], [localProducts]);
  const effectiveProductIds = useMemo(() => Array.from(new Set([...draft.selectedProducts, ...catalog.filter((product) => draft.selectedLineIds.includes(product.lineId)).map((product) => product.id)])), [catalog, draft.selectedLineIds, draft.selectedProducts]);
  const selectedProducts = catalog.filter((product) => effectiveProductIds.includes(product.id));
  const selectedLineId = selectedProducts[0]?.lineId ?? draft.selectedLineIds[0] ?? 'l1';
  const totalVolume = draft.volumeMode === 'global' ? draft.globalVolume : effectiveProductIds.reduce((sum, id) => sum + (draft.referenceVolumes[id] || 0), 0);
  const detailedExpenses = Object.values(draft.expenseDetails).reduce((sum, amount) => sum + Number(amount || 0), 0);
  const expenses = showExpenses ? detailedExpenses : draft.expenses;
  const derivedPromoPrice = (draft.mechanic.includes('%') && draft.mechanicValue >= 0) ? draft.usualPrice * (1 - draft.mechanicValue / 100) : draft.promoPrice;
  const promoPrice = needsPercent(draft.mechanic) ? derivedPromoPrice : draft.promoPrice;
  const metrics = calculatePromotion({ usualPrice: draft.usualPrice, promoPrice, costPrice: draft.costPrice, volume: totalVolume, expenses });
  const scenarios = buildScenarios({ usualPrice: draft.usualPrice, promoPrice, costPrice: draft.costPrice, volume: totalVolume, expenses }, draft.minimumMarginRate);
  const compliance = runPrototypeCompliance(totalVolume);
  const overlaps = promotions.filter((promotion) => promotion.productLineId === selectedLineId && promotion.startDate <= draft.endDate && promotion.endDate >= draft.startDate).slice(0, 2);
  const duration = draft.startDate && draft.endDate ? Math.max(0, Math.floor((new Date(draft.endDate).getTime() - new Date(draft.startDate).getTime()) / 86400000) + 1) : 0;
  const options = channelMechanics(draft.channelIds);
  const filteredProducts = catalog.filter((product) => `${product.name} ${product.ean.code} ${getLine(product.lineId).name}`.toLowerCase().includes(search.toLowerCase()));
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const selectedChannels = draft.channelIds.map(getChannel).filter(Boolean);
  const isGms = selectedChannels.some((channel) => channel.type === 'GMS');
  const canContinue = [totalVolume > 0 || !isGms, draft.channelIds.length > 0, Boolean(draft.startDate && draft.endDate && duration > 0), Boolean(draft.mechanic), metrics.revenue >= 0, true, true][step];

  function toggleProduct(id: string) { update('selectedProducts', draft.selectedProducts.includes(id) ? draft.selectedProducts.filter((item) => item !== id) : [...draft.selectedProducts, id]); }
  function toggleLine(id: string) { update('selectedLineIds', draft.selectedLineIds.includes(id) ? draft.selectedLineIds.filter((item) => item !== id) : [...draft.selectedLineIds, id]); }
  function toggleChannel(id: string) {
    const channelIds = draft.channelIds.includes(id) ? draft.channelIds.filter((item) => item !== id) : [...draft.channelIds, id];
    const nextOptions = channelMechanics(channelIds);
    setDraft((current) => ({ ...current, channelIds, mechanic: nextOptions.includes(current.mechanic) ? current.mechanic : (nextOptions[0] ?? '') }));
  }
  function createProduct() {
    if (!quickProductName.trim()) return;
    const suffix = Date.now();
    const product: Product = { id: `local-product-${suffix}`, lineId: draft.selectedLineIds[0] ?? 'l1', name: quickProductName.trim(), ean: { code: `LOCAL${String(suffix).slice(-7)}`, packaging: 'Unité' }, pri: 0, usualPrice: 0, recommendedPrice: 0, minMarginRate: 0 };
    const next = [...localProducts, product];
    setLocalProducts(next); window.localStorage.setItem(localProductsKey, JSON.stringify(next)); update('selectedProducts', [...draft.selectedProducts, product.id]); setQuickProductName(''); setShowProductModal(false);
  }
  function compareScenarios() {
    if (showScenarios) { setShowScenarios(false); return; }
    setIsComparing(true); window.setTimeout(() => { setIsComparing(false); setShowScenarios(true); }, 650);
  }
  function applyScenario(price: number) { update('promoPrice', Number(price.toFixed(2))); update('mechanic', 'Prix promotionnel'); setShowScenarios(true); }
  function save(status: 'Brouillon' | 'Planifiée') {
    const saved = JSON.parse(window.localStorage.getItem(savedKey) || '[]') as Promotion[];
    const id = `local-${Date.now()}`;
    const detailExpenses: PromotionExpense[] = showExpenses
      ? Object.entries(draft.expenseDetails).filter(([, amount]) => amount > 0).map(([label, amount]) => ({ label, amount, type: isGms ? 'GMS' : 'E-commerce' }))
      : [{ label: 'Dépenses liées à l’opération', amount: expenses, type: isGms ? 'GMS' : 'E-commerce' }];
    const controlStatus = compliance.some((check) => check.status === 'Problème') ? 'Problème' : compliance.some((check) => check.status === 'Vigilance') ? 'Vigilance' : 'Non vérifié';
    const promotion: Promotion = {
      id, name: draft.name || `${getLine(selectedLineId).name} — Promotion`, productLineId: selectedLineId,
      products: effectiveProductIds.map((productId) => ({ productId, forecastVolume: draft.volumeMode === 'global' ? Math.round(totalVolume / Math.max(1, effectiveProductIds.length)) : draft.referenceVolumes[productId] || 0 })),
      channelIds: draft.channelIds, startDate: draft.startDate, endDate: draft.endDate, mechanic: draft.mechanic, discountRate: metrics.discountRate, usualPrice: draft.usualPrice, promoPrice, costPrice: draft.costPrice, minimumMarginRate: draft.minimumMarginRate,
      forecastRevenue: metrics.revenue, forecastMargin: metrics.marginAfterExpenses, marginRate: metrics.marginRate, roi: metrics.roi, expenses: detailExpenses, operationalStatus: status, controlStatus, owner: 'Camille', checks: compliance,
      scenarios: scenarios.map((scenario) => ({ name: scenario.name, discountRate: scenario.metrics.discountRate, marginRate: scenario.metrics.marginRate, roi: scenario.metrics.roi, recommendation: scenario.recommended ? 'Scénario déterministe recommandé pour se rapprocher de l’objectif saisi.' : '' })),
    };
    window.localStorage.setItem(savedKey, JSON.stringify([promotion, ...saved])); window.localStorage.removeItem(draftKey); router.push(`/promotions/${id}`);
  }

  return <div className="promotion-wizard mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint-600">Création guidée</p><h1 className="mt-2 text-3xl font-black">Nouvelle promotion</h1></div><p className="flex items-center gap-2 text-sm font-semibold text-navy-500"><Save size={15} className="text-mint-600" />{savedAt ? 'Brouillon enregistré' : 'Préparation du brouillon…'}</p></header>
    <nav aria-label="Étapes de création" className="wizard-stepper overflow-x-auto border-y border-navy-100 py-4"><ol className="flex min-w-[760px] items-center">{steps.map((label, index) => <li className="flex flex-1 items-center" key={label}><button aria-current={index === step ? 'step' : undefined} className={cn('flex items-center gap-2 text-left text-xs font-semibold transition', index === step ? 'text-navy-900' : index < step ? 'text-mint-600' : 'text-navy-400')} disabled={index > step} onClick={() => setStep(index)} type="button"><span className={cn('flex h-7 w-7 items-center justify-center rounded-full border transition', index === step ? 'border-navy-900 bg-navy-900 text-white' : index < step ? 'border-mint-500 bg-mint-50' : 'border-navy-100')}>{index < step ? <Check size={14} /> : index + 1}</span>{label}</button>{index < steps.length - 1 && <span className="mx-2 h-px flex-1 bg-navy-100" />}</li>)}</ol></nav>

    <Card className="wizard-panel min-h-[460px] p-6 md:p-8">
      {step === 0 && <ProductsStep draft={draft} filteredProducts={filteredProducts} selectedProducts={selectedProducts} totalVolume={totalVolume} search={search} setSearch={setSearch} toggleProduct={toggleProduct} toggleLine={toggleLine} update={update} onCreate={() => setShowProductModal(true)} />}
      {step === 1 && <ChannelStep context={channelContext} draft={draft} setContext={(context) => { setChannelContext(context); update('channelIds', draft.channelIds.filter((id) => context === 'GMS' ? getChannel(id).type === 'GMS' : getChannel(id).type !== 'GMS')); }} toggleChannel={toggleChannel} />}
      {step === 2 && <PeriodStep draft={draft} duration={duration} overlaps={overlaps} update={update} />}
      {step === 3 && <MechanicStep draft={draft} options={options} update={update} />}
      {step === 4 && <EconomyStep draft={draft} expenses={expenses} detailedExpenses={detailedExpenses} expenseLabels={isGms ? expensesByContext.GMS : expensesByContext.ecommerce} metrics={metrics} promoPrice={promoPrice} showExpenses={showExpenses} totalVolume={totalVolume} setShowExpenses={setShowExpenses} update={update} />}
      {step === 5 && <AnalysisStep compliance={compliance} draft={draft} expenses={expenses} isComparing={isComparing} metrics={metrics} overlaps={overlaps} scenarios={scenarios} showScenarios={showScenarios} totalVolume={totalVolume} applyScenario={applyScenario} compareScenarios={compareScenarios} />}
      {step === 6 && <ValidationStep compliance={compliance} draft={draft} expenses={expenses} metrics={metrics} promoPrice={promoPrice} selectedProducts={selectedProducts} totalVolume={totalVolume} update={update} save={save} />}
    </Card>
    <footer className="flex items-center justify-between"><Button disabled={step === 0} variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))}><ChevronLeft className="mr-2" size={16} />Précédent</Button>{step < steps.length - 1 && <Button disabled={!canContinue} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Continuer<ChevronRight className="ml-2" size={16} /></Button>}</footer>

    {showProductModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/30 p-4" onClick={() => setShowProductModal(false)} role="presentation"><div aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Créer un produit rapidement</h2><button aria-label="Fermer" className="rounded-lg p-2 hover:bg-navy-50" onClick={() => setShowProductModal(false)} type="button"><X size={18} /></button></div><p className="mt-2 text-sm text-navy-500">Vous pourrez compléter son EAN, ses prix et son conditionnement dans le catalogue plus tard.</p><Field label="Nom du produit"><input autoFocus className={`${inputClass} mt-5`} value={quickProductName} onChange={(event) => setQuickProductName(event.target.value)} /></Field><Button className="mt-5 w-full" disabled={!quickProductName.trim()} onClick={createProduct}>Créer et sélectionner</Button></div></div>}
  </div>;
}

function ProductsStep({ draft, filteredProducts, selectedProducts, totalVolume, search, setSearch, toggleProduct, toggleLine, update, onCreate }: { draft: Draft; filteredProducts: Product[]; selectedProducts: Product[]; totalVolume: number; search: string; setSearch: (value: string) => void; toggleProduct: (id: string) => void; toggleLine: (id: string) => void; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void; onCreate: () => void }) {
  return <section><StepTitle title="Que souhaitez-vous promouvoir ?" text="Choisissez une gamme entière ou sélectionnez précisément vos références." /><div className="mt-6"><p className="text-xs font-bold uppercase tracking-wider text-navy-400">Gammes</p><div className="mt-3 flex flex-wrap gap-2">{productLines.map((line) => <button className={cn('rounded-xl border px-4 py-2 text-sm font-semibold transition', draft.selectedLineIds.includes(line.id) ? 'border-mint-500 bg-mint-50 text-navy-900' : 'border-navy-100 hover:border-navy-200')} key={line.id} onClick={() => toggleLine(line.id)} type="button">{line.name}</button>)}</div></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input aria-label="Recherche produit" className={inputClass} placeholder="Rechercher un produit, une gamme ou un EAN" value={search} onChange={(event) => setSearch(event.target.value)} /><Button variant="secondary" onClick={onCreate}><Plus className="mr-2" size={16} />Créer un produit</Button></div><div className="mt-4 grid max-h-60 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{filteredProducts.map((product) => <button aria-pressed={draft.selectedProducts.includes(product.id)} className={cn('selection-tile flex items-center gap-3 rounded-xl border p-3 text-left transition', draft.selectedProducts.includes(product.id) ? 'border-mint-500 bg-mint-50' : 'border-navy-100 hover:border-navy-200 hover:bg-navy-50')} key={product.id} onClick={() => toggleProduct(product.id)} type="button"><span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', draft.selectedProducts.includes(product.id) && 'border-mint-500 bg-mint-500 text-navy-900')}>{draft.selectedProducts.includes(product.id) && <Check size={13} />}</span><span className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><span className="block truncate text-xs text-navy-500">{getLine(product.lineId).name} · {product.ean.code} · {product.ean.packaging}</span></span></button>)}</div><p className="mt-3 text-sm text-navy-500">Vous pourrez également compléter votre catalogue plus tard.</p><div className="mt-7 border-t border-navy-100 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Volume prévisionnel</h3><div className="flex gap-2"><Button variant={draft.volumeMode === 'global' ? 'primary' : 'secondary'} onClick={() => update('volumeMode', 'global')}>Global</Button><Button disabled={!selectedProducts.length} variant={draft.volumeMode === 'reference' ? 'primary' : 'secondary'} onClick={() => update('volumeMode', 'reference')}>Par référence</Button></div></div>{draft.volumeMode === 'global' ? <div className="mt-4 max-w-sm"><NumericField label="Volume prévisionnel" unit="unités" value={draft.globalVolume} onChange={(value) => update('globalVolume', value)} /></div> : <div className="mt-4 space-y-2">{selectedProducts.map((product) => <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-3" key={product.id}><span className="truncate text-sm">{product.name}</span><NumericField label="" unit="unités" value={draft.referenceVolumes[product.id] || 0} onChange={(value) => update('referenceVolumes', { ...draft.referenceVolumes, [product.id]: value })} /></div>)}<p className="border-t border-navy-100 pt-3 text-right font-bold tabular-nums">Total : {totalVolume.toLocaleString('fr-FR')} unités</p></div>}</div></section>;
}

function ChannelStep({ context, draft, setContext, toggleChannel }: { context: 'GMS' | 'ecommerce'; draft: Draft; setContext: (context: 'GMS' | 'ecommerce') => void; toggleChannel: (id: string) => void }) {
  const visible = channels.filter((channel) => channel.selected && (context === 'GMS' ? channel.type === 'GMS' : channel.type !== 'GMS'));
  return <section><StepTitle title="Où aura lieu cette promotion ?" text="Sélectionnez une ou plusieurs enseignes disponibles pour Maison Alba." />{company.profile === 'mixed' && <div className="mt-6 inline-flex rounded-xl bg-navy-50 p-1"><button className={cn('rounded-lg px-4 py-2 text-sm font-semibold', context === 'GMS' && 'bg-white shadow-sm')} onClick={() => setContext('GMS')} type="button">GMS</button><button className={cn('rounded-lg px-4 py-2 text-sm font-semibold', context === 'ecommerce' && 'bg-white shadow-sm')} onClick={() => setContext('ecommerce')} type="button">E-commerce</button></div>}<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map((channel) => <button aria-pressed={draft.channelIds.includes(channel.id)} className={cn('selection-tile flex items-center gap-3 rounded-xl border p-4 text-left transition', draft.channelIds.includes(channel.id) ? 'border-mint-500 bg-mint-50' : 'border-navy-100 hover:border-navy-200 hover:bg-navy-50')} key={channel.id} onClick={() => toggleChannel(channel.id)} type="button"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black shadow-sm">{channel.logo}</span><span><strong className="block">{channel.name === 'Leclerc' ? 'E.Leclerc' : channel.name}</strong><span className="text-xs text-navy-500">{channel.type}</span></span>{draft.channelIds.includes(channel.id) && <CheckCircle2 className="ml-auto text-mint-600" size={18} />}</button>)}</div>{draft.channelIds.length > 1 && <Notice tone="info">Les paramètres communs sont utilisés dans ce prototype. Ils pourront être ajustés par enseigne ensuite.</Notice>}</section>;
}

function PeriodStep({ draft, duration, overlaps, update }: { draft: Draft; duration: number; overlaps: Promotion[]; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  return <section><StepTitle title="Quand aura lieu la promotion ?" /><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Date de début"><input className={inputClass} type="date" value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} /></Field><Field label="Date de fin"><input className={inputClass} min={draft.startDate} type="date" value={draft.endDate} onChange={(event) => update('endDate', event.target.value)} /></Field></div><p className="mt-4 font-semibold tabular-nums">Durée : {duration} jour{duration > 1 ? 's' : ''}</p>{overlaps.length > 0 && <Notice tone="warning"><strong>À vérifier — chevauchement détecté</strong><p className="mt-1">Une autre promotion concernant cette gamme est prévue sur une partie de cette période. Ce n’est pas un problème réglementaire.</p>{overlaps.map((promotion) => <Link className="mt-2 block font-semibold underline" href={`/promotions/${promotion.id}`} key={promotion.id}>{promotion.name} · {shortDate(promotion.startDate)} → {shortDate(promotion.endDate)}</Link>)}</Notice>}</section>;
}

function MechanicStep({ draft, options, update }: { draft: Draft; options: string[]; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  return <section><StepTitle title="Quelle mécanique souhaitez-vous utiliser ?" text={options.length ? 'Les choix sont adaptés aux canaux sélectionnés.' : 'Sélectionnez d’abord un canal pour afficher les mécaniques pertinentes.'} /><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{options.map((mechanic) => <button aria-pressed={draft.mechanic === mechanic} className={cn('selection-tile rounded-xl border p-4 text-left font-semibold transition', draft.mechanic === mechanic ? 'border-mint-500 bg-mint-50' : 'border-navy-100 hover:border-navy-200 hover:bg-navy-50')} key={mechanic} onClick={() => update('mechanic', mechanic)} type="button">{mechanic}</button>)}</div>{draft.mechanic && <div className="mt-7 max-w-md border-t border-navy-100 pt-6">{needsPercent(draft.mechanic) && <NumericField label={draft.mechanic} unit="%" value={draft.mechanicValue} onChange={(value) => update('mechanicValue', value)} />}{needsAmount(draft.mechanic) && <NumericField label={draft.mechanic} unit="€" step={0.01} value={draft.mechanicValue} onChange={(value) => update('mechanicValue', value)} />}{needsPromoPrice(draft.mechanic) && <NumericField label="Prix promotionnel" unit="€" step={0.01} value={draft.promoPrice} onChange={(value) => update('promoPrice', value)} />}{needsCode(draft.mechanic) && <Field label="Code promotionnel"><input className={inputClass} placeholder="PROMO20" value={draft.promoCode} onChange={(event) => update('promoCode', event.target.value.toUpperCase())} /></Field>}</div>}</section>;
}

function EconomyStep({ draft, expenses, detailedExpenses, expenseLabels, metrics, promoPrice, showExpenses, totalVolume, setShowExpenses, update }: { draft: Draft; expenses: number; detailedExpenses: number; expenseLabels: string[]; metrics: ReturnType<typeof calculatePromotion>; promoPrice: number; showExpenses: boolean; totalVolume: number; setShowExpenses: (show: boolean) => void; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  return <section><StepTitle title="Économie de la promotion" text="Les résultats se recalculent immédiatement." /><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><NumericField label="Prix habituel" unit="€" step={0.01} value={draft.usualPrice} onChange={(value) => update('usualPrice', value)} /><NumericField disabled={needsPercent(draft.mechanic)} label="Prix promotionnel" unit="€" step={0.01} value={promoPrice} onChange={(value) => update('promoPrice', value)} /><NumericField label="PRI / coût de revient" unit="€" step={0.01} value={draft.costPrice} hint="Coût de revient utilisé pour calculer la marge de l’opération." onChange={(value) => update('costPrice', value)} /><NumericField label="Volume prévisionnel" unit="unités" value={totalVolume} onChange={(value) => { update('volumeMode', 'global'); update('globalVolume', value); }} /><NumericField disabled={showExpenses} label="Dépenses liées à l’opération" unit="€" value={expenses} onChange={(value) => update('expenses', value)} /><NumericField label="Objectif minimum de marge" unit="%" step={0.1} value={draft.minimumMarginRate} onChange={(value) => update('minimumMarginRate', value)} /></div><div className="mt-4 flex items-center justify-between gap-3"><p className="font-bold tabular-nums text-navy-900">Remise calculée : <span className="text-mint-700">-{metrics.discountRate.toFixed(1)} %</span></p><Button variant="ghost" onClick={() => setShowExpenses(!showExpenses)}>{showExpenses ? 'Masquer le détail' : '+ Détailler'}</Button></div>{showExpenses && <div className="accordion-grid is-open mt-3"><div><div className="grid gap-3 rounded-xl bg-navy-50 p-4 sm:grid-cols-2">{expenseLabels.map((label) => <NumericField key={label} label={label} unit="€" value={draft.expenseDetails[label] || 0} onChange={(value) => update('expenseDetails', { ...draft.expenseDetails, [label]: value })} />)}<p className="font-bold tabular-nums sm:col-span-2">Total détaillé : {euro(detailedExpenses)}</p></div></div></div>}<div className="economy-preview mt-7 border-y border-navy-100 py-5"><p className="text-xs font-bold uppercase tracking-wider text-navy-400">Aperçu en temps réel</p><div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4"><Metric label="CA prévisionnel" value={euro(metrics.revenue)} /><Metric label="Marge" value={`${metrics.marginRate.toFixed(1)} %`} /><Metric label="ROI" value={`${metrics.roi.toFixed(1)}×`} /><Metric label="Volume" value={totalVolume.toLocaleString('fr-FR')} /></div></div></section>;
}

function AnalysisStep({ compliance, draft, expenses, isComparing, metrics, overlaps, scenarios, showScenarios, totalVolume, applyScenario, compareScenarios }: { compliance: ReturnType<typeof runPrototypeCompliance>; draft: Draft; expenses: number; isComparing: boolean; metrics: ReturnType<typeof calculatePromotion>; overlaps: Promotion[]; scenarios: ReturnType<typeof buildScenarios>; showScenarios: boolean; totalVolume: number; applyScenario: (price: number) => void; compareScenarios: () => void }) {
  const belowTarget = metrics.marginRate < draft.minimumMarginRate;
  return <section><StepTitle title="Analyse de votre promotion" /><div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-navy-100 py-5 lg:grid-cols-4"><Metric label="CA prévisionnel" value={euro(metrics.revenue)} /><Metric label="Marge" value={`${metrics.marginRate.toFixed(1)} %`} caption={`Objectif ${draft.minimumMarginRate} %`} /><Metric label="ROI" value={`${metrics.roi.toFixed(1)}×`} /><Metric label="Volume" value={totalVolume.toLocaleString('fr-FR')} /></div><div className="mt-7 grid gap-4 md:grid-cols-3"><Control title="Rentabilité" status={belowTarget ? 'Vigilance' : 'Conforme'} text={`${euro(metrics.marginAfterExpenses)} après ${euro(expenses)} de dépenses. ${belowTarget ? `Sous l’objectif de ${draft.minimumMarginRate} %.` : 'Objectif de marge atteint.'}`} /><Control title="Réglementation" status={compliance[0].status} text={compliance[0].explanation} detail={`${compliance[0].source} · ${compliance[0].version}`} /><Control title="Opérationnel" status={overlaps.length ? 'Vigilance' : 'Conforme'} text={overlaps.length ? `${overlaps.length} chevauchement(s) à vérifier.` : 'Dates et données essentielles cohérentes.'} /></div>{belowTarget && <div className="mt-6 rounded-xl border border-mint-200 bg-mint-50 p-5"><Badge tone="info">Alternative calculée</Badge><div className="mt-4 grid gap-4 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-navy-400">Scénario actuel</p><p className="mt-2 font-bold tabular-nums">Remise -{metrics.discountRate.toFixed(1)} % · Marge {metrics.marginRate.toFixed(1)} % · ROI {metrics.roi.toFixed(1)}×</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-navy-400">Recommandé</p><p className="mt-2 font-bold tabular-nums">Remise -{scenarios[1].metrics.discountRate.toFixed(1)} % · Marge {scenarios[1].metrics.marginRate.toFixed(1)} % · ROI {scenarios[1].metrics.roi.toFixed(1)}×</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" disabled={isComparing} onClick={compareScenarios}>{isComparing ? <PulseLoader label="Promo Pulse analyse" /> : showScenarios ? 'Masquer les scénarios' : 'Comparer les scénarios'}</Button><Button variant="ghost" onClick={() => applyScenario(scenarios[1].price)}>Tester ce scénario</Button></div></div>}{showScenarios && <ScenarioTable scenarios={scenarios} onApply={applyScenario} />}</section>;
}

function ValidationStep({ compliance, draft, expenses, metrics, promoPrice, selectedProducts, totalVolume, update, save }: { compliance: ReturnType<typeof runPrototypeCompliance>; draft: Draft; expenses: number; metrics: ReturnType<typeof calculatePromotion>; promoPrice: number; selectedProducts: Product[]; totalVolume: number; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void; save: (status: 'Brouillon' | 'Planifiée') => void }) {
  const summary = [['Produits / gamme', selectedProducts.map((product) => product.name).join(', ') || draft.selectedLineIds.map((id) => getLine(id).name).join(', ') || 'À compléter'], ['Références', selectedProducts.map((product) => product.ean.code).join(', ') || 'À compléter'], ['Enseigne / canal', draft.channelIds.map((id) => getChannel(id).name).join(', ') || 'À compléter'], ['Période', `${shortDate(draft.startDate)} → ${shortDate(draft.endDate)}`], ['Mécanique', draft.mechanic], ['Prix', `${euro(draft.usualPrice)} → ${euro(promoPrice)}`], ['Volume', `${totalVolume.toLocaleString('fr-FR')} unités`], ['Dépenses', euro(expenses)], ['CA prévisionnel', euro(metrics.revenue)], ['Marge', `${euro(metrics.marginAfterExpenses)} · ${metrics.marginRate.toFixed(1)} %`], ['ROI', `${metrics.roi.toFixed(1)}×`]];
  return <section><StepTitle title="Récapitulatif de votre promotion" /><div className="mt-6 max-w-xl"><Field label="Nom de la promotion"><input className={inputClass} value={draft.name} onChange={(event) => update('name', event.target.value)} /></Field></div><dl className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">{summary.map(([label, value]) => <div className="border-b border-navy-100 pb-3" key={label}><dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</dt><dd className="mt-1 truncate font-semibold tabular-nums" title={value}>{value}</dd></div>)}</dl><div className="mt-6 flex items-start justify-between gap-4 rounded-xl bg-blue-50 p-4"><div><p className="font-semibold text-blue-900">Contrôle réglementaire du prototype</p><p className="mt-1 text-sm text-blue-800">{compliance[0].explanation}</p></div><StatusBadge status={compliance[0].status} /></div>{metrics.marginRate < draft.minimumMarginRate && <Notice tone="warning">Une recommandation est disponible : la marge reste sous votre objectif. Vous pouvez néanmoins enregistrer ou planifier.</Notice>}<div className="mt-7 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => save('Brouillon')}>Enregistrer comme brouillon</Button><Button disabled={!draft.channelIds.length || totalVolume <= 0} onClick={() => save('Planifiée')}>Planifier la promotion</Button></div></section>;
}

function StepTitle({ title, text }: { title: string; text?: string }) { return <div><h2 className="text-2xl font-bold">{title}</h2>{text && <p className="mt-2 text-navy-500">{text}</p>}</div>; }
function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p>{caption && <p className="mt-1 text-xs text-navy-500">{caption}</p>}</div>; }
function Notice({ children, tone }: { children: React.ReactNode; tone: 'info' | 'warning' }) { return <div className={cn('mt-6 flex gap-3 rounded-xl p-4 text-sm', tone === 'warning' ? 'border border-orange-100 bg-orange-50 text-orange-800' : 'bg-blue-50 text-blue-800')}>{tone === 'warning' ? <AlertTriangle className="mt-0.5 shrink-0" size={18} /> : <Info className="mt-0.5 shrink-0" size={18} />}<div>{children}</div></div>; }
function Control({ title, status, text, detail }: { title: string; status: 'Non vérifié' | 'Conforme' | 'Vigilance' | 'Problème'; text: string; detail?: string }) { return <div className="rounded-xl border border-navy-100 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-bold">{title}</h3><StatusBadge status={status} /></div><p className="mt-3 text-sm leading-6 text-navy-500">{text}</p>{detail && <details className="mt-2 text-xs text-navy-500"><summary className="cursor-pointer font-semibold text-navy-700">Pourquoi ?</summary><p className="mt-2">{detail}</p></details>}</div>; }
function ScenarioTable({ scenarios, onApply }: { scenarios: ReturnType<typeof buildScenarios>; onApply: (price: number) => void }) { return <div className="mt-5 overflow-x-auto rounded-xl border border-navy-100"><table className="w-full min-w-[620px] text-sm"><thead><tr><th className="p-3 text-left" /><th className="p-3">Actuel</th><th className="bg-mint-50 p-3">Recommandé</th><th className="p-3">Alternative</th></tr></thead><tbody>{[['Remise', ...scenarios.map((item) => `-${item.metrics.discountRate.toFixed(1)} %`)], ['Prix', ...scenarios.map((item) => euro(item.price))], ['Marge', ...scenarios.map((item) => `${item.metrics.marginRate.toFixed(1)} %`)], ['ROI', ...scenarios.map((item) => `${item.metrics.roi.toFixed(1)}×`)]].map((row) => <tr className="border-t border-navy-100" key={row[0]}>{row.map((cell, index) => <td className={cn('p-3 text-center tabular-nums', index === 0 && 'text-left font-semibold', index === 2 && 'bg-mint-50')} key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table><div className="flex justify-end border-t border-navy-100 p-3"><Button variant="ghost" onClick={() => onApply(scenarios[1].price)}>Tester le recommandé</Button></div></div>; }
