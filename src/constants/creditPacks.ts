export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: {
    INR: number;
    USD: number;
  };
  priceFormatted: {
    INR: string;
    USD: string;
  };
  discount: string;
  badge: string;
  recommended?: boolean;
  idealFor: string;
  description: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_mini',
    name: 'MINI',
    credits: 100,
    price: { INR: 49, USD: 1 },
    priceFormatted: { INR: '₹49', USD: '$1' },
    discount: 'Quick Boost',
    badge: 'MINI',
    idealFor: 'For a few extra AI actions.',
    description: 'For a few extra AI actions.'
  },
  {
    id: 'pack_boost',
    name: 'BOOST',
    credits: 300,
    price: { INR: 99, USD: 2 },
    priceFormatted: { INR: '₹99', USD: '$2' },
    discount: 'Popular',
    badge: 'BOOST',
    idealFor: 'For actively applying.',
    description: 'For actively applying.'
  },
  {
    id: 'pack_job_hunt',
    name: 'JOB HUNT',
    credits: 750,
    price: { INR: 199, USD: 3 },
    priceFormatted: { INR: '₹199', USD: '$3' },
    discount: 'Best Value',
    badge: 'JOB HUNT',
    recommended: true,
    idealFor: 'For serious job hunting.',
    description: 'For serious job hunting.'
  },
  {
    id: 'pack_career',
    name: 'CAREER PACK',
    credits: 2000,
    price: { INR: 399, USD: 5 },
    priceFormatted: { INR: '₹399', USD: '$5' },
    discount: 'Maximum Value',
    badge: 'CAREER PACK',
    idealFor: 'For major placement/job searches.',
    description: 'For major placement/job searches.'
  }
];

export function getCreditPackById(idOrName?: string): CreditPack | undefined {
  if (!idOrName) return undefined;
  const clean = idOrName.toLowerCase().trim();
  return CREDIT_PACKS.find(p => 
    p.id === clean || 
    p.name.toLowerCase() === clean ||
    clean.includes(p.id) ||
    (clean.includes('mini') && p.credits === 100) ||
    (clean.includes('boost') && p.credits === 300) ||
    (clean.includes('hunt') && p.credits === 750) ||
    (clean.includes('career') && p.credits === 2000) ||
    (clean === 'pack_100' && p.credits === 100) ||
    (clean === 'pack_300' && p.credits === 300) ||
    (clean === 'pack_750' && p.credits === 750) ||
    (clean === 'pack_2000' && p.credits === 2000)
  );
}
