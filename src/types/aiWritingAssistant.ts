export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface BulletXYZBreakdown {
  accomplishedX: string;
  measuredByY: string;
  doingZ: string;
}

export interface BulletAISuggestion {
  id?: string;
  original: string;
  rewritten: string;
  reasoning: string;
  impact_estimate: string;
  confidence_level: ConfidenceLevel;
  xyzBreakdown: BulletXYZBreakdown;
  hasMetricProxy: boolean;
  metricGuidance?: string;
  focusType?: string;
}

export interface BulletImprovementResult {
  original: string;
  suggestions: BulletAISuggestion[];
  recruiterNote: string;
}
