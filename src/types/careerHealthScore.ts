export interface CategoryHealthMetric {
  id: 'resume' | 'interview' | 'application' | 'skills';
  name: string;
  weightPercentage: number; // 25
  rawScore: number; // 0-100
  weightedScore: number; // 0-25
  hasData: boolean;
  statusLabel: string;
  improvementAction: string; // Exactly 1 improvement action
  onboardingStep: string; // Shown if hasData === false
  ctaLabel: string;
  ctaLink: string;
  details: string;
}

export interface CareerHealthScoreData {
  totalScore: number; // 0-100
  tier: 'Elite Readiness' | 'Competitive Candidate' | 'Developing Foundation' | 'Setup Stage';
  ratingHeadline: string;
  honestAssessment: string;
  primaryBottleneckId: 'resume' | 'interview' | 'application' | 'skills';
  categories: {
    resume: CategoryHealthMetric;
    interview: CategoryHealthMetric;
    application: CategoryHealthMetric;
    skills: CategoryHealthMetric;
  };
  categoriesList: CategoryHealthMetric[];
}
