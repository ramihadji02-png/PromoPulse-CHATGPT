'use client';
import {useState} from 'react';
import Link from 'next/link';
import {PromotionTable} from '@/components/promotion';
import {Button,Card,Tabs} from '@/components/ui';
import {promotions} from '@/data/mock';

export default function Promotions(){
 const[tab,setTab]=useState('Toutes');
 const todo=promotions.filter((promotion)=>promotion.controlStatus==='Problème'||promotion.marginRate<15).length;
 return <div className="product-page space-y-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-3xl font-black">Promotions</h1><p className="mt-2 text-navy-500">Pilotez vos opérations et leur état.</p></div><Link href="/promotions/new"><Button className="primary-action">+ Nouvelle promotion</Button></Link></div><Tabs active={tab} items={['Toutes','Brouillons','À valider','Planifiées','En cours','Terminées']} onSelect={setTab}/><Card className="operational-panel promotions-filter p-5"><div className="grid gap-3 md:grid-cols-[1fr_180px_180px]"><input className="rounded-[10px] border px-3 py-2.5" placeholder="Rechercher une promotion, un produit, une enseigne..."/><select className="rounded-[10px] border px-3 py-2.5"><option>Statut</option></select><select className="rounded-[10px] border px-3 py-2.5"><option>Contrôle</option></select></div><p className="mt-3 text-sm text-navy-500">{todo} promotions à traiter.</p></Card><PromotionTable items={promotions} status={tab}/></div>
}
