'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, FileText, Pencil, RefreshCw, X } from 'lucide-react';
import { Badge, Button, Card, StatusBadge, Tabs } from '@/components/ui';
import { getChannel, getLine, getProduct, promotions } from '@/data/mock';
import { euro, shortDate } from '@/lib/utils';
import type { Product, Promotion } from '@/types/promo';

const savedKey = 'promo-pulse-promotions';
const draftKey = 'promo-pulse-draft';
const localProductsKey = 'promo-pulse-products';
const tabs = ['Vue d’ensemble', 'Analyse', 'Réglementation', 'Résultats', 'Historique'];
const documentTypes = ['Fiche interne', 'Document enseigne', 'Préparation négociation', 'Analyse'];

export function PromotionDetail({ id }: { id: string }) {
  const router = useRouter();
  const [active, setActive] = useState(tabs[0]);
  const [localPromotion, setLocalPromotion] = useState<Promotion | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [documentModal, setDocumentModal] = useState(false);
  const [documentType, setDocumentType] = useState(documentTypes[0]);

  useEffect(() => {
    const saved = JSON.parse(window.localStorage.getItem(savedKey) || '[]') as Promotion[];
    const timer = window.setTimeout(() => {
      setLocalPromotion(saved.find((promotion) => promotion.id === id) ?? null);
      setLocalProducts(JSON.parse(window.localStorage.getItem(localProductsKey) || '[]'));
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  const promotion = localPromotion ?? promotions.find((item) => item.id === id);
  const similar = useMemo(() => promotion ? promotions.filter((item) => item.id !== promotion.id && item.productLineId === promotion.productLineId).slice(0, 3) : [], [promotion]);

  if (!promotion && !loaded) return <Card>Chargement de la promotion…</Card>;
  if (!promotion) return <Card><h1 className="text-xl font-bold">Promotion introuvable</h1><Link className="mt-4 inline-block font-semibold text-mint-600" href="/promotions">Retour aux promotions</Link></Card>;

  const channelNames = promotion.channelIds.map((channelId) => getChannel(channelId).name).join(', ');
  const productNames = promotion.products.map((item) => getProduct(item.productId)?.name ?? localProducts.find((product) => product.id === item.productId)?.name).filter(Boolean).join(', ');
  const volume = promotion.products.reduce((sum, item) => sum + item.forecastVolume, 0);
  const expenses = promotion.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const duplicate = () => {
    window.localStorage.setItem(draftKey, JSON.stringify({ selectedProducts: promotion.products.map((item) => item.productId), channelIds: promotion.channelIds, startDate: promotion.startDate, endDate: promotion.endDate, mechanic: promotion.mechanic, mechanicId: promotion.mechanicId, mechanicConfiguration: promotion.mechanicConfiguration, volumeMode: 'reference', globalVolume: volume, referenceVolumes: Object.fromEntries(promotion.products.map((item) => [item.productId, item.forecastVolume])), usualPrice: promotion.usualPrice, promoPrice: promotion.promoPrice, costPrice: promotion.costPrice ?? 0, expenses, expenseDetails: Object.fromEntries(promotion.expenses.map((expense) => [expense.label, expense.amount])), minimumMarginRate: promotion.minimumMarginRate ?? 15, name: `${promotion.name} — copie` }));
    router.push('/promotions/new');
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-navy-900" href="/promotions"><ArrowLeft size={16} />Retour aux promotions</Link>
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-3xl font-black tracking-tight">{promotion.name}</h1><p className="mt-2 text-navy-500">{channelNames} · {getLine(promotion.productLineId).name} · {shortDate(promotion.startDate)} → {shortDate(promotion.endDate)}</p><div className="mt-4 flex gap-2"><StatusBadge status={promotion.operationalStatus} /><StatusBadge status={promotion.controlStatus} /></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={duplicate}><Pencil className="mr-2" size={15} />Modifier</Button><Button variant="secondary" onClick={duplicate}><Copy className="mr-2" size={15} />Dupliquer</Button><Button variant="secondary" onClick={duplicate}><RefreshCw className="mr-2" size={15} />Réutiliser</Button><Button onClick={() => setDocumentModal(true)}><FileText className="mr-2" size={15} />Générer un document</Button></div></header>
    <Tabs active={active} items={tabs} onSelect={setActive} />

    {active === 'Vue d’ensemble' && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="CA prévisionnel" value={euro(promotion.forecastRevenue)} /><Metric label="Marge après dépenses" value={euro(promotion.forecastMargin)} caption={`${promotion.marginRate.toFixed(1)} % du CA`} /><Metric label="ROI promotionnel" value={`${promotion.roi.toFixed(1)}×`} /><Metric label="Volume prévisionnel" value={volume.toLocaleString('fr-FR')} caption="unités" /></div><Card><h2 className="text-lg font-bold">Paramètres de l’opération</h2><dl className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"><Item label="Enseigne / canal" value={channelNames} /><Item label="Produits" value={productNames || getLine(promotion.productLineId).name} /><Item label="Période" value={`${shortDate(promotion.startDate)} → ${shortDate(promotion.endDate)}`} /><Item label="Mécanique" value={promotion.mechanic} /><Item label="Prix" value={`${euro(promotion.usualPrice)} → ${euro(promotion.promoPrice)} (-${promotion.discountRate.toFixed(1)} %)`} /><Item label="PRI / coût de revient" value={euro(promotion.costPrice ?? 0)} /><Item label="Dépenses" value={euro(expenses)} /></dl>{promotion.expenses.length > 0 && <div className="mt-6 border-t border-navy-100 pt-5"><h3 className="font-bold">Détail des dépenses</h3>{promotion.expenses.map((expense) => <div className="mt-2 flex justify-between text-sm" key={expense.label}><span className="text-navy-500">{expense.label}</span><strong>{euro(expense.amount)}</strong></div>)}</div>}</Card></div>}

    {active === 'Analyse' && <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]"><Card><h2 className="text-lg font-bold">Rentabilité prévisionnelle</h2><dl className="mt-5 space-y-4"><Item label="CA prévisionnel" value={euro(promotion.forecastRevenue)} /><Item label="Marge après dépenses" value={`${euro(promotion.forecastMargin)} · ${promotion.marginRate.toFixed(1)} %`} /><Item label="ROI" value={`${promotion.roi.toFixed(1)}×`} /><Item label="Objectif de marge" value={`${promotion.minimumMarginRate ?? 15} %`} /></dl>{promotion.marginRate < (promotion.minimumMarginRate ?? 15) && <div className="mt-5 rounded-2xl bg-mint-50 p-4"><Badge tone="success">Recommandation</Badge><p className="mt-3 text-sm leading-6">Réduire la remise peut rapprocher cette opération de l’objectif défini. Cette recommandation est déterministe et reste consultative.</p></div>}</Card><Card><h2 className="text-lg font-bold">Scénarios</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr><th className="p-3 text-left">Scénario</th><th className="p-3">Remise</th><th className="p-3">Marge</th><th className="p-3">ROI</th></tr></thead><tbody>{promotion.scenarios.map((scenario, index) => <tr className={index === 1 ? 'bg-mint-50' : 'border-t border-navy-100'} key={scenario.name}><td className="p-3 font-bold">{scenario.name}{index === 1 && <Badge tone="success">Recommandé</Badge>}</td><td className="p-3 text-center">-{scenario.discountRate.toFixed(1)} %</td><td className="p-3 text-center">{scenario.marginRate.toFixed(1)} %</td><td className="p-3 text-center">{scenario.roi.toFixed(1)}×</td></tr>)}</tbody></table></div></Card></div>}

    {active === 'Réglementation' && <Card><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Contrôles réglementaires</h2><p className="mt-1 text-sm text-navy-500">Les règles présentes dans ce prototype sont explicitement mockées et ne constituent pas un avis juridique.</p></div><StatusBadge status={promotion.controlStatus} /></div><div className="mt-5 space-y-3">{promotion.checks.map((check) => <div className="rounded-2xl border border-navy-100 p-4" key={check.id}><div className="flex items-center justify-between"><strong>{check.label}</strong><StatusBadge status={check.status} /></div><p className="mt-2 text-sm leading-6 text-navy-500">{check.explanation}</p>{check.source && <p className="mt-3 text-xs text-navy-400">Source : {check.source} · {check.version}</p>}</div>)}</div></Card>}

    {active === 'Résultats' && <Card>{promotion.result ? <><h2 className="text-lg font-bold">Résultats réels</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Volume réel" value={promotion.result.actualVolume.toLocaleString('fr-FR')} /><Metric label="CA réel" value={euro(promotion.result.actualRevenue)} /><Metric label="Dépenses réelles" value={euro(promotion.result.actualExpenses)} /><Metric label="Marge réelle" value={euro(promotion.result.actualMargin)} /><Metric label="ROI réel" value={`${promotion.result.actualRoi.toFixed(1)}×`} /></div><p className="mt-5 text-sm text-navy-500">Écart de CA prévision / réel : {euro(promotion.result.actualRevenue - promotion.forecastRevenue)}</p></> : <div className="py-10 text-center"><h2 className="text-lg font-bold">Résultats non disponibles</h2><p className="mt-2 text-navy-500">Ils pourront être saisis lorsque la promotion sera terminée.</p><Button className="mt-5" variant="secondary">Saisir les résultats</Button></div>}</Card>}

    {active === 'Historique' && <Card><h2 className="text-lg font-bold">Opérations similaires</h2><div className="mt-4 divide-y divide-navy-100">{similar.map((item) => <Link className="flex items-center justify-between gap-4 py-4" href={`/promotions/${item.id}`} key={item.id}><div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="mt-1 text-sm text-navy-500">{shortDate(item.startDate)} → {shortDate(item.endDate)} · {item.mechanic}</p></div><span className="shrink-0 text-sm font-semibold text-mint-600">Voir</span></Link>)}</div></Card>}

    {documentModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/30 p-4" onClick={() => setDocumentModal(false)} role="presentation"><div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">Générer un document</h2><p className="mt-1 text-sm text-navy-500">Aperçu mocké — la génération PDF sera connectée ultérieurement.</p></div><button aria-label="Fermer" onClick={() => setDocumentModal(false)} type="button"><X size={19} /></button></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{documentTypes.map((type) => <button className={`rounded-xl border p-3 text-left font-semibold ${documentType === type ? 'border-mint-500 bg-mint-50' : 'border-navy-100'}`} key={type} onClick={() => setDocumentType(type)} type="button">{type}</button>)}</div><div className="mt-5 rounded-2xl bg-navy-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-navy-400">Aperçu · {documentType}</p><h3 className="mt-3 text-xl font-black">{promotion.name}</h3><p className="mt-2 text-sm text-navy-500">{channelNames} · {shortDate(promotion.startDate)} → {shortDate(promotion.endDate)}</p><div className="mt-5 grid grid-cols-3 gap-3"><Metric label="CA" value={euro(promotion.forecastRevenue)} /><Metric label="Marge" value={`${promotion.marginRate.toFixed(1)} %`} /><Metric label="ROI" value={`${promotion.roi.toFixed(1)}×`} /></div>{documentType === 'Document enseigne' && <p className="mt-4 text-sm text-blue-700">Les données internes de coût, marge et ROI seront exclues du document final destiné à l’enseigne.</p>}</div><div className="mt-5 flex justify-end"><Button disabled>Générer le PDF — prochaine phase</Button></div></div></div>}
  </div>;
}

function Metric({ label, value, caption }: { label: string; value: string; caption?: string }) { return <div className="rounded-2xl border border-navy-100 bg-white p-4"><p className="text-xs font-semibold text-navy-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p>{caption && <p className="mt-1 text-xs text-navy-400">{caption}</p>}</div>; }
function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</dt><dd className="mt-1 font-semibold text-navy-900">{value}</dd></div>; }
