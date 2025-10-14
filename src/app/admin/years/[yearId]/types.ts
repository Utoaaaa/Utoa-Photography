export type YearStatus = 'draft' | 'published';

export interface YearSummary {
  id: string;
  label: string;
  status: YearStatus;
  order_index: string;
}

export type DetailState = 'idle' | 'loading' | 'error';
