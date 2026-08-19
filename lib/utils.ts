import { clsx, type ClassValue } from 'clsx'; import { twMerge } from 'tailwind-merge';
export const cn=(...inputs:ClassValue[])=>twMerge(clsx(inputs));
export const euro=(n:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
export const shortDate=(d:string)=>new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short'}).format(new Date(d));
