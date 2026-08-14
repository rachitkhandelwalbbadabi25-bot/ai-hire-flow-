import { CareerHealthScoreData, CategoryHealthMetric } from '../types/careerHealthScore';

export interface CalculatorInputs {
  latestResumeScore?: number;
  missingKeywords?: string[];
  hasResumeData?: boolean;

  simulationsCount?: number;
  averageSimulationScore?: number;

  trackedJobsCount?: number;
  interviewJobsCount?: number;
  offerJobsCount?: number;

  hasRoadmapData?: boolean;
  missingSkills?: string[];
  weeklyMilestonesCount?: number;
}

export function calculateCareerHealthScore(inputs: CalculatorInputs): CareerHealthScoreData {
  const {
    latestResumeScore = 0,
    missingKeywords = [],
    hasResumeData = false,

    simulationsCount = 0,
    averageSimulationScore = 0,

    trackedJobsCount = 0,
    interviewJobsCount = 0,
    offerJobsCount = 0,

    hasRoadmapData = false,
    missingSkills = [],
    weeklyMilestonesCount = 0,
  } = inputs;

  // 1. Resume Strength (25%)
  const hasResume = hasResumeData && latestResumeScore > 0;
  const resumeRaw = hasResume ? Math.min(100, Math.max(0, Math.round(latestResumeScore))) : 0;
  const resumeWeighted = Math.round((resumeRaw * 0.25) * 10) / 10;

  let resumeAction = '';
  if (hasResume) {
    if (resumeRaw < 70) {
      resumeAction = 'Quantify key achievements with measurable business metrics ($ revenue, % latency, team scale) to clear automated ATS screening filters.';
    } else if (missingKeywords.length > 0) {
      resumeAction = `Integrate high-frequency missing keywords (${missingKeywords.slice(0, 2).join(', ')}) into your work experience bullet points.`;
    } else if (resumeRaw < 90) {
      resumeAction = 'Refine action verbs and executive impact statements in the Resume Editor to target top-tier recruiter evaluations.';
    } else {
      resumeAction = 'Maintain ATS precision by syncing your latest project achievements and production metrics into your master resume.';
    }
  }

  const resumeMetric: CategoryHealthMetric = {
    id: 'resume',
    name: 'Resume Strength',
    weightPercentage: 25,
    rawScore: resumeRaw,
    weightedScore: resumeWeighted,
    hasData: hasResume,
    statusLabel: hasResume ? `ATS Audited (${resumeRaw}%)` : 'No Resume Data',
    improvementAction: resumeAction,
    onboardingStep: 'Step 1: Upload and evaluate your master resume in the Resume Analyzer to establish baseline ATS keyword matching and parsing integrity.',
    ctaLabel: hasResume ? (resumeRaw < 85 ? 'Optimize Resume' : 'Audit in Editor') : 'Upload Master Resume',
    ctaLink: '/analyzer',
    details: hasResume 
      ? `ATS compatibility evaluated. ${missingKeywords.length > 0 ? `${missingKeywords.length} missing keywords identified.` : 'All baseline role keywords matched.'}`
      : 'Resume module uninitialized (0 pts).'
  };

  // 2. Interview Readiness (25%)
  const hasInterview = simulationsCount > 0 && averageSimulationScore > 0;
  const interviewRaw = hasInterview ? Math.min(100, Math.max(0, Math.round(averageSimulationScore))) : 0;
  const interviewWeighted = Math.round((interviewRaw * 0.25) * 10) / 10;

  let interviewAction = '';
  if (hasInterview) {
    if (interviewRaw < 70) {
      interviewAction = 'Structure behavioral scenarios using the STAR framework (Situation, Task, Action, Result) for structured, punchy answers.';
    } else if (interviewRaw < 85) {
      interviewAction = 'Simulate high-pressure technical screening drills to tighten verbal explanations of complex system tradeoffs.';
    } else {
      interviewAction = 'Complete a timed speed drill on advanced architecture tradeoffs to lock in top-decile interview performance.';
    }
  }

  const interviewMetric: CategoryHealthMetric = {
    id: 'interview',
    name: 'Interview Readiness',
    weightPercentage: 25,
    rawScore: interviewRaw,
    weightedScore: interviewWeighted,
    hasData: hasInterview,
    statusLabel: hasInterview ? `${simulationsCount} Drills Completed (${interviewRaw}%)` : 'No Simulation Data',
    improvementAction: interviewAction,
    onboardingStep: 'Step 2: Run an interactive AI mock interview simulation in the Interview Simulator to benchmark technical depth and verbal fluency.',
    ctaLabel: hasInterview ? 'Run Mock Drill' : 'Start First Simulation',
    ctaLink: '/interview',
    details: hasInterview
      ? `Readiness index compiled across ${simulationsCount} completed interview drills with AI feedback.`
      : 'Interview simulator uninitialized (0 pts).'
  };

  // 3. Application Activity (25%)
  const hasApplication = trackedJobsCount > 0;
  let applicationRaw = 0;
  if (hasApplication) {
    const jobVolumeScore = Math.min(50, trackedJobsCount * 12.5); // 4 jobs = 50 pts
    const conversionScore = Math.min(50, (interviewJobsCount * 25) + (offerJobsCount * 35) + (trackedJobsCount >= 2 ? 15 : 5));
    applicationRaw = Math.min(100, Math.round(jobVolumeScore + conversionScore));
  }
  const applicationWeighted = Math.round((applicationRaw * 0.25) * 10) / 10;

  let applicationAction = '';
  if (hasApplication) {
    if (trackedJobsCount < 3) {
      applicationAction = 'Track at least 3-5 target roles in your pipeline to maintain consistent interview conversion velocity.';
    } else if (interviewJobsCount === 0) {
      applicationAction = 'Deploy cold referral outreach emails to recruiters and engineering managers in Outreach Hub to convert applications into screens.';
    } else if (offerJobsCount === 0) {
      applicationAction = 'Log interview feedback and schedule technical preparation drills in the Job Tracker to drive current rounds to offers.';
    } else {
      applicationAction = 'Prepare salary negotiation strategies and leverage multiple concurrent offers in the Job Tracker.';
    }
  }

  const applicationMetric: CategoryHealthMetric = {
    id: 'application',
    name: 'Application Activity',
    weightPercentage: 25,
    rawScore: applicationRaw,
    weightedScore: applicationWeighted,
    hasData: hasApplication,
    statusLabel: hasApplication ? `${trackedJobsCount} Roles Tracked (${interviewJobsCount} Screens)` : 'No Applications Tracked',
    improvementAction: applicationAction,
    onboardingStep: 'Step 3: Discover high-compatibility tech openings in Job Finder and add target roles to your Kanban tracker to build pipeline volume.',
    ctaLabel: hasApplication ? (interviewJobsCount === 0 && trackedJobsCount >= 3 ? 'Launch Outreach' : 'Manage Pipeline') : 'Discover Jobs',
    ctaLink: hasApplication ? (interviewJobsCount === 0 && trackedJobsCount >= 3 ? '/outreach' : '/jobs') : '/finder',
    details: hasApplication
      ? `${trackedJobsCount} active opportunities logged with ${interviewJobsCount} active interview screenings and ${offerJobsCount} offers.`
      : 'Application pipeline uninitialized (0 pts).'
  };

  // 4. Skill Growth (25%)
  const hasSkills = hasRoadmapData || (missingSkills.length > 0 && weeklyMilestonesCount > 0);
  let skillRaw = 0;
  if (hasSkills) {
    const baseRoadmap = hasRoadmapData ? 50 : 25;
    const gapMappingBonus = Math.min(30, (missingSkills.length > 0 ? 25 : 10));
    const activityBonus = Math.min(20, (weeklyMilestonesCount || 1) * 10);
    skillRaw = Math.min(100, baseRoadmap + gapMappingBonus + activityBonus);
  }
  const skillWeighted = Math.round((skillRaw * 0.25) * 10) / 10;

  let skillAction = '';
  if (hasSkills) {
    if (missingSkills.length > 0) {
      skillAction = `Complete recommended course modules and practice projects for identified high-priority skill gaps: ${missingSkills.slice(0, 2).join(', ')}.`;
    } else {
      skillAction = 'Explore advanced architectural patterns and system design deep-dives in your personalized Learning Path.';
    }
  }

  const skillMetric: CategoryHealthMetric = {
    id: 'skills',
    name: 'Skill Growth',
    weightPercentage: 25,
    rawScore: skillRaw,
    weightedScore: skillWeighted,
    hasData: hasSkills,
    statusLabel: hasSkills ? `Roadmap Active (${missingSkills.length} Gaps Tracked)` : 'No Learning Data',
    improvementAction: skillAction,
    onboardingStep: 'Step 4: Generate a tailored technical learning roadmap in the Learning Hub to systematically eliminate skill gaps for your target role.',
    ctaLabel: hasSkills ? 'View Study Plan' : 'Generate Roadmap',
    ctaLink: '/learning',
    details: hasSkills
      ? `Skill gaps audited against target role with curated courses and ${weeklyMilestonesCount} active weekly study milestones.`
      : 'Skill growth curriculum uninitialized (0 pts).'
  };

  // Calculate Total 0-100 Score
  const totalScore = Math.min(100, Math.max(0, Math.round(
    (resumeMetric.rawScore * 0.25) +
    (interviewMetric.rawScore * 0.25) +
    (applicationMetric.rawScore * 0.25) +
    (skillMetric.rawScore * 0.25)
  )));

  // Identify Primary Bottleneck (lowest raw score among categories)
  const categoriesList = [resumeMetric, interviewMetric, applicationMetric, skillMetric];
  const sortedByScore = [...categoriesList].sort((a, b) => a.rawScore - b.rawScore);
  const primaryBottleneckId = sortedByScore[0].id;

  // Determine Tier, Rating, and Honest Assessment
  let tier: CareerHealthScoreData['tier'] = 'Setup Stage';
  let ratingHeadline = 'Initial Setup Needed';
  let honestAssessment = '';

  if (totalScore >= 85) {
    tier = 'Elite Readiness';
    ratingHeadline = 'Top Decile Market Readiness';
    honestAssessment = 'Your candidate profile is operating with exceptional market strength across all 4 pillars. Your materials, pipeline, and interview prep are well-aligned. Focus on closing your single remaining bottleneck to convert pipeline momentum into competitive offer leverage.';
  } else if (totalScore >= 70) {
    tier = 'Competitive Candidate';
    ratingHeadline = 'Strong Market Positioning';
    honestAssessment = 'Solid market positioning with active data across your core pipeline. Your foundation is healthy; execute the specific category improvement actions below to raise conversion at each funnel stage.';
  } else if (totalScore >= 40) {
    tier = 'Developing Foundation';
    ratingHeadline = 'Building Search Velocity';
    honestAssessment = 'Developing foundation with noticeable upside. You have active progress in key areas, but uninitialized or lagging pillars are holding back your aggregate score. Address your primary bottleneck below to accelerate interview yield.';
  } else {
    tier = 'Setup Stage';
    ratingHeadline = 'Early Pipeline Activation Stage';
    honestAssessment = 'Your career terminal is currently in the setup phase. Uninitialized modules are capping your overall health score at zero. Complete the onboarding steps below to establish your hiring baseline.';
  }

  return {
    totalScore,
    tier,
    ratingHeadline,
    honestAssessment,
    primaryBottleneckId,
    categories: {
      resume: resumeMetric,
      interview: interviewMetric,
      application: applicationMetric,
      skills: skillMetric,
    },
    categoriesList,
  };
}
