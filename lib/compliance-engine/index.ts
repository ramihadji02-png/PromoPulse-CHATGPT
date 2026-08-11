import type { ChannelType, ComplianceCheck } from '@/types/promo';

export type ComplianceRule = {
  id: string;
  name: string;
  description: string;
  channels: ChannelType[];
  condition: 'prototype-placeholder';
  level: 'information';
  explanation: string;
  source: string;
  version: string;
};

export const prototypeRules: ComplianceRule[] = [{
  id: 'annual-volume-structure',
  name: 'Projection annuelle — structure de données',
  description: 'Vérifie uniquement que le volume nécessaire aux futures projections annuelles est disponible.',
  channels: ['GMS', 'Marketplace', 'E-commerce'],
  condition: 'prototype-placeholder',
  level: 'information',
  explanation: 'Ce contrôle prépare la structure du futur moteur. Il ne constitue pas une interprétation juridique.',
  source: 'Règle mockée — aucune source juridique appliquée',
  version: 'Prototype 2026-08-11',
}];

export function runPrototypeCompliance(volume: number): ComplianceCheck[] {
  const rule = prototypeRules[0];
  return [{
    id: rule.id,
    label: rule.name,
    status: volume > 0 ? 'Non vérifié' : 'Vigilance',
    category: 'Réglementation',
    explanation: volume > 0 ? rule.explanation : 'Le volume manque : la future projection annuelle ne pourra pas être calculée.',
    source: rule.source,
    version: rule.version,
  }];
}
