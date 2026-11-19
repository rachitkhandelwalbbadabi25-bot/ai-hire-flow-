// Centralized lazy route loaders & deduplicated hover/focus prefetcher
export const loadLanding = () => import('../pages/Landing');
export const loadResumeAnalyzerSEO = () => import('../pages/ResumeAnalyzerSEO');
export const loadResumeEditorSEO = () => import('../pages/ResumeEditorSEO');
export const loadJobFinderSEO = () => import('../pages/JobFinderSEO');
export const loadJobTrackerSEO = () => import('../pages/JobTrackerSEO');
export const loadCareerAdvisorSEO = () => import('../pages/CareerAdvisorSEO');
export const loadInterviewLabSEO = () => import('../pages/InterviewLabSEO');
export const loadPrivacyPolicy = () => import('../pages/PrivacyPolicy');
export const loadTermsAndConditions = () => import('../pages/TermsAndConditions');
export const loadRefundPolicy = () => import('../pages/RefundPolicy');
export const loadContactUs = () => import('../pages/ContactUs');

export const loadDashboard = () => import('../pages/Dashboard');
export const loadResumeAnalyzer = () => import('../pages/ResumeAnalyzer');
export const loadJobTracker = () => import('../pages/JobTracker');
export const loadJobFinder = () => import('../pages/JobFinder');
export const loadInterviewSimulator = () => import('../pages/InterviewSimulator');
export const loadLearningPath = () => import('../pages/LearningPath');
export const loadResumeEditor = () => import('../pages/ResumeEditor');
export const loadProfile = () => import('../pages/Profile');
export const loadCampusPlacement = () => import('../pages/CampusPlacement');
export const loadOutreachHub = () => import('../pages/OutreachHub');
export const loadCreditsPage = () => import('../pages/Credits');

const ROUTE_PREFETCHERS: Record<string, () => Promise<unknown>> = {
  '/': loadLanding,
  '/resume-analyzer': loadResumeAnalyzerSEO,
  '/ats-resume-checker': loadResumeAnalyzerSEO,
  '/resume-editor': loadResumeEditorSEO,
  '/resume-builder': loadResumeEditorSEO,
  '/job-finder': loadJobFinderSEO,
  '/ai-job-search': loadJobFinderSEO,
  '/job-tracker': loadJobTrackerSEO,
  '/career-advisor': loadCareerAdvisorSEO,
  '/career-roadmap': loadCareerAdvisorSEO,
  '/interview-lab': loadInterviewLabSEO,
  '/ai-interview-preparation': loadInterviewLabSEO,
  '/dashboard': loadDashboard,
  '/analyzer': loadResumeAnalyzer,
  '/editor': loadResumeEditor,
  '/finder': loadJobFinder,
  '/jobs': loadJobTracker,
  '/tracker': loadJobTracker,
  '/interview': loadInterviewSimulator,
  '/learning': loadLearningPath,
  '/roadmap': loadLearningPath,
  '/campus': loadCampusPlacement,
  '/outreach': loadOutreachHub,
  '/profile': loadProfile,
  '/credits': loadCreditsPage,
};

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string): void {
  const loader = ROUTE_PREFETCHERS[path];
  if (!loader || prefetchedRoutes.has(path)) return;
  prefetchedRoutes.add(path);
  loader().catch(() => {
    prefetchedRoutes.delete(path);
  });
}
