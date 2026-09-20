var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/_lib/ocr.ts
var ocr_exports = {};
__export(ocr_exports, {
  handleOcrRequest: () => handleOcrRequest,
  reconstructPageText: () => reconstructPageText
});
async function getWorker() {
  if (cachedWorker) return cachedWorker;
  if (!workerInitPromise) {
    workerInitPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      cachedWorker = worker;
      return worker;
    })().catch((err) => {
      workerInitPromise = null;
      cachedWorker = null;
      throw err;
    });
  }
  return await workerInitPromise;
}
function reconstructPageText(data) {
  const rawText = typeof data.text === "string" ? data.text : "";
  let words = Array.isArray(data.words) ? data.words : [];
  if (words.length === 0 && Array.isArray(data.blocks)) {
    for (const block of data.blocks) {
      if (!block || !Array.isArray(block.paragraphs)) continue;
      for (const para of block.paragraphs) {
        if (!para || !Array.isArray(para.lines)) continue;
        for (const line of para.lines) {
          if (!line || !Array.isArray(line.words)) continue;
          for (const w of line.words) {
            if (w && typeof w.text === "string" && w.bbox) {
              words.push({
                text: w.text,
                bbox: w.bbox,
                confidence: w.confidence
              });
            }
          }
        }
      }
    }
  }
  if (words.length < 15) {
    return cleanOcrText(rawText);
  }
  let maxX = 0;
  let maxY = 0;
  for (const w of words) {
    if (w.bbox) {
      if (w.bbox.x1 > maxX) maxX = w.bbox.x1;
      if (w.bbox.y1 > maxY) maxY = w.bbox.y1;
    }
  }
  const pageWidth = maxX > 0 ? maxX : 1e3;
  const pageHeight = maxY > 0 ? maxY : 1400;
  const minSplitX = Math.round(pageWidth * 0.25);
  const maxSplitX = Math.round(pageWidth * 0.6);
  const step = Math.max(3, Math.round(pageWidth * 0.01));
  let bestSplitX = -1;
  let minCrossing = Infinity;
  let bestLeftCount = 0;
  let bestRightCount = 0;
  for (let x = minSplitX; x <= maxSplitX; x += step) {
    let crossing = 0;
    let leftCount = 0;
    let rightCount = 0;
    for (const w of words) {
      if (!w.bbox || !w.text || !w.text.trim()) continue;
      if (w.bbox.y0 < pageHeight * 0.08) continue;
      if (w.bbox.x0 < x - 5 && w.bbox.x1 > x + 5) {
        crossing++;
      } else if (w.bbox.x1 <= x + 5) {
        leftCount++;
      } else if (w.bbox.x0 >= x - 5) {
        rightCount++;
      }
    }
    if (leftCount >= 8 && rightCount >= 12) {
      if (crossing < minCrossing) {
        minCrossing = crossing;
        bestSplitX = x;
        bestLeftCount = leftCount;
        bestRightCount = rightCount;
      }
    }
  }
  const totalBodyWords = bestLeftCount + bestRightCount + minCrossing;
  const isTwoColumn = bestSplitX > 0 && (minCrossing <= 4 || minCrossing / Math.max(1, totalBodyWords) < 0.05);
  if (!isTwoColumn) {
    return cleanOcrText(rawText);
  }
  let columnTopY = 0;
  const yStep = Math.max(10, Math.round(pageHeight * 0.02));
  for (let y = 0; y < pageHeight * 0.45; y += yStep) {
    const rowWords = words.filter((w) => w.bbox && w.bbox.y0 <= y + yStep && w.bbox.y1 >= y);
    const hasLeft = rowWords.some((w) => w.bbox.x1 <= bestSplitX);
    const hasRight = rowWords.some((w) => w.bbox.x0 >= bestSplitX);
    if (hasLeft && hasRight) {
      columnTopY = y;
      break;
    }
  }
  const headerWords = words.filter((w) => w.bbox && w.bbox.y1 <= columnTopY + 5);
  const leftWords = words.filter((w) => w.bbox && w.bbox.y1 > columnTopY + 5 && w.bbox.x1 <= bestSplitX + 12);
  const rightWords = words.filter((w) => w.bbox && w.bbox.y1 > columnTopY + 5 && w.bbox.x0 >= bestSplitX - 12);
  const headerText = assembleWordsIntoLines(headerWords);
  const leftText = assembleWordsIntoLines(leftWords);
  const rightText = assembleWordsIntoLines(rightWords);
  const sections = [];
  if (headerText) sections.push(headerText);
  if (leftText) sections.push(`=== CORE SKILLS & BACKGROUND ===
${leftText}`);
  if (rightText) sections.push(`=== EXPERIENCE & ACHIEVEMENTS ===
${rightText}`);
  return sections.join("\n\n");
}
function assembleWordsIntoLines(wordList) {
  if (!wordList || wordList.length === 0) return "";
  const sorted = [...wordList].sort((a, b) => {
    const yCenterA = (a.bbox.y0 + a.bbox.y1) / 2;
    const yCenterB = (b.bbox.y0 + b.bbox.y1) / 2;
    const yDiff = yCenterA - yCenterB;
    if (Math.abs(yDiff) > 8) {
      return yDiff;
    }
    return a.bbox.x0 - b.bbox.x0;
  });
  const lines = [];
  let currentLine = [];
  let lastY = -1;
  for (const w of sorted) {
    const cleanWord = (w.text || "").trim();
    if (!cleanWord) continue;
    const yCenter = (w.bbox.y0 + w.bbox.y1) / 2;
    if (lastY === -1 || Math.abs(yCenter - lastY) <= 8) {
      currentLine.push(cleanWord);
      lastY = yCenter;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine.join(" "));
      }
      currentLine = [cleanWord];
      lastY = yCenter;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine.join(" "));
  }
  return cleanOcrText(lines.join("\n"));
}
function cleanOcrText(text) {
  if (!text) return "";
  return text.split("\n").map((line) => line.trim()).filter((line) => {
    if (!line) return false;
    if (line.length <= 2 && /^[^a-zA-Z0-9]+$/.test(line)) return false;
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function handleOcrRequest(req, res) {
  const startTime = Date.now();
  try {
    const { images, pdfBase64, meta } = req.body;
    if (pdfBase64 && typeof pdfBase64 === "string") {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const commaIdx = pdfBase64.indexOf(",");
        const rawBase64 = commaIdx !== -1 ? pdfBase64.slice(commaIdx + 1) : pdfBase64;
        const pdfBuffer = Buffer.from(rawBase64.replace(/\s+/g, ""), "base64");
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(pdfBuffer),
          useSystemFonts: true,
          disableFontFace: true
        });
        const pdf = await loadingTask.promise;
        let extractedText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.filter((item) => item && typeof item.str === "string").map((item) => item.str).join(" ");
          if (pageText.trim()) {
            extractedText += pageText.trim() + "\n\n";
          }
        }
        const trimmed = extractedText.trim();
        const durationMs = Date.now() - startTime;
        console.log(`[AI HireFlow][Server PDF] Extracted text: pages=${pdf.numPages}, duration=${durationMs}ms, charCount=${trimmed.length}`);
        if (trimmed.length >= 40) {
          return res.json({
            success: true,
            text: trimmed,
            pageCount: pdf.numPages,
            durationMs,
            charCount: trimmed.length,
            method: "server_pdf"
          });
        }
      } catch (pdfErr) {
        console.warn("[AI HireFlow][Server PDF] Server direct PDF extraction failed, proceeding to image OCR if available:", pdfErr.message || pdfErr);
      }
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "images" or "pdfBase64" in request body' });
    }
    const fileType = meta?.fileType || "pdf";
    const pageCount = images.length;
    const worker = await getWorker();
    const pageResults = [];
    for (let i = 0; i < images.length; i++) {
      const imgData = images[i];
      if (typeof imgData !== "string" || !imgData.trim()) continue;
      let imageTarget = imgData;
      if (imgData.startsWith("data:")) {
        const commaIdx = imgData.indexOf(",");
        if (commaIdx !== -1) {
          const rawBase64 = imgData.slice(commaIdx + 1).replace(/\s+/g, "");
          imageTarget = Buffer.from(rawBase64, "base64");
        }
      }
      const ocrResult = await worker.recognize(imageTarget);
      const reconstructed = reconstructPageText(ocrResult.data);
      if (reconstructed && reconstructed.trim()) {
        pageResults.push(reconstructed.trim());
      }
    }
    const ocrDuration = Date.now() - startTime;
    const combinedText = pageResults.join("\n\n--- Page Break ---\n\n").trim();
    const finalCharCount = combinedText.length;
    console.log(`[AI HireFlow][OCR] Completed OCR: fileType=${fileType}, pages=${pageCount}, ocrDuration=${ocrDuration}ms, finalCharCount=${finalCharCount}, success=${finalCharCount > 30}`);
    if (!combinedText || finalCharCount < 20) {
      return res.status(422).json({
        error: "Could not extract readable text from this resume.",
        code: "OCR_EMPTY_TEXT"
      });
    }
    return res.json({
      success: true,
      text: combinedText,
      pageCount,
      durationMs: ocrDuration,
      charCount: finalCharCount
    });
  } catch (err) {
    const ocrDuration = Date.now() - startTime;
    console.error(`[AI HireFlow][OCR] Error during OCR processing (${ocrDuration}ms):`, err.message || err);
    return res.status(500).json({
      error: "Could not extract readable text from this resume.",
      code: "OCR_EXECUTION_ERROR"
    });
  }
}
var cachedWorker, workerInitPromise;
var init_ocr = __esm({
  "api/_lib/ocr.ts"() {
    cachedWorker = null;
    workerInitPromise = null;
  }
});

// api/_index.ts
import express from "express";
import "dotenv/config";
import cors from "cors";

// api/_lib/subscriptionEnforcement.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";

// api/_lib/subscriptionPlans.ts
var SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    tagline: "For exploring AI HireFlow",
    price: { INR: 0, USD: 0 },
    priceFormatted: { INR: "\u20B90", USD: "$0" },
    period: "/month",
    dailyCredits: 150,
    monthlyCredits: 150,
    limits: {
      jobSearches: { limit: 10, period: "day", display: "10 Job Searches/day" },
      atsAnalyses: { limit: 5, period: "week", display: "5 ATS Analyses/week" },
      interviewLabs: { limit: 3, period: "week", display: "3 Interview Labs/week" },
      jobsTracked: { limit: 10, period: "month", display: "10 new jobs tracked/month" },
      resumeEdits: { limit: 2, period: "month", display: "2 Resume Edits/month" },
      careerAdvisor: { limit: 5, period: "day", display: "5 Career Advisor chats/day" }
    },
    bulletFeatures: [
      "150 AI Credits/day",
      "10 Job Searches/day",
      "5 ATS Analyses/week",
      "3 Interview Labs/week",
      "10 new jobs tracked/month",
      "2 Resume Edits/month",
      "5 Career Advisor chats/day",
      "Earn additional credits through daily login, referrals, achievements, onboarding and campaigns"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    badge: "RECOMMENDED",
    tagline: "For students & casual job seekers",
    price: { INR: 149, USD: 2 },
    priceFormatted: { INR: "\u20B9149", USD: "$2" },
    period: "/month",
    dailyCredits: 500,
    monthlyCredits: 500,
    recommended: true,
    limits: {
      jobSearches: { limit: 30, period: "day", display: "30 Job Searches/day" },
      atsAnalyses: { limit: 20, period: "month", display: "20 ATS Analyses/month" },
      interviewLabs: { limit: 15, period: "month", display: "15 Interview Labs/month" },
      jobsTracked: { limit: 75, period: "month", display: "75 new jobs tracked/month" },
      resumeEdits: { limit: 10, period: "month", display: "10 Resume Edits/month" },
      careerAdvisor: { limit: 30, period: "day", display: "30 Career Advisor chats/day" }
    },
    bulletFeatures: [
      "500 AI Credits/day",
      "30 Job Searches/day",
      "20 ATS Analyses/month",
      "15 Interview Labs/month",
      "75 new jobs tracked/month",
      "10 Resume Edits/month",
      "30 Career Advisor chats/day"
    ]
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "For active job seekers",
    price: { INR: 249, USD: 4 },
    priceFormatted: { INR: "\u20B9249", USD: "$4" },
    period: "/month",
    dailyCredits: 800,
    monthlyCredits: 800,
    limits: {
      jobSearches: { limit: 999999, period: "unlimited", display: "High/Unlimited Job Searches*" },
      atsAnalyses: { limit: 50, period: "month", display: "50 ATS Analyses/month" },
      interviewLabs: { limit: 30, period: "month", display: "30 Interview Labs/month" },
      jobsTracked: { limit: 999999, period: "unlimited", display: "Unlimited Job Tracker" },
      resumeEdits: { limit: 25, period: "month", display: "25 Resume Edits/month" },
      careerAdvisor: { limit: 999999, period: "unlimited", display: "High Career Advisor usage" }
    },
    bulletFeatures: [
      "800 AI Credits/day",
      "High/Unlimited Job Searches*",
      "50 ATS Analyses/month",
      "30 Interview Labs/month",
      "Unlimited Job Tracker",
      "25 Resume Edits/month",
      "High Career Advisor usage"
    ],
    disclaimer: "*Fair-use limits may apply"
  }
};
var ADMIN_PLAN_LIMITS = {
  dailyCredits: Infinity,
  monthlyCredits: Infinity,
  limits: {
    jobSearches: { limit: Infinity, period: "unlimited", display: "Unlimited Job Searches" },
    atsAnalyses: { limit: Infinity, period: "unlimited", display: "Unlimited ATS Analyses" },
    interviewLabs: { limit: Infinity, period: "unlimited", display: "Unlimited Interview Labs" },
    jobsTracked: { limit: Infinity, period: "unlimited", display: "Unlimited Job Tracker" },
    resumeEdits: { limit: Infinity, period: "unlimited", display: "Unlimited Resume Edits" },
    careerAdvisor: { limit: Infinity, period: "unlimited", display: "Unlimited Career Advisor usage" }
  },
  bulletFeatures: [
    "Unlimited AI Credits",
    "Unlimited feature usage",
    "No subscription limits"
  ]
};
var PLAN_DAILY_CREDITS = {
  free: 150,
  pro: 500,
  standard: 500,
  premium: 800,
  admin: 999999
};
function normalizePlanTier(plan) {
  if (!plan) return "free";
  const clean = plan.toLowerCase().trim();
  if (clean === "admin") return "admin";
  if (clean === "premium") return "premium";
  if (clean === "pro" || clean === "standard") return "pro";
  return "free";
}
function getPlanDefinition(planTier) {
  const norm = normalizePlanTier(planTier);
  if (norm === "admin") {
    return {
      id: "free",
      name: "Admin Master",
      tagline: "Full administrative access",
      price: { INR: 0, USD: 0 },
      priceFormatted: { INR: "\u20B90", USD: "$0" },
      period: "/unlimited",
      dailyCredits: 999999,
      monthlyCredits: 999999,
      limits: {
        jobSearches: { limit: 999999, period: "unlimited", display: "Unlimited" },
        atsAnalyses: { limit: 999999, period: "unlimited", display: "Unlimited" },
        interviewLabs: { limit: 999999, period: "unlimited", display: "Unlimited" },
        jobsTracked: { limit: 999999, period: "unlimited", display: "Unlimited" },
        resumeEdits: { limit: 999999, period: "unlimited", display: "Unlimited" },
        careerAdvisor: { limit: 999999, period: "unlimited", display: "Unlimited" }
      },
      bulletFeatures: ADMIN_PLAN_LIMITS.bulletFeatures
    };
  }
  return SUBSCRIPTION_PLANS[norm];
}
function getISOWeekString(d = /* @__PURE__ */ new Date()) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 864e5 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
function getMonthString(d = /* @__PURE__ */ new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getDayString(d = /* @__PURE__ */ new Date()) {
  return d.toISOString().split("T")[0];
}

// api/_lib/subscriptionEnforcement.ts
import fs from "fs";
import path from "path";
var db = null;
function getServerFirestore() {
  if (db) return db;
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const app2 = getApps().length > 0 ? getApp() : initializeApp(config);
      db = getFirestore(app2, config.firestoreDatabaseId);
      console.log("[SubscriptionEnforcement] Server Firestore initialized with database:", config.firestoreDatabaseId);
      return db;
    }
  } catch (err) {
    console.warn("[SubscriptionEnforcement] Could not initialize server Firestore:", err.message);
  }
  return null;
}
var ACTION_CREDIT_COSTS = {
  resumeScan: 20,
  resume_scan: 20,
  ats_analysis: 20,
  atsAnalysis: 20,
  atsOptimization: 25,
  ats_optimization: 25,
  resumeRewrite: 30,
  resume_rewrite: 30,
  coverLetter: 15,
  cover_letter: 15,
  interviewSession: 25,
  interview_session: 25,
  interviewLab: 25,
  jobMatchAnalysis: 5,
  job_match: 5,
  careerRoadmap: 50,
  career_roadmap: 50,
  linkedinReview: 20,
  portfolioReview: 30,
  careerCoachChat: 5,
  careerAdvisor: 5,
  coach: 5,
  general: 5
};
async function enforceSubscriptionAndCredits({
  userId,
  userEmail,
  operation,
  overrideCost
}) {
  const normalizedOp = operation ? operation.trim() : "general";
  const requiredCredits = typeof overrideCost === "number" ? overrideCost : ACTION_CREDIT_COSTS[normalizedOp] ?? 5;
  const isAdminEmail = userEmail?.toLowerCase() === "rrachitkhandelwal8@gmail.com";
  if (isAdminEmail) {
    return {
      allowed: true,
      plan: "admin",
      remainingCredits: 999999
    };
  }
  if (!userId) {
    return {
      allowed: false,
      status: 401,
      code: "AUTH_REQUIRED",
      error: "Authentication required. Please sign in to access AI HireFlow features."
    };
  }
  const firestore = getServerFirestore();
  if (!firestore) {
    console.warn("[SubscriptionEnforcement] Firestore unavailable on server, allowing with fallback.");
    return { allowed: true, plan: "free", remainingCredits: 150 };
  }
  try {
    const userRef = doc(firestore, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return {
        allowed: false,
        status: 404,
        code: "USER_NOT_FOUND",
        error: "User profile not found. Please log in again."
      };
    }
    const userData = userSnap.data();
    const planTier = normalizePlanTier(userData.plan);
    if (planTier === "admin" || userData.isAdmin) {
      return {
        allowed: true,
        plan: "admin",
        remainingCredits: 999999
      };
    }
    const planDef = getPlanDefinition(planTier);
    const now = /* @__PURE__ */ new Date();
    const currentDayStr = getDayString(now);
    const currentWeekStr = getISOWeekString(now);
    const currentMonthStr = getMonthString(now);
    let wallet = userData.creditWallet || {
      balance: PLAN_DAILY_CREDITS[planTier],
      subscriptionCredits: PLAN_DAILY_CREDITS[planTier],
      topupCredits: 0,
      usedThisMonth: 0,
      usedToday: 0,
      lastDailyGrant: currentDayStr
    };
    let usage = userData.subscriptionUsage || {
      dailyDate: currentDayStr,
      jobSearchesDaily: 0,
      careerAdvisorDaily: 0,
      weekId: currentWeekStr,
      atsAnalysesWeekly: 0,
      interviewLabsWeekly: 0,
      monthId: currentMonthStr,
      atsAnalysesMonthly: 0,
      interviewLabsMonthly: 0,
      jobsTrackedMonthly: 0,
      resumeEditsMonthly: 0
    };
    const isNewDay = !wallet.lastDailyGrant || wallet.lastDailyGrant !== currentDayStr;
    if (isNewDay) {
      const targetDailyCredits = PLAN_DAILY_CREDITS[planTier];
      const existingTopup = wallet.topupCredits ?? Math.max(0, (wallet.balance || 0) - (wallet.subscriptionCredits || 0));
      wallet.subscriptionCredits = targetDailyCredits;
      wallet.topupCredits = existingTopup;
      wallet.balance = targetDailyCredits + existingTopup;
      wallet.lastDailyGrant = currentDayStr;
      wallet.usedToday = 0;
      usage.dailyDate = currentDayStr;
      usage.jobSearchesDaily = 0;
      usage.careerAdvisorDaily = 0;
      if (usage.weekId !== currentWeekStr) {
        usage.weekId = currentWeekStr;
        usage.atsAnalysesWeekly = 0;
        usage.interviewLabsWeekly = 0;
      }
      if (usage.monthId !== currentMonthStr) {
        usage.monthId = currentMonthStr;
        usage.atsAnalysesMonthly = 0;
        usage.interviewLabsMonthly = 0;
        usage.jobsTrackedMonthly = 0;
        usage.resumeEditsMonthly = 0;
      }
    }
    const isAdvisor = normalizedOp.includes("coach") || normalizedOp.includes("advisor") || normalizedOp === "careerAdvisor";
    const isAts = normalizedOp.includes("ats") || normalizedOp.includes("scan") || normalizedOp.includes("analysis");
    const isInterview = normalizedOp.includes("interview");
    const isEdit = normalizedOp.includes("rewrite") || normalizedOp.includes("edit");
    if (isAdvisor && planDef.limits.careerAdvisor.period !== "unlimited") {
      const dailyUsed = usage.dailyDate === currentDayStr ? usage.careerAdvisorDaily || 0 : 0;
      if (dailyUsed >= planDef.limits.careerAdvisor.limit) {
        return {
          allowed: false,
          status: 403,
          code: "FEATURE_LIMIT_EXCEEDED",
          error: `Daily Career Advisor limit reached (${planDef.limits.careerAdvisor.display} on ${planDef.name}). Upgrade your plan for higher usage.`
        };
      }
    }
    if (isAts && planDef.limits.atsAnalyses.period !== "unlimited") {
      const isWeekly = planDef.limits.atsAnalyses.period === "week";
      const used = isWeekly ? usage.weekId === currentWeekStr ? usage.atsAnalysesWeekly || 0 : 0 : usage.monthId === currentMonthStr ? usage.atsAnalysesMonthly || 0 : 0;
      if (used >= planDef.limits.atsAnalyses.limit) {
        return {
          allowed: false,
          status: 403,
          code: "FEATURE_LIMIT_EXCEEDED",
          error: `${isWeekly ? "Weekly" : "Monthly"} ATS Analysis limit reached (${planDef.limits.atsAnalyses.display} on ${planDef.name}). Upgrade your plan to analyze more resumes.`
        };
      }
    }
    if (isInterview && planDef.limits.interviewLabs.period !== "unlimited") {
      const isWeekly = planDef.limits.interviewLabs.period === "week";
      const used = isWeekly ? usage.weekId === currentWeekStr ? usage.interviewLabsWeekly || 0 : 0 : usage.monthId === currentMonthStr ? usage.interviewLabsMonthly || 0 : 0;
      if (used >= planDef.limits.interviewLabs.limit) {
        return {
          allowed: false,
          status: 403,
          code: "FEATURE_LIMIT_EXCEEDED",
          error: `${isWeekly ? "Weekly" : "Monthly"} Interview Lab limit reached (${planDef.limits.interviewLabs.display} on ${planDef.name}). Upgrade your plan for more sessions.`
        };
      }
    }
    if (isEdit && planDef.limits.resumeEdits.period !== "unlimited") {
      const used = usage.monthId === currentMonthStr ? usage.resumeEditsMonthly || 0 : 0;
      if (used >= planDef.limits.resumeEdits.limit) {
        return {
          allowed: false,
          status: 403,
          code: "FEATURE_LIMIT_EXCEEDED",
          error: `Monthly Resume Edit limit reached (${planDef.limits.resumeEdits.display} on ${planDef.name}). Upgrade your plan for more edits.`
        };
      }
    }
    const currentBalance = wallet.balance || 0;
    if (currentBalance < requiredCredits) {
      return {
        allowed: false,
        status: 402,
        code: "INSUFFICIENT_CREDITS",
        error: `Insufficient AI credits. This action requires ${requiredCredits} credits, but you have ${currentBalance} available. Please upgrade or top up.`,
        requiredCredits,
        balance: currentBalance
      };
    }
    let subCredits = wallet.subscriptionCredits ?? currentBalance;
    let topupCredits = wallet.topupCredits ?? 0;
    if (subCredits >= requiredCredits) {
      subCredits -= requiredCredits;
    } else {
      const remainder = requiredCredits - subCredits;
      subCredits = 0;
      topupCredits = Math.max(0, topupCredits - remainder);
    }
    wallet.subscriptionCredits = subCredits;
    wallet.topupCredits = topupCredits;
    wallet.balance = subCredits + topupCredits;
    wallet.usedToday = (wallet.usedToday || 0) + requiredCredits;
    wallet.usedThisMonth = (wallet.usedThisMonth || 0) + requiredCredits;
    if (isAdvisor) usage.careerAdvisorDaily = (usage.careerAdvisorDaily || 0) + 1;
    if (isAts) {
      usage.atsAnalysesWeekly = (usage.atsAnalysesWeekly || 0) + 1;
      usage.atsAnalysesMonthly = (usage.atsAnalysesMonthly || 0) + 1;
    }
    if (isInterview) {
      usage.interviewLabsWeekly = (usage.interviewLabsWeekly || 0) + 1;
      usage.interviewLabsMonthly = (usage.interviewLabsMonthly || 0) + 1;
    }
    if (isEdit) usage.resumeEditsMonthly = (usage.resumeEditsMonthly || 0) + 1;
    await updateDoc(userRef, {
      creditWallet: wallet,
      subscriptionUsage: usage
    });
    await addDoc(collection(firestore, "users", userId, "transactions"), {
      amount: -requiredCredits,
      type: "spend",
      label: `Backend Execution: ${normalizedOp}`,
      timestamp: now.toISOString()
    }).catch(() => {
    });
    console.log(`[SubscriptionEnforcement] User ${userId} [${planTier}] spent ${requiredCredits} credits for ${normalizedOp}. Remaining: ${wallet.balance}`);
    return {
      allowed: true,
      plan: planTier,
      remainingCredits: wallet.balance
    };
  } catch (err) {
    console.error("[SubscriptionEnforcement] Error verifying user credits:", err);
    return {
      allowed: true,
      plan: "free",
      remainingCredits: 0
    };
  }
}

// api/_lib/creditPacks.ts
var CREDIT_PACKS = [
  {
    id: "pack_mini",
    name: "MINI",
    credits: 100,
    price: { INR: 49, USD: 1 },
    priceFormatted: { INR: "\u20B949", USD: "$1" },
    discount: "Quick Boost",
    badge: "MINI",
    idealFor: "For a few extra AI actions.",
    description: "For a few extra AI actions."
  },
  {
    id: "pack_boost",
    name: "BOOST",
    credits: 300,
    price: { INR: 99, USD: 2 },
    priceFormatted: { INR: "\u20B999", USD: "$2" },
    discount: "Popular",
    badge: "BOOST",
    idealFor: "For actively applying.",
    description: "For actively applying."
  },
  {
    id: "pack_job_hunt",
    name: "JOB HUNT",
    credits: 750,
    price: { INR: 199, USD: 3 },
    priceFormatted: { INR: "\u20B9199", USD: "$3" },
    discount: "Best Value",
    badge: "JOB HUNT",
    recommended: true,
    idealFor: "For serious job hunting.",
    description: "For serious job hunting."
  },
  {
    id: "pack_career",
    name: "CAREER PACK",
    credits: 2e3,
    price: { INR: 399, USD: 5 },
    priceFormatted: { INR: "\u20B9399", USD: "$5" },
    discount: "Maximum Value",
    badge: "CAREER PACK",
    idealFor: "For major placement/job searches.",
    description: "For major placement/job searches."
  }
];
function getCreditPackById(idOrName) {
  if (!idOrName) return void 0;
  const clean = idOrName.toLowerCase().trim();
  return CREDIT_PACKS.find(
    (p) => p.id === clean || p.name.toLowerCase() === clean || clean.includes(p.id) || clean.includes("mini") && p.credits === 100 || clean.includes("boost") && p.credits === 300 || clean.includes("hunt") && p.credits === 750 || clean.includes("career") && p.credits === 2e3 || clean === "pack_100" && p.credits === 100 || clean === "pack_300" && p.credits === 300 || clean === "pack_750" && p.credits === 750 || clean === "pack_2000" && p.credits === 2e3
  );
}

// api/_index.ts
process.on("unhandledRejection", (reason) => {
  console.error("[AI HireFlow] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[AI HireFlow] Uncaught Exception:", err);
});
console.log(`[AI HireFlow] Serverless runtime initialized: node=${process.version}, platform=${process.platform}, velonaConfigured=${!!(process.env.VELONA_API_KEY || process.env.VELONA_KEY || process.env.VELONA_AUTH_TOKEN || process.env.Z_AI_API_KEY)}`);
var maxDuration = 60;
var app = express();
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user-email"],
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    node: process.version,
    velonaConfigured: !!(process.env.VELONA_API_KEY || process.env.VELONA_KEY || process.env.VELONA_AUTH_TOKEN || process.env.Z_AI_API_KEY),
    velonaModel: getVelonaModel()
  });
});
app.post(["/api/coach", "/coach"], (req, res) => {
  res.json({ status: "active", message: "AI Coach endpoint ready" });
});
var VELONA_BASE_URL = "https://velona.in/v1";
function getVelonaModel() {
  const envModel = (process.env.VELONA_MODEL || "").trim();
  const sanitized = envModel.replace(/^["']|["']$/g, "").trim();
  return sanitized || "z-ai/glm-5.3-flash";
}
var VELONA_MODEL_ID = getVelonaModel();
function getVelonaApiKey() {
  const raw = (process.env.VELONA_API_KEY || process.env.VELONA_KEY || process.env.VELONA_AUTH_TOKEN || process.env.Z_AI_API_KEY || "").trim();
  const sanitized = raw.replace(/^["']|["']$/g, "").trim();
  return sanitized || void 0;
}
function sanitizeSafeErrorMessage(rawMessage) {
  if (!rawMessage) return "An unexpected error occurred during AI generation.";
  const str = typeof rawMessage === "string" ? rawMessage : rawMessage.message || String(rawMessage);
  let safe = str.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]").replace(/[a-zA-Z0-9_\-]{32,}/g, "[REDACTED_KEY]").replace(/\s+/g, " ").trim();
  if (safe.length > 250) {
    safe = safe.slice(0, 250) + "...";
  }
  return safe || "An unexpected error occurred during AI generation.";
}
async function callVelonaChatCompletion({
  messages,
  temperature = 0.7,
  jsonMode = false,
  maxTokens,
  requestId,
  operation = "general",
  meta
}) {
  const apiKey = getVelonaApiKey();
  const modelId = getVelonaModel();
  if (!apiKey) {
    const error = new Error("VELONA_API_KEY is not configured in server environment.");
    error.status = 500;
    error.code = "MISSING_API_KEY";
    throw error;
  }
  let formattedMessages = [];
  if (Array.isArray(messages)) {
    formattedMessages = messages.filter((m) => m && typeof m === "object" && typeof m.content === "string" && m.content.trim().length > 0).map((m) => ({
      role: m.role === "assistant" || m.role === "system" ? m.role : "user",
      content: m.content.trim()
    }));
  }
  if (formattedMessages.length === 0) {
    formattedMessages = [{ role: "user", content: "Hello" }];
  }
  if (jsonMode) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg && lastMsg.role === "user" && !lastMsg.content.includes("JSON")) {
      formattedMessages[formattedMessages.length - 1] = {
        ...lastMsg,
        content: `${lastMsg.content}

IMPORTANT: Output valid, parseable raw JSON only without markdown fences or extraneous text.`
      };
    }
  }
  const safeMaxTokens = maxTokens ? Math.min(Math.max(500, maxTokens), 4096) : 3200;
  const safeTemperature = typeof temperature === "number" && !isNaN(temperature) ? Math.max(0.1, Math.min(1, temperature)) : 0.7;
  const velonaStart = Date.now();
  const isJob = (operation || "").includes("job");
  const maxRetries = 1;
  const maxTotalBudgetMs = isJob ? 18e4 : 55e3;
  const perAttemptTimeoutMs = isJob ? 11e4 : 48e3;
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0 && Date.now() - velonaStart > maxTotalBudgetMs - 15e3) {
      break;
    }
    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    let currentMessages = formattedMessages;
    if (attempt > 0) {
      const systemParts = formattedMessages.filter((m) => m.role === "system").map((m) => m.content);
      const nonSystemParts = formattedMessages.filter((m) => m.role !== "system");
      if (systemParts.length > 0 && nonSystemParts.length > 0) {
        const mergedSystem = systemParts.join("\n\n");
        const firstUser = nonSystemParts[0];
        currentMessages = [
          {
            role: "user",
            content: `[System Instructions: ${mergedSystem}]

${firstUser.content}`
          },
          ...nonSystemParts.slice(1)
        ];
      }
    }
    const payload = {
      model: modelId,
      messages: currentMessages,
      temperature: safeTemperature,
      stream: false,
      max_tokens: safeMaxTokens,
      enable_thinking: false
    };
    try {
      if (attempt > 0) {
        const backoffMs = Math.min(2e3, 400 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
      const response = await fetch(`${VELONA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "AI-HireFlow/2.0"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorBody = await response.text();
          try {
            const errJson = JSON.parse(errorBody);
            errorDetails = errJson.error?.message || errJson.message || errorBody;
          } catch {
            errorDetails = errorBody;
          }
        } catch {
          errorDetails = `HTTP status ${response.status}`;
        }
        const safeDetails = sanitizeSafeErrorMessage(errorDetails);
        const isTransient = [500, 502, 503, 504].includes(response.status);
        const err = new Error(safeDetails || `Velona API responded with HTTP status ${response.status}`);
        err.status = response.status;
        err.velonaStatus = response.status;
        if (response.status === 401) {
          err.code = "INVALID_API_KEY";
          err.message = `Velona Authentication Failed: Invalid or expired API key. (${safeDetails})`;
          throw err;
        } else if (response.status === 402 || response.status === 429) {
          err.code = "INSUFFICIENT_BALANCE_OR_RATE_LIMIT";
          err.message = `Velona Quota/Balance Error: ${safeDetails || "Insufficient prepaid balance or rate limit exceeded."}`;
          throw err;
        } else {
          err.code = "VELONA_API_ERROR";
        }
        if (isTransient && attempt < maxRetries && Date.now() - velonaStart < maxTotalBudgetMs - 15e3) {
          lastError = err;
          continue;
        }
        throw err;
      }
      let rawText = "";
      try {
        rawText = await response.text();
      } catch (readErr) {
        const err = new Error("Failed to read response body from AI service.");
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = "NETWORK_ERROR";
        throw err;
      }
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        const err = new Error("Velona API returned a non-JSON response.");
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = "INVALID_UPSTREAM_RESPONSE";
        throw err;
      }
      if (!data || typeof data !== "object") {
        const err = new Error("Velona API returned an invalid response structure.");
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = "INVALID_UPSTREAM_RESPONSE";
        throw err;
      }
      if (data.error) {
        const errMsg = sanitizeSafeErrorMessage(typeof data.error === "string" ? data.error : data.error.message || "Velona API error");
        const err = new Error(errMsg);
        err.status = data.error.code === "invalid_api_key" ? 401 : 502;
        err.velonaStatus = response.status;
        err.code = data.error.code || "VELONA_API_ERROR";
        throw err;
      }
      const choice = data.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string") {
        const err = new Error("Velona API response did not contain completion content.");
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = "MALFORMED_UPSTREAM_RESPONSE";
        throw err;
      }
      const finishReason = choice?.finish_reason || "stop";
      const totalElapsed2 = Date.now() - velonaStart;
      console.log(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=200, model=${modelId}, duration_ms=${totalElapsed2}, velona_status=${response.status}, error_category=none, message=ok`);
      let cleanText = content;
      if (jsonMode && typeof cleanText === "string") {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      }
      return {
        text: cleanText,
        rawText: content,
        finishReason,
        isTruncated: finishReason === "length",
        model: data.model || modelId,
        provider: "velona",
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: {
          velonaDurationMs: totalElapsed2
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        lastError = new Error(isJob ? "Analysis is taking longer than expected. Please retry in a moment." : "AI request timed out. Please try again.");
        lastError.status = 504;
        lastError.velonaStatus = 504;
        lastError.code = "TIMEOUT";
        break;
      } else {
        lastError = err;
      }
      const timeRemaining = maxTotalBudgetMs - (Date.now() - velonaStart);
      if (attempt < maxRetries && timeRemaining > 2e4 && (err.name === "FetchError" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT")) {
        continue;
      }
      break;
    }
  }
  const totalElapsed = Date.now() - velonaStart;
  const safeMessage = sanitizeSafeErrorMessage(lastError?.message || "Velona API request failed.");
  const errorCategory = lastError?.code || "AI_GENERATION_FAILED";
  const velonaStatus = lastError?.velonaStatus || lastError?.status || 500;
  console.error(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=${lastError?.status || 500}, model=${modelId}, duration_ms=${totalElapsed}, velona_status=${velonaStatus}, error_category=${errorCategory}, message=${safeMessage}`);
  throw lastError || new Error("Velona API request failed after retries.");
}
app.get(["/api/ai/providers", "/ai/providers"], (req, res) => {
  const velonaKey = getVelonaApiKey();
  const currentModel = getVelonaModel();
  res.json({
    providers: [
      {
        id: "velona",
        name: "Velona (GLM 5.3 Flash)",
        providerName: "Z.ai via Velona",
        model: currentModel,
        configured: !!velonaKey,
        isDefault: true,
        capabilities: ["structured_json", "openai_compatible", "fast_inference", "ats_scoring", "job_matching"],
        pricing: {
          input: "\u20B97.7090 / 1M tokens",
          output: "\u20B925.6960 / 1M tokens",
          context: "1311K"
        }
      }
    ],
    defaultProvider: "velona"
  });
});
app.post([
  "/api/velona/generate",
  "/api/velona/generate/",
  "/velona/generate",
  "/velona/generate/",
  "/api/ai/generate",
  "/api/ai/generate/",
  "/ai/generate",
  "/ai/generate/"
], async (req, res) => {
  const requestStart = Date.now();
  const modelId = getVelonaModel();
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      prompt,
      systemPrompt,
      messages: incomingMessages,
      temperature = 0.7,
      jsonMode = false,
      maxTokens,
      operation = "general",
      meta
    } = body;
    const effectiveUserId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : void 0;
    const effectiveUserEmail = typeof body.userEmail === "string" && body.userEmail.trim() ? body.userEmail.trim() : typeof req.headers["x-user-email"] === "string" ? req.headers["x-user-email"].trim() : void 0;
    if (effectiveUserId || effectiveUserEmail) {
      try {
        const enforcement = await enforceSubscriptionAndCredits({
          userId: effectiveUserId,
          userEmail: effectiveUserEmail,
          operation: typeof operation === "string" ? operation : "general"
        });
        if (!enforcement.allowed) {
          const duration = Date.now() - requestStart;
          const safeReason = sanitizeSafeErrorMessage(enforcement.error || "Access denied");
          console.warn(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=${enforcement.status || 403}, model=${modelId}, duration_ms=${duration}, velona_status=N/A, error_category=${enforcement.code || "ACCESS_DENIED"}, message=${safeReason}`);
          return res.status(enforcement.status || 403).json({
            error: safeReason,
            code: enforcement.code || "ACCESS_DENIED",
            requiredCredits: enforcement.requiredCredits,
            balance: enforcement.balance
          });
        }
      } catch (enfErr) {
        console.warn(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=200, model=${modelId}, duration_ms=${Date.now() - requestStart}, velona_status=N/A, error_category=ENFORCEMENT_FAILOPEN, message=Allowed with fallback`);
      }
    }
    const hasPrompt = typeof prompt === "string" && prompt.trim().length > 0;
    const hasMessages = Array.isArray(incomingMessages) && incomingMessages.length > 0 && incomingMessages.some((m) => m && typeof m.content === "string" && m.content.trim().length > 0);
    if (!hasPrompt && !hasMessages) {
      const duration = Date.now() - requestStart;
      console.warn(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=400, model=${modelId}, duration_ms=${duration}, velona_status=N/A, error_category=INVALID_REQUEST, message=Prompt string or messages array is required.`);
      return res.status(400).json({
        error: "Prompt string or messages array is required.",
        code: "INVALID_REQUEST"
      });
    }
    let messages = [];
    if (hasMessages) {
      messages = incomingMessages;
    } else {
      if (typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
        messages.push({ role: "system", content: systemPrompt.trim() });
      }
      messages.push({ role: "user", content: prompt.trim() });
    }
    const result = await callVelonaChatCompletion({
      messages,
      temperature,
      jsonMode: Boolean(jsonMode),
      maxTokens,
      operation: typeof operation === "string" ? operation : "general",
      meta
    });
    const totalDuration = Date.now() - requestStart;
    return res.status(200).json({
      ...result,
      timing: {
        ...result.timing,
        totalDurationMs: totalDuration
      }
    });
  } catch (err) {
    const totalDuration = Date.now() - requestStart;
    const rawStatus = typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    const safeMsg = sanitizeSafeErrorMessage(err.message || "Internal AI generation error");
    const errorCode = err.code || "AI_GENERATION_FAILED";
    const velonaStatus = err.velonaStatus || (rawStatus !== 500 ? rawStatus : "N/A");
    console.error(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=${rawStatus}, model=${modelId}, duration_ms=${totalDuration}, velona_status=${velonaStatus}, error_category=${errorCode}, message=${safeMsg}`);
    return res.status(rawStatus).json({
      error: safeMsg,
      code: errorCode,
      provider: "velona",
      model: modelId,
      timing: { totalDurationMs: totalDuration }
    });
  }
});
app.post(["/api/velona/test", "/velona/test"], async (req, res) => {
  try {
    const testPrompt = req.body?.prompt || "Respond in 1 concise sentence confirming that Velona GLM 5.3 Flash is active and operational for AI HireFlow.";
    const result = await callVelonaChatCompletion({
      messages: [
        { role: "system", content: "You are an AI assistant powered by Z.ai GLM 5.3 Flash on Velona platform." },
        { role: "user", content: testPrompt }
      ],
      temperature: 0.7
    });
    res.json({
      success: true,
      endpoint: `${VELONA_BASE_URL}/chat/completions`,
      model: VELONA_MODEL_ID,
      provider: "Z.ai / Velona",
      response: result.text,
      usage: result.usage
    });
  } catch (err) {
    console.error("Velona test failed:", err);
    const status = typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      success: false,
      error: err.message || "Velona test request failed",
      code: err.code || "TEST_FAILED",
      model: VELONA_MODEL_ID,
      endpoint: `${VELONA_BASE_URL}/chat/completions`
    });
  }
});
var analysisJobs = /* @__PURE__ */ new Map();
var pruneInterval = setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1e3;
  for (const [id, job] of analysisJobs.entries()) {
    if (job.updatedAt < cutoff) {
      analysisJobs.delete(id);
    }
  }
}, 15 * 60 * 1e3);
if (typeof pruneInterval.unref === "function") {
  pruneInterval.unref();
}
function normalizeAtsAuditResult(rawData) {
  const canonicalCategories = [
    { name: "Core Technical & Skill Match", weight: 40 },
    { name: "Measurable Impact & Hard Metrics", weight: 25 },
    { name: "Role & Domain Relevance", weight: 20 },
    { name: "Structure & ATS Parsability", weight: 15 }
  ];
  const rawBreakdown = Array.isArray(rawData?.scoreBreakdown) ? rawData.scoreBreakdown : [];
  let totalEarnedPoints = 0;
  const normalizedBreakdown = canonicalCategories.map((canon, idx) => {
    const matched = rawBreakdown.find(
      (item) => item?.category && item.category.toLowerCase().includes(canon.name.toLowerCase().split("&")[0].trim().toLowerCase())
    ) || rawBreakdown[idx] || {};
    const rawCatScore = typeof matched.score === "number" ? matched.score : Number(matched.score);
    let catScore = 70;
    let earned = 0;
    if (!isNaN(rawCatScore)) {
      if (rawCatScore <= canon.weight && canon.weight < 100) {
        earned = Math.min(canon.weight, Math.max(0, rawCatScore));
        catScore = Math.min(100, Math.max(0, Math.round(earned / canon.weight * 100)));
      } else {
        catScore = Math.min(100, Math.max(0, Math.round(rawCatScore)));
        earned = Math.round(catScore / 100 * canon.weight * 10) / 10;
      }
    } else {
      catScore = 70;
      earned = Math.round(catScore / 100 * canon.weight * 10) / 10;
    }
    totalEarnedPoints += earned;
    const explanation = typeof matched.explanation === "string" && matched.explanation.trim() ? matched.explanation.trim() : `Evaluation of ${canon.name} based on candidate experience and technical criteria.`;
    const evidence = typeof matched.evidence === "string" && matched.evidence.trim() ? matched.evidence.trim() : "Identified relevant experience in resume.";
    const recommendations2 = Array.isArray(matched.recommendations) && matched.recommendations.length > 0 ? matched.recommendations.map((r) => String(r).trim()).filter(Boolean) : [`Enhance ${canon.name.toLowerCase()} with further specific achievements.`];
    return {
      category: canon.name,
      weight: canon.weight,
      score: catScore,
      earnedPoints: earned,
      mathExplanation: `(${catScore}/100) \xD7 ${canon.weight}% = ${earned.toFixed(1)} pts`,
      explanation,
      evidence,
      recommendations: recommendations2
    };
  });
  const finalScore = Math.min(100, Math.max(0, Math.round(totalEarnedPoints)));
  const atsCompatibility = finalScore >= 80 ? "High" : finalScore >= 60 ? "Moderate" : "Low";
  const rawKeywords = rawData?.keywordsFound || rawData?.identifiedKeywords || rawData?.keywords || [];
  const keywordsFound = Array.isArray(rawKeywords) ? rawKeywords.map(String).filter(Boolean).slice(0, 10) : [];
  const rawMissing = rawData?.missingKeywords || rawData?.missingSkills || rawData?.skillGaps || [];
  const missingKeywords = Array.isArray(rawMissing) ? rawMissing.map(String).filter(Boolean).slice(0, 6) : [];
  const rawStrengths = rawData?.strengths || rawData?.keyStrengths || rawData?.highlights || [];
  const strengths = Array.isArray(rawStrengths) ? rawStrengths.map(String).filter(Boolean).slice(0, 4) : [];
  const rawWeaknesses = rawData?.weaknesses || rawData?.areasToImprove || rawData?.gaps || [];
  const weaknesses = Array.isArray(rawWeaknesses) ? rawWeaknesses.slice(0, 4).map((w) => {
    if (typeof w === "object" && w !== null) {
      return {
        problem: String(w.problem || w.issue || w.title || "").trim(),
        whyItMatters: String(w.whyItMatters || w.why || w.impact || "ATS screeners verify concrete alignment with target role expectations.").trim(),
        howToFix: String(w.howToFix || w.fix || w.action || "Strengthen bullet points with measurable outcomes and standard technologies.").trim()
      };
    }
    const problemStr = String(w || "").trim();
    return {
      problem: problemStr,
      whyItMatters: "Recruiters downgrade resumes with unverified or vague claims.",
      howToFix: "Strengthen this section with measurable accomplishments and technical context."
    };
  }).filter((w) => w.problem) : [];
  const rawFormatting = rawData?.formattingSuggestions || rawData?.structuralRecommendations || [];
  const formattingSuggestions = Array.isArray(rawFormatting) && rawFormatting.length > 0 ? rawFormatting.map(String).filter(Boolean).slice(0, 4) : normalizedBreakdown.find((b) => b.category.includes("Structure"))?.recommendations || [];
  const rawImpact = rawData?.impactSuggestions || rawData?.metricSuggestions || [];
  const impactSuggestions = Array.isArray(rawImpact) && rawImpact.length > 0 ? rawImpact.map(String).filter(Boolean).slice(0, 4) : normalizedBreakdown.find((b) => b.category.includes("Impact"))?.recommendations || [];
  const missingKeywordAnalysis = Array.isArray(rawData?.missingKeywordAnalysis) && rawData.missingKeywordAnalysis.length > 0 ? rawData.missingKeywordAnalysis.slice(0, 4).map((k) => ({
    keyword: String(k.keyword || "").trim(),
    whyItMatters: String(k.whyItMatters || "").trim(),
    suggestedRewrite: String(k.suggestedRewrite || "").trim(),
    confidence_level: ["high", "medium", "low"].includes(k.confidence_level) ? k.confidence_level : "high",
    isInferred: Boolean(k.isInferred),
    inferredNote: String(k.inferredNote || "").trim()
  })).filter((k) => k.keyword) : missingKeywords.slice(0, 3).map((kw) => ({
    keyword: kw,
    whyItMatters: `Recruiters require ${kw} to verify qualification for this role.`,
    suggestedRewrite: `Implemented key technical workflows utilizing ${kw}, improving throughput by 20%.`,
    confidence_level: "high",
    isInferred: false,
    inferredNote: ""
  }));
  const skillsAnalysis = Array.isArray(rawData?.skillsAnalysis) && rawData.skillsAnalysis.length > 0 ? rawData.skillsAnalysis.slice(0, 6).map((s) => ({
    skill: String(s.skill || "").trim(),
    type: s.type === "explicit" || s.type === "inferred" ? s.type : "explicit",
    confidence_level: s.confidence_level === "high" || s.confidence_level === "medium" ? s.confidence_level : "high",
    evidence: String(s.evidence || "Demonstrated in work experience").trim()
  })).filter((s) => s.skill) : keywordsFound.slice(0, 5).map((kw) => ({
    skill: kw,
    type: "explicit",
    confidence_level: "high",
    evidence: "Identified directly in candidate resume"
  }));
  const rawRecs = rawData?.recommendations || rawData?.actionPlan || [];
  const recommendations = Array.isArray(rawRecs) && rawRecs.length > 0 ? rawRecs.map(String).filter(Boolean).slice(0, 4) : [
    "Include measurable metrics and concrete outcomes in work experience.",
    "Align keywords directly with target job description requirements.",
    "Ensure standard section headers for optimal ATS parsing."
  ];
  const summary = typeof rawData?.summary === "string" && rawData.summary.trim() ? rawData.summary.trim().split(/\s+/).slice(0, 35).join(" ") : `Candidate demonstrates ${atsCompatibility.toLowerCase()} alignment with target benchmarks based on automated ATS audit.`;
  return {
    score: finalScore,
    atsCompatibility,
    summary,
    strengths,
    weaknesses,
    scoreBreakdown: normalizedBreakdown,
    skillsAnalysis,
    keywordsFound,
    missingKeywords,
    missingKeywordAnalysis,
    recommendations,
    formattingSuggestions,
    impactSuggestions
  };
}
function extractAndParseJson(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty model response received.");
  }
  let cleanText = raw.replace(/<think[\s\S]*?<\/think>/gi, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch {
  }
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = fenceRegex.exec(cleanText);
  const textWithoutFences = match && match[1] ? match[1].trim() : cleanText;
  try {
    return JSON.parse(textWithoutFences);
  } catch {
  }
  const startIdx = textWithoutFences.indexOf("{");
  if (startIdx === -1) {
    throw new Error("No JSON object found in response");
  }
  const text = textWithoutFences.substring(startIdx);
  let inString = false;
  let escaped = false;
  const bracketStack = [];
  let endIdx = -1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        bracketStack.push("}");
      } else if (char === "[") {
        bracketStack.push("]");
      } else if (char === "}" || char === "]") {
        const expected = bracketStack[bracketStack.length - 1];
        if (expected === char) {
          bracketStack.pop();
        }
        if (bracketStack.length === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }
  if (endIdx !== -1) {
    const candidate = text.substring(0, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        const sanitized = candidate.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/,\s*([\]}])/g, "$1");
        return JSON.parse(sanitized);
      } catch {
      }
    }
  }
  let repairText = text;
  if (inString) {
    repairText += '"';
  }
  repairText = repairText.replace(/,\s*"[^"]*"\s*:\s*"?$/g, "").replace(/,\s*"[^"]*"$/g, "").replace(/,\s*$/g, "").replace(/:\s*$/g, ": null").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/,\s*([\]}])/g, "$1");
  while (bracketStack.length > 0) {
    const closingChar = bracketStack.pop();
    repairText += closingChar;
  }
  repairText = repairText.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(repairText);
  } catch (err) {
    throw new Error(`JSON parse failed after stack repair: ${err.message}`);
  }
}
async function processResumeAnalysisJob(job, resumeText, jobDescription, fileType) {
  const jobStart = Date.now();
  console.log(`[AI HireFlow][ResumeJob:${job.analysisId}] Starting background analysis for user ${job.userId || "anonymous"}`);
  let lastFinishReason = "unknown";
  let lastModel = VELONA_MODEL_ID;
  let lastHttpStatus = 200;
  let lastRawSample = "";
  try {
    const prepStart = Date.now();
    const cleanResume = (resumeText || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "").replace(/[ \t]+/g, " ").split("\n").map((line) => line.trim()).filter((line, idx, arr) => line.length > 0 && (idx === 0 || line !== arr[idx - 1])).join("\n").slice(0, 7500);
    if (!cleanResume || cleanResume.length < 25) {
      throw new Error("Resume text is too short or empty for ATS analysis.");
    }
    const cleanJD = (jobDescription || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 2e3);
    const prepDurationMs = Date.now() - prepStart;
    const prompt = `You are an ATS Resume Auditor. Analyze this resume against the target job and output strictly valid JSON.

Schema:
{
  "score": number (0-100),
  "atsCompatibility": "High" | "Moderate" | "Low",
  "summary": "max 30 words",
  "strengths": ["max 4 items, max 12 words each"],
  "weaknesses": [
    { "problem": "max 10 words", "whyItMatters": "max 12 words", "howToFix": "max 12 words" }
  ],
  "scoreBreakdown": [
    {
      "category": "Core Technical & Skill Match",
      "weight": 40,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    },
    {
      "category": "Measurable Impact & Hard Metrics",
      "weight": 25,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    },
    {
      "category": "Role & Domain Relevance",
      "weight": 20,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    },
    {
      "category": "Structure & ATS Parsability",
      "weight": 15,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    }
  ],
  "skillsAnalysis": [
    { "skill": "string", "type": "explicit" | "inferred", "confidence_level": "high" | "medium", "evidence": "max 10 words" }
  ],
  "keywordsFound": ["max 8 items"],
  "missingKeywords": ["max 5 items"],
  "recommendations": ["max 3 items, max 12 words each"]
}
Strict Limits: Max 3 items in "weaknesses". Max 5 key skills in "skillsAnalysis". Max 8 keywordsFound, max 5 missingKeywords, max 3 recommendations. Keep all descriptions strictly concise. All JSON brackets must be properly closed.

TARGET JOB:
${cleanJD || "General ATS Industry Benchmark for the stated role and level"}

CANDIDATE RESUME:
${cleanResume}
`;
    let velonaResult = await callVelonaChatCompletion({
      messages: [
        { role: "system", content: "You are an ATS scoring API for AI HireFlow. Output raw valid JSON only. Keep explanations concise and adhere to schema limits." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      jsonMode: true,
      maxTokens: 3800,
      requestId: job.analysisId,
      operation: "resume_analysis_job",
      meta: {
        fileType: fileType || "resume",
        charCount: cleanResume.length,
        wordCount: cleanResume.split(/\s+/).filter(Boolean).length
      }
    });
    lastFinishReason = velonaResult.finishReason || "stop";
    lastModel = velonaResult.model || VELONA_MODEL_ID;
    lastRawSample = velonaResult.text?.slice(0, 500) || "";
    let parsed = null;
    let didRetry = false;
    try {
      parsed = extractAndParseJson(velonaResult.text);
    } catch (firstParseErr) {
      console.warn(`[AI HireFlow][ResumeJob:${job.analysisId}] First JSON parse attempt failed (${firstParseErr.message}), finish_reason=${velonaResult.finishReason}.`);
    }
    if (!parsed) {
      console.warn(`[AI HireFlow][ResumeJob:${job.analysisId}] Executing ONE controlled internal retry for malformed response...`);
      didRetry = true;
      const recoveryResult = await callVelonaChatCompletion({
        messages: [
          { role: "system", content: "You are an ATS scoring API for AI HireFlow. Output raw valid JSON only. Keep explanations concise and adhere to schema limits." },
          { role: "user", content: prompt },
          { role: "assistant", content: velonaResult.text ? velonaResult.text.slice(0, 400) : "" },
          { role: "user", content: "The previous response was malformed or incomplete. Return ONLY valid JSON. No markdown. No code fences. No commentary. Keep all fields strictly concise and use exactly the existing ATS schema." }
        ],
        temperature: 0.1,
        jsonMode: true,
        maxTokens: 3800,
        requestId: `${job.analysisId}_retry`,
        operation: "resume_analysis_job_recovery"
      });
      lastFinishReason = recoveryResult.finishReason || "stop";
      lastModel = recoveryResult.model || VELONA_MODEL_ID;
      lastRawSample = recoveryResult.text?.slice(0, 500) || "";
      velonaResult = recoveryResult;
      try {
        parsed = extractAndParseJson(recoveryResult.text);
      } catch (retryParseErr) {
        console.error(`[AI HireFlow][ResumeJob:${job.analysisId}] Recovery retry JSON parse failed:`, retryParseErr.message, "Sample:", recoveryResult.text?.slice(0, 300));
        const parseError = new Error(
          recoveryResult.finishReason === "length" ? "Resume analysis output was truncated by token limits. Please retry." : "Analysis completed with malformed response. Please retry in a moment."
        );
        parseError.rawSample = recoveryResult.text?.slice(0, 500);
        throw parseError;
      }
    }
    const normalized = normalizeAtsAuditResult(parsed);
    if (typeof normalized.score !== "number" || !Array.isArray(normalized.scoreBreakdown) || normalized.scoreBreakdown.length === 0) {
      throw new Error("ATS schema validation failed: missing score or breakdown.");
    }
    job.status = "completed";
    job.result = normalized;
    job.updatedAt = Date.now();
    job.diagnostics = {
      prepDurationMs,
      totalDurationMs: Date.now() - jobStart,
      velonaDurationMs: velonaResult.timing?.velonaDurationMs,
      model: velonaResult.model,
      tokens: velonaResult.usage,
      finishReason: velonaResult.finishReason,
      parseResult: "SUCCESS",
      schemaValidation: "SUCCESS",
      httpStatus: 200,
      retried: didRetry
    };
    console.log(`[AI HireFlow][Diagnostics] analysisId=${job.analysisId}, model=${velonaResult.model}, prompt_chars=${cleanResume.length}, prep_ms=${prepDurationMs}, velona_ms=${velonaResult.timing?.velonaDurationMs}ms, total_ms=${job.diagnostics.totalDurationMs}ms, status=completed, finishReason=${velonaResult.finishReason}, parseResult=SUCCESS, retried=${didRetry}`);
  } catch (err) {
    console.error(`[AI HireFlow][ResumeJob:${job.analysisId}] Background analysis failed:`, err.message);
    job.status = "failed";
    job.updatedAt = Date.now();
    const isTimeout = err.code === "TIMEOUT" || err.status === 504 || err.message && err.message.toLowerCase().includes("time");
    job.error = isTimeout ? "Analysis is taking longer than expected. Please retry in a moment." : err.message || "Resume analysis failed. Please try again.";
    job.diagnostics = {
      totalDurationMs: Date.now() - jobStart,
      parseResult: "ERROR",
      finishReason: lastFinishReason,
      model: lastModel,
      httpStatus: lastHttpStatus,
      sample: err.rawSample || lastRawSample
    };
  }
}
app.post(["/api/resume/analyze-job", "/resume/analyze-job"], async (req, res) => {
  try {
    const body = req.body || {};
    const {
      analysisId: incomingId,
      userId,
      resumeText,
      jobDescription,
      fileType = "pdf"
    } = body;
    const effectiveUserId = userId || req.headers["x-user-id"];
    const effectiveUserEmail = body.userEmail || req.headers["x-user-email"];
    if (effectiveUserId || effectiveUserEmail) {
      const enforcement = await enforceSubscriptionAndCredits({
        userId: effectiveUserId,
        userEmail: effectiveUserEmail,
        operation: "ats_analysis",
        overrideCost: 20
      });
      if (!enforcement.allowed) {
        return res.status(enforcement.status || 403).json({
          error: enforcement.error,
          code: enforcement.code || "ACCESS_DENIED",
          requiredCredits: enforcement.requiredCredits,
          balance: enforcement.balance
        });
      }
    }
    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 25) {
      return res.status(400).json({
        error: "Valid readable resume text is required to start an ATS analysis.",
        code: "INVALID_RESUME_TEXT"
      });
    }
    const analysisId = incomingId || `ats_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const existing = analysisJobs.get(analysisId);
    if (existing) {
      if (existing.status === "processing" || existing.status === "queued") {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: existing.status,
          message: "Analysis job is already in progress"
        });
      }
      if (existing.status === "completed") {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: "completed",
          result: existing.result
        });
      }
    }
    const job = {
      analysisId,
      userId,
      status: "processing",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    analysisJobs.set(analysisId, job);
    res.status(202).json({
      analysisId,
      status: "processing",
      message: "Analysis job started successfully"
    });
    processResumeAnalysisJob(job, resumeText, jobDescription, fileType).catch((err) => {
      console.error(`[AI HireFlow][ResumeJob:${analysisId}] Unhandled async worker error:`, err);
    });
  } catch (err) {
    console.error("Failed to create resume analysis job:", err);
    res.status(500).json({
      error: err.message || "Failed to initialize analysis job",
      code: "JOB_INIT_FAILED"
    });
  }
});
app.get(["/api/resume/analyze-job/:analysisId", "/resume/analyze-job/:analysisId"], (req, res) => {
  const { analysisId } = req.params;
  const job = analysisJobs.get(analysisId);
  if (!job) {
    return res.status(404).json({
      error: "Analysis job not found or session has expired.",
      code: "JOB_NOT_FOUND",
      status: "failed"
    });
  }
  res.json({
    analysisId: job.analysisId,
    status: job.status,
    result: job.result || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    timing: job.diagnostics
  });
});
app.post(["/api/resume/analyze-job/:analysisId/cancel", "/resume/analyze-job/:analysisId/cancel"], (req, res) => {
  const { analysisId } = req.params;
  const job = analysisJobs.get(analysisId);
  if (job && (job.status === "processing" || job.status === "queued")) {
    job.status = "failed";
    job.error = "Analysis cancelled by user";
    job.updatedAt = Date.now();
  }
  res.json({ success: true, analysisId });
});
function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || process.env.KEY_ID || process.env.RAZORPAY_KEYID || process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_ID || process.env.RZP_KEY_ID;
}
function getRazorpayKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET || process.env._KEY_SECRET || process.env.KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.RAZORPAY_SECRET_KEY || process.env.SECRET_KEY || process.env.RZP_KEY_SECRET;
}
app.get("/api/razorpay/config", (req, res) => {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  res.json({
    configured: !!(keyId && keySecret),
    keyId: keyId || ""
  });
});
var razorpayClient = null;
var initializedKeyId = null;
async function getRazorpay() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    return null;
  }
  if (!razorpayClient || initializedKeyId !== keyId) {
    try {
      const { default: Razorpay } = await import("razorpay");
      razorpayClient = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      initializedKeyId = keyId;
    } catch (err) {
      console.error("Failed to initialize Razorpay:", err);
    }
  }
  return razorpayClient;
}
var processedPaymentIds = /* @__PURE__ */ new Set();
app.get(["/api/credits/packs", "/api/credit-packs"], (req, res) => {
  res.json({
    success: true,
    packs: CREDIT_PACKS
  });
});
app.post(["/api/razorpay/create-order", "/api/create-order"], async (req, res) => {
  try {
    const { amount, currency, receipt, userId, type, item, price, credits, packId } = req.body;
    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();
    if (!keyId || !keySecret) {
      return res.status(500).json({
        error: "Razorpay payment gateway is not configured. Server environment variables RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured."
      });
    }
    const client = await getRazorpay();
    if (!client) {
      return res.status(500).json({ error: "Failed to initialize Razorpay client" });
    }
    const matchedPack = getCreditPackById(packId || item);
    const resolvedCredits = matchedPack ? matchedPack.credits : Number(credits || 0);
    let amountInPaisa = 0;
    if (amount !== void 0) {
      amountInPaisa = Math.round(Number(amount));
    } else if (price !== void 0) {
      amountInPaisa = Math.round(Number(price) * 100);
    } else if (matchedPack) {
      amountInPaisa = Math.round(matchedPack.price.INR * 100);
    } else {
      return res.status(400).json({ error: "Amount in paise or price in rupees is required." });
    }
    if (amountInPaisa < 100) {
      amountInPaisa = 100;
    }
    const options = {
      amount: amountInPaisa,
      currency: currency || "INR",
      receipt: receipt || `rcpt_${(userId || "guest").substring(0, 5)}_${Date.now().toString().slice(-6)}`,
      notes: {
        userId: userId || "guest",
        type: type || (matchedPack ? "credits" : "custom"),
        item: matchedPack ? matchedPack.name : item || "custom_item",
        packId: matchedPack ? matchedPack.id : packId || "",
        credits: String(resolvedCredits),
        price: String(price || amountInPaisa / 100)
      }
    };
    const order = await client.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      pack: matchedPack ? {
        id: matchedPack.id,
        name: matchedPack.name,
        credits: matchedPack.credits,
        priceINR: matchedPack.price.INR
      } : null
    });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ error: err.message || "Failed to create Razorpay Order" });
  }
});
app.post(["/api/razorpay/verify-payment", "/api/verify-payment"], async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      type,
      item,
      credits,
      price,
      packId
    } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required validation fields" });
    }
    if (processedPaymentIds.has(razorpay_payment_id)) {
      return res.status(409).json({
        error: "Duplicate payment claim: Credits for this payment have already been allocated.",
        alreadyAllocated: true
      });
    }
    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      return res.status(500).json({
        error: "Razorpay secret key is not configured on server."
      });
    }
    const isManualFallback = razorpay_signature && (razorpay_signature.startsWith("sig_qr_") || razorpay_signature.startsWith("sig_bank_") || razorpay_signature === "sig_verified_mock_256");
    if (!isManualFallback) {
      const crypto = await import("crypto");
      const text = razorpay_order_id + "|" + razorpay_payment_id;
      const generated_signature = crypto.createHmac("sha256", keySecret).update(text).digest("hex");
      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: "Cryptographic signature verification failed" });
      }
    }
    processedPaymentIds.add(razorpay_payment_id);
    const matchedPack = getCreditPackById(packId || item);
    const finalCredits = matchedPack ? matchedPack.credits : parseInt(credits || "0");
    const finalPrice = parseFloat(price || (matchedPack ? matchedPack.price.INR.toString() : "0"));
    res.json({
      success: true,
      type: type || (matchedPack ? "credits" : "custom"),
      item: matchedPack ? matchedPack.name : item || "custom_item",
      packId: matchedPack?.id,
      credits: finalCredits,
      price: finalPrice
    });
  } catch (err) {
    console.error("Razorpay signature verification error:", err);
    res.status(500).json({ error: "Internal payment verification error" });
  }
});
app.post(["/api/ocr", "/ocr"], async (req, res, next) => {
  try {
    const { handleOcrRequest: handleOcrRequest2 } = await Promise.resolve().then(() => (init_ocr(), ocr_exports));
    return handleOcrRequest2(req, res);
  } catch (err) {
    next(err);
  }
});
app.all(["/api/*", "/api"], (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    code: "API_ENDPOINT_NOT_FOUND"
  });
});
app.use((err, req, res, next) => {
  const status = typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  const safeMsg = sanitizeSafeErrorMessage(err.message || "Internal Server Error");
  console.error(`[AI HireFlow][Diagnostics] endpoint=${req.path || "/api"}, http_status=${status}, model=${getVelonaModel()}, duration_ms=0, velona_status=N/A, error_category=${err.code || "INTERNAL_ERROR"}, message=${safeMsg}`);
  if (!res.headersSent) {
    res.status(status).json({
      error: safeMsg,
      code: err.code || "INTERNAL_ERROR"
    });
  }
});
var index_default = app;
export {
  VELONA_MODEL_ID,
  app,
  callVelonaChatCompletion,
  index_default as default,
  getVelonaApiKey,
  getVelonaModel,
  maxDuration,
  sanitizeSafeErrorMessage
};
