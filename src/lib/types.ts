// ============================================================================
// Core domain types for Etsy Listing Follow-up OS
// ============================================================================

export type ListingStatus =
  | 'New'
  | 'Observe'
  | 'Signal'
  | 'Testing'
  | 'Follow-up'
  | 'Growing'
  | 'Scale'
  | 'Winner'
  | 'Hold'
  | 'Dropped';

export const LISTING_STATUSES: ListingStatus[] = [
  'New',
  'Observe',
  'Signal',
  'Testing',
  'Follow-up',
  'Growing',
  'Scale',
  'Winner',
  'Hold',
  'Dropped',
];

// Statuses shown as columns on the Pipeline kanban (order matters).
export const PIPELINE_STATUSES: ListingStatus[] = LISTING_STATUSES;

// "Active" = anything not dropped. Used for pool counts.
export const ACTIVE_STATUSES: ListingStatus[] = LISTING_STATUSES.filter(
  (s) => s !== 'Dropped',
);

// Etsy Ads default listing strategies (matches Etsy's own wording).
export type AdStrategy = 'Greater visibility' | 'Efficient spending' | 'Lower click cost';
export const AD_STRATEGIES: AdStrategy[] = ['Greater visibility', 'Efficient spending', 'Lower click cost'];

export type Priority = 1 | 2 | 3 | 4 | 5;

// Snapshot of the metrics for a listing at a point in time. All fields optional
// so a snapshot can be logged in seconds without filling everything in.
export interface Metrics {
  views?: number;
  visits?: number;
  ctr?: number; // percentage, e.g. 3.4 means 3.4%
  cvr?: number; // percentage
  orders?: number;
  revenue?: number;
  adSpend?: number;
  roas?: number;
  favorites?: number;
}

export interface Listing {
  id: string;
  listingName: string;
  etsyUrl?: string;
  imageUrl?: string; // optional image link shown as a thumbnail
  etsyListingId?: string;
  shopName?: string;
  category?: string;
  publishDate?: string; // ISO date (YYYY-MM-DD)
  currentPrice?: number;
  discount?: number; // percentage off
  adEnabled: boolean;
  adStrategy?: AdStrategy;
  status: ListingStatus;
  priority: Priority;
  tags: string[];
  notes?: string;
  currentMetrics: Metrics;
  // Denormalised review scheduling (kept in sync with actions/reviews).
  nextReviewDate?: string; // ISO date
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

// The short, real-world list of "what did I adjust". Kept intentionally small.
// Values are the user's own operational vocabulary (Chinese).
export type ActionType = string;

export const ACTION_TYPES: string[] = ['价格', '主图', '附图', '视频', '选项', '逻辑', '备注/其他'];

export interface Action {
  id: string;
  listingId: string;
  date: string; // ISO date the action happened
  type: ActionType; // primary category (= types[0]) for compatibility/sorting
  types?: ActionType[]; // everything adjusted in this action (multi-select)
  linkUrl?: string; // optional attached link (e.g. the new image / a reference)
  linkName?: string; // custom display name for the link
  beforeValue?: string;
  afterValue?: string;
  reason?: string; // note
  notes?: string;
  reviewAfterDays?: number | null;
  reviewDate?: string; // ISO date, derived from date + reviewAfterDays
  createdAt: string;
}

export interface Snapshot {
  id: string;
  listingId: string;
  date: string; // ISO date
  views?: number;
  visits?: number;
  ctr?: number;
  cvr?: number;
  orders?: number;
  revenue?: number;
  adSpend?: number;
  roas?: number;
  favorites?: number;
  notes?: string;
  createdAt: string;
}

export type ExperimentStatus =
  | 'Planned'
  | 'Running'
  | 'Positive'
  | 'Neutral'
  | 'Negative'
  | 'Cancelled';

export const EXPERIMENT_STATUSES: ExperimentStatus[] = [
  'Planned',
  'Running',
  'Positive',
  'Neutral',
  'Negative',
  'Cancelled',
];

// A concluded experiment carries one of these outcomes.
export const EXPERIMENT_OUTCOMES: ExperimentStatus[] = ['Positive', 'Neutral', 'Negative'];

export interface Experiment {
  id: string;
  listingId: string;
  name: string;
  hypothesis?: string;
  variable: ActionType | string;
  beforeValue?: string;
  afterValue?: string;
  startDate: string; // ISO date
  reviewDate?: string; // ISO date
  status: ExperimentStatus;
  beforeSnapshot?: Metrics;
  afterSnapshot?: Metrics;
  conclusion?: string;
  decision?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReviewDecision =
  | 'Continue Observing'
  | 'Keep Current Setup'
  | 'Optimize'
  | 'Scale'
  | 'Reduce'
  | 'Hold'
  | 'Drop';

export const REVIEW_DECISIONS: ReviewDecision[] = [
  'Continue Observing',
  'Keep Current Setup',
  'Optimize',
  'Scale',
  'Reduce',
  'Hold',
  'Drop',
];

export interface Review {
  id: string;
  listingId: string;
  date: string; // ISO date the review was completed
  decision: ReviewDecision;
  note?: string;
  nextReviewDate?: string; // ISO date
  createdAt: string;
}

export interface Settings {
  id: string; // always 'app'
  positiveCtrThreshold: number; // %
  positiveCvrThreshold: number; // %
  positiveRoasThreshold: number;
  untouchedWarningDays: number;
  defaultReviewIntervalDays: number;
  currency: string;
  defaultShop: string;
  theme: 'light' | 'dark';
  // Product Matrix quadrant thresholds (defaults mirror the positive thresholds).
  matrixCtrThreshold: number;
  matrixCvrThreshold: number;
  demoLoaded?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  // Serialized filter state (see filters.ts FilterState).
  filter: unknown;
  createdAt: string;
}

// Shape of a JSON backup file.
export interface BackupData {
  meta: {
    app: string;
    version: number;
    exportedAt: string;
  };
  listings: Listing[];
  actions: Action[];
  snapshots: Snapshot[];
  experiments: Experiment[];
  reviews: Review[];
  savedFilters: SavedFilter[];
  settings: Settings | null;
}
