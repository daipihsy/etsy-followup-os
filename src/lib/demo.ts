import { getDB } from './db';
import { addDays, nowISO, todayISO } from './date';
import { uid } from './util';
import type {
  Action,
  Experiment,
  Listing,
  Metrics,
  Priority,
  Review,
  Snapshot,
} from './types';

function ago(days: number): string {
  return addDays(todayISO(), -days);
}
function ahead(days: number): string {
  return addDays(todayISO(), days);
}

interface Seed {
  name: string;
  shop: string;
  category: string;
  ageDays: number;
  status: Listing['status'];
  priority: Priority;
  price: number;
  adEnabled: boolean;
  adStrategy?: Listing['adStrategy'];
  metrics: Metrics;
  nextReviewDate?: string;
  lastActionDaysAgo?: number;
  tags?: string[];
  notes?: string;
}

const SEEDS: Seed[] = [
  {
    name: 'Personalized Nursery Basket',
    shop: 'LittleNest',
    category: 'Baby & Nursery',
    ageDays: 21,
    status: 'Growing',
    priority: 4,
    price: 41.99,
    adEnabled: true,
    adStrategy: 'Max Exposure',
    metrics: { views: 5400, visits: 1420, ctr: 3.4, cvr: 5.6, orders: 8, revenue: 335.9, adSpend: 82, roas: 4.1, favorites: 96 },
    nextReviewDate: todayISO(), // due today
    lastActionDaysAgo: 3,
    tags: ['bestseller', 'personalized'],
  },
  {
    name: 'Personalized Kids Backpack',
    shop: 'LittleNest',
    category: 'Bags',
    ageDays: 34,
    status: 'Winner',
    priority: 3,
    price: 38.0,
    adEnabled: true,
    adStrategy: 'Efficient Spend',
    metrics: { views: 8100, visits: 2010, ctr: 3.8, cvr: 5.1, orders: 21, revenue: 798, adSpend: 150, roas: 4.7, favorites: 210 },
    lastActionDaysAgo: 7, // untouched winner
    tags: ['winner'],
  },
  {
    name: 'Custom Name Necklace',
    shop: 'AuroraFine',
    category: 'Jewelry',
    ageDays: 12,
    status: 'Testing',
    priority: 4,
    price: 44.99,
    adEnabled: true,
    adStrategy: 'Efficient Spend',
    metrics: { views: 6200, visits: 1580, ctr: 3.4, cvr: 1.5, orders: 3, revenue: 134.97, adSpend: 70, roas: 1.9, favorites: 140 },
    nextReviewDate: ahead(2),
    lastActionDaysAgo: 1,
    tags: ['high-ctr', 'low-cvr'],
    notes: 'Great click-through, transaction rate lagging — price test in progress.',
  },
  {
    name: 'Engraved Bamboo Cutting Board',
    shop: 'OakwoodCo',
    category: 'Home & Kitchen',
    ageDays: 26,
    status: 'Follow-up',
    priority: 3,
    price: 52.0,
    adEnabled: true,
    adStrategy: 'Low Spend',
    metrics: { views: 3900, visits: 940, ctr: 2.9, cvr: 3.2, orders: 5, revenue: 260, adSpend: 60, roas: 3.1, favorites: 74 },
    nextReviewDate: ago(2), // overdue
    lastActionDaysAgo: 6,
  },
  {
    name: 'Pet Portrait Bracelet',
    shop: 'AuroraFine',
    category: 'Jewelry',
    ageDays: 4,
    status: 'Observe',
    priority: 3,
    price: 29.99,
    adEnabled: true,
    adStrategy: 'Max Exposure',
    metrics: { views: 1600, visits: 470, ctr: 2.8, cvr: 0, orders: 0, revenue: 0, adSpend: 22, roas: 0, favorites: 33 },
    lastActionDaysAgo: undefined,
    tags: ['new'],
  },
  {
    name: 'Custom Star Map Print',
    shop: 'NorthLight',
    category: 'Wall Art',
    ageDays: 9,
    status: 'Signal',
    priority: 3,
    price: 34.0,
    adEnabled: true,
    adStrategy: 'Efficient Spend',
    metrics: { views: 2900, visits: 780, ctr: 2.9, cvr: 2.4, orders: 2, revenue: 68, adSpend: 30, roas: 2.3, favorites: 51 },
    nextReviewDate: ahead(1),
    lastActionDaysAgo: 2,
  },
  {
    name: 'Minimalist Line Art Poster',
    shop: 'NorthLight',
    category: 'Wall Art',
    ageDays: 41,
    status: 'Observe',
    priority: 2,
    price: 22.0,
    adEnabled: false,
    metrics: { views: 2100, visits: 360, ctr: 1.4, cvr: 1.1, orders: 1, revenue: 22, adSpend: 0, roas: 0, favorites: 28 },
    lastActionDaysAgo: 14,
  },
  {
    name: 'Birth Flower Signet Ring',
    shop: 'AuroraFine',
    category: 'Jewelry',
    ageDays: 30,
    status: 'Scale',
    priority: 5,
    price: 48.0,
    adEnabled: true,
    adStrategy: 'Max Exposure',
    metrics: { views: 9200, visits: 2600, ctr: 4.1, cvr: 4.9, orders: 27, revenue: 1296, adSpend: 210, roas: 5.2, favorites: 320 },
    nextReviewDate: ahead(3),
    lastActionDaysAgo: 4,
    tags: ['winner', 'scale'],
  },
  {
    name: 'Custom Dog Bandana Set',
    shop: 'OakwoodCo',
    category: 'Pets',
    ageDays: 55,
    status: 'Hold',
    priority: 2,
    price: 18.0,
    adEnabled: false,
    metrics: { views: 1800, visits: 300, ctr: 1.6, cvr: 2.0, orders: 3, revenue: 54, adSpend: 0, roas: 0, favorites: 40 },
    lastActionDaysAgo: 20,
  },
  {
    name: 'Personalized Recipe Journal',
    shop: 'OakwoodCo',
    category: 'Home & Kitchen',
    ageDays: 60,
    status: 'Dropped',
    priority: 1,
    price: 26.0,
    adEnabled: false,
    metrics: { views: 900, visits: 120, ctr: 1.1, cvr: 0.8, orders: 0, revenue: 0, adSpend: 0, roas: 0, favorites: 9 },
    lastActionDaysAgo: 30,
  },
  {
    name: 'Monogram Canvas Tote Bag',
    shop: 'LittleNest',
    category: 'Bags',
    ageDays: 18,
    status: 'Growing',
    priority: 4,
    price: 32.0,
    adEnabled: true,
    adStrategy: 'Efficient Spend',
    metrics: { views: 4700, visits: 1300, ctr: 3.1, cvr: 4.4, orders: 9, revenue: 288, adSpend: 66, roas: 4.0, favorites: 88 },
    nextReviewDate: ago(1), // overdue by 1
    lastActionDaysAgo: 5,
  },
  {
    name: 'Custom Family Portrait Illustration',
    shop: 'NorthLight',
    category: 'Wall Art',
    ageDays: 38,
    status: 'Winner',
    priority: 4,
    price: 59.0,
    adEnabled: true,
    adStrategy: 'Max Exposure',
    metrics: { views: 7300, visits: 1900, ctr: 3.6, cvr: 5.3, orders: 18, revenue: 1062, adSpend: 140, roas: 4.9, favorites: 260 },
    lastActionDaysAgo: 9, // untouched winner
    tags: ['winner'],
  },
  {
    name: 'Personalized Leather Keychain',
    shop: 'OakwoodCo',
    category: 'Accessories',
    ageDays: 1,
    status: 'New',
    priority: 3,
    price: 16.0,
    adEnabled: true,
    adStrategy: 'Max Exposure',
    metrics: { views: 320, visits: 90, ctr: 2.6, cvr: 0, orders: 0, revenue: 0, adSpend: 6, roas: 0, favorites: 7 },
    tags: ['new'],
  },
  {
    name: 'Wedding Guest Book Alternative',
    shop: 'NorthLight',
    category: 'Wedding',
    ageDays: 47,
    status: 'Follow-up',
    priority: 3,
    price: 45.0,
    adEnabled: true,
    adStrategy: 'Low Spend',
    metrics: { views: 3100, visits: 540, ctr: 1.7, cvr: 5.4, orders: 6, revenue: 270, adSpend: 40, roas: 3.4, favorites: 63 },
    nextReviewDate: ahead(4),
    lastActionDaysAgo: 8,
    tags: ['low-ctr', 'high-cvr'],
  },
];

export async function loadDemoData(): Promise<void> {
  const db = getDB();
  const now = nowISO();
  const listings: Listing[] = [];
  const actions: Action[] = [];
  const snapshots: Snapshot[] = [];
  const experiments: Experiment[] = [];
  const reviews: Review[] = [];

  for (const s of SEEDS) {
    const id = uid('lst');
    const publishDate = ago(s.ageDays);
    listings.push({
      id,
      listingName: s.name,
      etsyUrl: `https://www.etsy.com/listing/${100000000 + Math.floor(Math.random() * 8999999)}`,
      etsyListingId: String(100000000 + Math.floor(Math.random() * 8999999)),
      shopName: s.shop,
      category: s.category,
      publishDate,
      currentPrice: s.price,
      discount: undefined,
      adEnabled: s.adEnabled,
      adStrategy: s.adStrategy,
      status: s.status,
      priority: s.priority,
      tags: s.tags ?? [],
      notes: s.notes,
      currentMetrics: s.metrics,
      nextReviewDate: s.nextReviewDate,
      createdAt: publishDate + 'T09:00:00.000Z',
      updatedAt: now,
    });

    // A couple of early snapshots so the timeline + trend charts have shape.
    if (s.metrics.ctr) {
      const half = Math.max(1, Math.floor(s.ageDays / 2));
      snapshots.push({
        id: uid('snp'),
        listingId: id,
        date: ago(Math.min(s.ageDays - 1, half)),
        ctr: Math.max(0, (s.metrics.ctr ?? 0) - 0.4),
        cvr: Math.max(0, (s.metrics.cvr ?? 0) - 1.0),
        roas: Math.max(0, (s.metrics.roas ?? 0) - 0.6),
        orders: Math.max(0, Math.floor((s.metrics.orders ?? 0) / 2)),
        revenue: Math.round(((s.metrics.revenue ?? 0) / 2) * 100) / 100,
        views: Math.floor((s.metrics.views ?? 0) * 0.5),
        visits: Math.floor((s.metrics.visits ?? 0) * 0.5),
        favorites: Math.floor((s.metrics.favorites ?? 0) * 0.5),
        createdAt: now,
      });
      snapshots.push({
        id: uid('snp'),
        listingId: id,
        date: ago(2),
        ...s.metrics,
        createdAt: now,
      });
    }

    if (s.lastActionDaysAgo !== undefined) {
      const aDate = ago(s.lastActionDaysAgo);
      actions.push({
        id: uid('act'),
        listingId: id,
        date: aDate,
        type: '价格',
        types: ['价格'],
        reason: `降价 $${(s.price + 4).toFixed(2)} → $${s.price.toFixed(2)}，点击不错，测试价格是否影响转化。`,
        reviewAfterDays: 3,
        reviewDate: addDays(aDate, 3),
        createdAt: now,
      });
    }
  }

  // A running experiment on the Custom Name Necklace (high CTR / low CVR).
  const necklace = listings.find((l) => l.listingName === 'Custom Name Necklace');
  if (necklace) {
    experiments.push({
      id: uid('exp'),
      listingId: necklace.id,
      name: 'Price Test — $49.99 → $44.99',
      hypothesis: 'CTR is 3.4% but CVR is only 1.5%; a lower price may lift conversion.',
      variable: '价格',
      beforeValue: '$49.99',
      afterValue: '$44.99',
      startDate: ago(2),
      reviewDate: ahead(1),
      status: 'Running',
      beforeSnapshot: { ctr: 3.4, cvr: 1.5, roas: 1.9, orders: 3, revenue: 149.97 },
      createdAt: now,
      updatedAt: now,
    });
  }

  // A concluded positive experiment on the Nursery Basket.
  const basket = listings.find((l) => l.listingName === 'Personalized Nursery Basket');
  if (basket) {
    experiments.push({
      id: uid('exp'),
      listingId: basket.id,
      name: 'Main Image — lifestyle scene',
      hypothesis: 'A styled nursery scene as the main image will raise CTR.',
      variable: '主图',
      beforeValue: 'Flat product shot',
      afterValue: 'Styled nursery scene',
      startDate: ago(12),
      reviewDate: ago(9),
      status: 'Positive',
      beforeSnapshot: { ctr: 2.6, cvr: 4.9, roas: 3.2, orders: 3 },
      afterSnapshot: { ctr: 3.4, cvr: 5.6, roas: 4.1, orders: 8 },
      conclusion: 'CTR climbed from 2.6% to 3.4% and orders followed. Keep the new image.',
      decision: 'Keep new main image; roll the style out to sibling listings.',
      createdAt: now,
      updatedAt: now,
    });
    reviews.push({
      id: uid('rev'),
      listingId: basket.id,
      date: ago(3),
      decision: 'Optimize',
      note: 'Momentum is strong. Lowered price slightly and scheduled a check.',
      nextReviewDate: todayISO(),
      createdAt: now,
    });
  }

  // A concluded negative experiment on the Wedding Guest Book.
  const guestbook = listings.find((l) => l.listingName === 'Wedding Guest Book Alternative');
  if (guestbook) {
    experiments.push({
      id: uid('exp'),
      listingId: guestbook.id,
      name: 'Title Rewrite — keyword-forward',
      hypothesis: 'Leading with high-volume keywords will lift CTR above 2%.',
      variable: '逻辑',
      beforeValue: 'Wedding Guest Book Alternative',
      afterValue: 'Personalized Wedding Guest Book Sign-In Alternative Wood',
      startDate: ago(16),
      reviewDate: ago(13),
      status: 'Negative',
      beforeSnapshot: { ctr: 1.9, cvr: 5.4, orders: 6 },
      afterSnapshot: { ctr: 1.7, cvr: 5.3, orders: 5 },
      conclusion: 'CTR did not improve; the longer title reads worse. Reverted.',
      decision: 'Restore the previous title.',
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.transaction('rw', db.listings, db.actions, db.snapshots, db.experiments, db.reviews, async () => {
    await db.listings.bulkPut(listings);
    await db.actions.bulkPut(actions);
    await db.snapshots.bulkPut(snapshots);
    await db.experiments.bulkPut(experiments);
    await db.reviews.bulkPut(reviews);
  });
}
