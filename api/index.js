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

// api/_lib/jsearch.ts
var jsearch_exports = {};
__export(jsearch_exports, {
  getOpenWebNinjaApiKey: () => getOpenWebNinjaApiKey,
  isJSearchConfigured: () => isJSearchConfigured,
  normalizeJSearchJob: () => normalizeJSearchJob,
  queryOpenWebNinjaJSearch: () => queryOpenWebNinjaJSearch
});
function getOpenWebNinjaApiKey() {
  const rawKey = process.env.OPENWEB_NINJA_API_KEY || process.env.OPEN_WEB_NINJA_API_KEY || process.env.OPENWEBNINJA_API_KEY || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY || "";
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, "").trim();
  return cleanKey || null;
}
function isJSearchConfigured() {
  return Boolean(getOpenWebNinjaApiKey());
}
function mapCountryToCode(loc) {
  const l = loc.toLowerCase().trim();
  if (/\bindia\b|\bin\b/i.test(l)) return "in";
  if (/\bunited states\b|\busa\b|\bus\b/i.test(l)) return "us";
  if (/\bunited kingdom\b|\buk\b|\bgreat britain\b|\bengland\b/i.test(l)) return "gb";
  if (/\bcanada\b/i.test(l)) return "ca";
  if (/\bgermany\b|\bdeutschland\b/i.test(l)) return "de";
  if (/\baustralia\b/i.test(l)) return "au";
  if (/\bsingapore\b/i.test(l)) return "sg";
  if (/\bfrance\b/i.test(l)) return "fr";
  if (/\bnetherlands\b|\bholland\b/i.test(l)) return "nl";
  if (/\bireland\b/i.test(l)) return "ie";
  if (/\bjapan\b/i.test(l)) return "jp";
  return void 0;
}
function formatEmploymentType(raw) {
  if (!raw) return "Full-time";
  const norm = raw.toUpperCase().trim();
  if (norm === "FULLTIME" || norm === "FULL_TIME") return "Full-time";
  if (norm === "INTERN" || norm === "INTERNSHIP") return "Internship";
  if (norm === "CONTRACTOR" || norm === "CONTRACT") return "Contract";
  if (norm === "PARTTIME" || norm === "PART_TIME") return "Part-time";
  return raw;
}
function formatLocation(item, fallbackLoc) {
  const parts = [];
  if (item.job_city) parts.push(item.job_city.trim());
  if (item.job_state && item.job_state !== item.job_city) parts.push(item.job_state.trim());
  if (item.job_country) {
    const c = item.job_country.toUpperCase().trim();
    if (c === "IN") parts.push("India");
    else if (c === "US") parts.push("USA");
    else if (c === "GB" || c === "UK") parts.push("UK");
    else parts.push(c);
  }
  if (parts.length > 0) {
    return parts.join(", ");
  }
  if (item.job_is_remote) {
    return "Remote / Worldwide";
  }
  return fallbackLoc?.trim() || "Location Not Specified";
}
function normalizeJSearchJob(item, fallbackLoc) {
  const plainDesc = stripHtml(item.job_description || "");
  const cleanTitle = (item.job_title || "Engineering Role").trim();
  const cleanCompany = (item.employer_name || "Hiring Organization").trim();
  const displayLocation = formatLocation(item, fallbackLoc);
  const link = item.job_apply_link || item.job_google_link || "#";
  const publisher = item.job_publisher ? item.job_publisher.trim() : "Google for Jobs";
  const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
  const jobType = formatEmploymentType(item.job_employment_type);
  const isRemote = Boolean(item.job_is_remote);
  const explicitSkills = Array.isArray(item.job_required_skills) ? item.job_required_skills.filter((s) => typeof s === "string" && s.trim().length > 1) : [];
  const rawTags = [
    publisher,
    ...item.job_country ? [item.job_country.toUpperCase()] : [],
    ...isRemote ? ["Remote"] : [],
    ...jobType ? [jobType] : []
  ];
  const derivedSkills = explicitSkills.length > 0 ? explicitSkills : extractSkillsFromText(cleanTitle, plainDesc, rawTags);
  let salaryObj = null;
  if (typeof item.job_min_salary === "number" || typeof item.job_max_salary === "number") {
    salaryObj = {
      min: item.job_min_salary ?? null,
      max: item.job_max_salary ?? null,
      currency: item.job_salary_currency || "USD",
      period: item.job_salary_period || "YEAR"
    };
  }
  const parsedPostedAt = item.job_posted_at_datetime_utc ? item.job_posted_at_datetime_utc : typeof item.job_posted_at_timestamp === "number" ? new Date(item.job_posted_at_timestamp * 1e3).toISOString() : null;
  return {
    id: `jsearch-${item.job_id || Math.random().toString(36).slice(2)}`,
    title: cleanTitle,
    company: cleanCompany,
    location: displayLocation,
    link,
    description: plainDesc || "Please refer to the official job posting for complete role requirements.",
    skills: derivedSkills.slice(0, 8),
    datePosted: formatRelativeDate(item.job_posted_at_datetime_utc || item.job_posted_at_timestamp),
    postedAt: parsedPostedAt,
    source: publisher,
    provider: "OpenWeb Ninja JSearch",
    retrievedAt,
    jobType,
    isRemote,
    tags: rawTags,
    matchScore: 80,
    roleTier: "stretch",
    matchExplanation: `Verified live opening at ${cleanCompany} from ${publisher}.`,
    // Retain real metadata
    ...salaryObj ? { salary: salaryObj } : {},
    ...item.job_offer_expiration_datetime_utc ? { expiresAt: item.job_offer_expiration_datetime_utc } : {}
  };
}
async function executeSingleJSearchQuery(options, dateFilter, apiKey, cleanQuery, cleanLoc) {
  const countryCode = cleanLoc ? mapCountryToCode(cleanLoc) : "in";
  const targetCountry = countryCode || "in";
  let effectiveQuery = cleanQuery;
  if (cleanLoc && !/^(india|in|usa|us|united states|uk|united kingdom)$/i.test(cleanLoc.trim())) {
    if (!cleanQuery.toLowerCase().includes(cleanLoc.toLowerCase())) {
      effectiveQuery = `${cleanQuery} in ${cleanLoc}`;
    }
  }
  const isRapidApi = Boolean(process.env.RAPIDAPI_KEY) || apiKey.length === 50 && /^[a-f0-9]+$/i.test(apiKey);
  const baseUrl = isRapidApi ? "https://jsearch.p.rapidapi.com/search" : "https://api.openwebninja.com/jsearch/search";
  const url = new URL(baseUrl);
  url.searchParams.set("query", effectiveQuery.slice(0, 150));
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("date_posted", dateFilter);
  url.searchParams.set("country", targetCountry);
  url.searchParams.set("language", "en");
  if (options.isRemote) {
    url.searchParams.set("work_from_home", "true");
    url.searchParams.set("remote_jobs_only", "true");
  }
  if (options.employmentType) {
    const emp = options.employmentType.toUpperCase();
    if (["FULLTIME", "INTERN", "CONTRACTOR", "PARTTIME"].includes(emp)) {
      url.searchParams.set("employment_types", emp);
    }
  }
  const headers = {
    "Accept": "application/json",
    "User-Agent": "AIHireFlow/1.0 (+https://aihireflow.in)"
  };
  if (isRapidApi) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = "jsearch.p.rapidapi.com";
  } else {
    headers["x-api-key"] = apiKey;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14e3);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const status = response.status;
      let errMessage = `OpenWeb Ninja JSearch returned HTTP ${status}`;
      try {
        const errBody = await response.json();
        if (errBody?.message) errMessage = errBody.message;
      } catch {
      }
      if (status === 401 || status === 403) {
        return {
          success: false,
          jobs: [],
          totalFound: 0,
          cached: false,
          provider: "OpenWeb Ninja JSearch",
          errorCode: "AUTH_ERROR",
          error: "Authentication failed for OpenWeb Ninja JSearch API. Please check your OPENWEB_NINJA_API_KEY in environment variables."
        };
      }
      if (status === 429) {
        return {
          success: false,
          jobs: [],
          totalFound: 0,
          cached: false,
          provider: "OpenWeb Ninja JSearch",
          errorCode: "RATE_LIMIT",
          error: "OpenWeb Ninja JSearch API request limit or credit quota exceeded. Please check your OpenWeb Ninja Pay As You Go balance."
        };
      }
      return {
        success: false,
        jobs: [],
        totalFound: 0,
        cached: false,
        provider: "OpenWeb Ninja JSearch",
        errorCode: "API_ERROR",
        error: `OpenWeb Ninja JSearch API error: ${errMessage}`
      };
    }
    const rawData = await response.json();
    const rawJobList = Array.isArray(rawData?.data) ? rawData.data : [];
    const normalizedJobs = rawJobList.map((item) => normalizeJSearchJob(item, cleanLoc));
    return {
      success: true,
      jobs: normalizedJobs,
      totalFound: rawJobList.length,
      cached: false,
      provider: "OpenWeb Ninja JSearch"
    };
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === "AbortError") {
      return {
        success: false,
        jobs: [],
        totalFound: 0,
        cached: false,
        provider: "OpenWeb Ninja JSearch",
        errorCode: "TIMEOUT",
        error: "OpenWeb Ninja JSearch request timed out. Please try again."
      };
    }
    return {
      success: false,
      jobs: [],
      totalFound: 0,
      cached: false,
      provider: "OpenWeb Ninja JSearch",
      errorCode: "NETWORK_ERROR",
      error: `Network error connecting to OpenWeb Ninja JSearch: ${fetchErr.message || "Connection failed"}`
    };
  }
}
async function queryOpenWebNinjaJSearch(options) {
  const apiKey = getOpenWebNinjaApiKey();
  if (!apiKey) {
    return {
      success: false,
      jobs: [],
      totalFound: 0,
      cached: false,
      provider: "OpenWeb Ninja JSearch",
      errorCode: "MISSING_KEY",
      error: "OpenWeb Ninja JSearch API key is not configured. Please add OPENWEB_NINJA_API_KEY to your environment variables to enable live job discovery."
    };
  }
  let cleanQuery = (options.query || "").trim();
  let cleanLoc = (options.location || "").trim();
  const locMatch = cleanQuery.match(/\s+(?:role\s+at|jobs?\s+at|openings?\s+at|internship\s+at|role\s+in|jobs?\s+in|openings?\s+in|internship\s+in|in|at)\s+([a-zA-Z\s]+)$/i);
  if (locMatch && locMatch[1]) {
    const extractedLoc = locMatch[1].trim();
    if (!cleanLoc) {
      cleanLoc = extractedLoc;
    }
    cleanQuery = cleanQuery.slice(0, locMatch.index).trim();
  }
  cleanQuery = cleanQuery.replace(/\s+(?:roles?|jobs?|openings?|vacanc(?:y|ies))\s*$/i, "").trim() || (options.query || "").trim();
  if (!cleanQuery) {
    return {
      success: true,
      jobs: [],
      totalFound: 0,
      cached: false,
      provider: "OpenWeb Ninja JSearch"
    };
  }
  const initialDateFilter = options.datePosted || "all";
  const cacheKey = JSON.stringify({
    q: cleanQuery.toLowerCase(),
    loc: cleanLoc.toLowerCase(),
    emp: (options.employmentType || "").toUpperCase(),
    rem: Boolean(options.isRemote),
    date: initialDateFilter
  });
  const cached = queryCache.get(cacheKey);
  if (cached && cached.jobs?.length > 0 && Date.now() - cached.timestamp < QUERY_CACHE_TTL_MS) {
    return {
      success: true,
      jobs: cached.jobs,
      totalFound: cached.totalFound,
      cached: true,
      provider: "OpenWeb Ninja JSearch"
    };
  }
  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }
  const searchPromise = (async () => {
    try {
      const initialResult = await executeSingleJSearchQuery(
        options,
        initialDateFilter,
        apiKey,
        cleanQuery,
        cleanLoc
      );
      if (!initialResult.success) {
        return initialResult;
      }
      let aggregatedJobs = [...initialResult.jobs];
      let totalFound = initialResult.totalFound;
      aggregatedJobs = sortJobsByPostingDateNewestFirst(aggregatedJobs);
      const maxLimit = Math.max(15, options.limit || 15);
      const finalJobs = aggregatedJobs.slice(0, maxLimit);
      queryCache.set(cacheKey, {
        jobs: finalJobs,
        totalFound: aggregatedJobs.length,
        timestamp: Date.now()
      });
      return {
        success: true,
        jobs: finalJobs,
        totalFound: aggregatedJobs.length,
        cached: false,
        provider: "OpenWeb Ninja JSearch"
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();
  inFlightRequests.set(cacheKey, searchPromise);
  return searchPromise;
}
var queryCache, QUERY_CACHE_TTL_MS, inFlightRequests;
var init_jsearch = __esm({
  "api/_lib/jsearch.ts"() {
    init_jobDiscovery();
    queryCache = /* @__PURE__ */ new Map();
    QUERY_CACHE_TTL_MS = 30 * 60 * 1e3;
    inFlightRequests = /* @__PURE__ */ new Map();
  }
});

// api/_lib/jobDiscovery.ts
var jobDiscovery_exports = {};
__export(jobDiscovery_exports, {
  INDIA_LOCATIONS: () => INDIA_LOCATIONS,
  applyHeuristicScores: () => applyHeuristicScores,
  applySingleHeuristicScore: () => applySingleHeuristicScore,
  canonicalizeUrl: () => canonicalizeUrl,
  classifyJobLocation: () => classifyJobLocation,
  deduplicateJobs: () => deduplicateJobs,
  evaluateJobRelevance: () => evaluateJobRelevance,
  extractSkillsFromText: () => extractSkillsFromText,
  formatRelativeDate: () => formatRelativeDate,
  parsePostingTimestamp: () => parsePostingTimestamp,
  parseQueryIntent: () => parseQueryIntent,
  rankAndScoreJobsWithAI: () => rankAndScoreJobsWithAI,
  searchRealJobs: () => searchRealJobs,
  sortJobsByPostingDateNewestFirst: () => sortJobsByPostingDateNewestFirst,
  stripHtml: () => stripHtml
});
function stripHtml(raw) {
  if (!raw) return "";
  return raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'").replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"').replace(/&ndash;/g, "-").replace(/&mdash;/g, "-").replace(/\s+/g, " ").trim();
}
function formatRelativeDate(input) {
  if (!input) return "Recently posted";
  try {
    let dateMs;
    if (typeof input === "number") {
      dateMs = input > 1e11 ? input : input * 1e3;
    } else {
      const parsed = Date.parse(input);
      if (isNaN(parsed)) return "Recently posted";
      dateMs = parsed;
    }
    const now = Date.now();
    const diffSec = Math.floor((now - dateMs) / 1e3);
    if (diffSec < 0) return "Just now";
    if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
    if (diffSec < 86400 * 30) return `${Math.floor(diffSec / (86400 * 7))}w ago`;
    return `${Math.floor(diffSec / (86400 * 30))}mo ago`;
  } catch {
    return "Recently posted";
  }
}
function parsePostingTimestamp(dateVal) {
  if (!dateVal) return 0;
  if (typeof dateVal === "number") {
    return dateVal > 1e11 ? dateVal : dateVal * 1e3;
  }
  const parsed = Date.parse(dateVal);
  if (!isNaN(parsed)) return parsed;
  const m = String(dateVal).trim().match(/^(\d+)\s*([mhdwo])\b/i);
  if (m) {
    const val = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const now = Date.now();
    if (unit === "m") return now - val * 60 * 1e3;
    if (unit === "h") return now - val * 3600 * 1e3;
    if (unit === "d") return now - val * 86400 * 1e3;
    if (unit === "w") return now - val * 7 * 86400 * 1e3;
    if (unit === "o") return now - val * 30 * 86400 * 1e3;
  }
  return 0;
}
function sortJobsByPostingDateNewestFirst(jobs) {
  return [...jobs].sort((a, b) => {
    const timeA = parsePostingTimestamp(a.postedAt) || parsePostingTimestamp(a.datePosted);
    const timeB = parsePostingTimestamp(b.postedAt) || parsePostingTimestamp(b.datePosted);
    if (timeA !== timeB && timeA > 0 && timeB > 0) {
      return timeB - timeA;
    }
    if (timeB > 0 && timeA === 0) return 1;
    if (timeA > 0 && timeB === 0) return -1;
    return (b.matchScore || 0) - (a.matchScore || 0);
  });
}
function extractSkillsFromText(title, description, tags = []) {
  const skillsSet = /* @__PURE__ */ new Set();
  for (const t of tags) {
    if (typeof t === "string" && t.trim().length > 1 && t.trim().length < 25) {
      skillsSet.add(t.trim());
    }
  }
  const textToScan = `${title} ${description}`.toLowerCase();
  const KNOWN_PATTERNS = [
    { pattern: /\b(react|reactjs|react\.js)\b/i, skill: "React" },
    { pattern: /\b(typescript|ts)\b/i, skill: "TypeScript" },
    { pattern: /\b(javascript|js|es6)\b/i, skill: "JavaScript" },
    { pattern: /\b(nextjs|next\.js)\b/i, skill: "Next.js" },
    { pattern: /\b(vue|vuejs)\b/i, skill: "Vue.js" },
    { pattern: /\b(angular)\b/i, skill: "Angular" },
    { pattern: /\b(tailwind|tailwindcss)\b/i, skill: "Tailwind CSS" },
    { pattern: /\b(python)\b/i, skill: "Python" },
    { pattern: /\b(node|nodejs|node\.js)\b/i, skill: "Node.js" },
    { pattern: /\b(express|expressjs)\b/i, skill: "Express" },
    { pattern: /\b(golang|go)\b/i, skill: "Go" },
    { pattern: /\b(rust)\b/i, skill: "Rust" },
    { pattern: /\b(java)\b/i, skill: "Java" },
    { pattern: /\b(c\+\+|cpp)\b/i, skill: "C++" },
    { pattern: /\b(c#|\.net)\b/i, skill: ".NET" },
    { pattern: /\b(ruby|rails)\b/i, skill: "Ruby on Rails" },
    { pattern: /\b(sql|postgres|postgresql|mysql)\b/i, skill: "SQL" },
    { pattern: /\b(mongodb|nosql)\b/i, skill: "MongoDB" },
    { pattern: /\b(docker)\b/i, skill: "Docker" },
    { pattern: /\b(kubernetes|k8s)\b/i, skill: "Kubernetes" },
    { pattern: /\b(aws|amazon web services)\b/i, skill: "AWS" },
    { pattern: /\b(gcp|google cloud)\b/i, skill: "GCP" },
    { pattern: /\b(azure)\b/i, skill: "Azure" },
    { pattern: /\b(graphql)\b/i, skill: "GraphQL" },
    { pattern: /\b(rest|restful|api)\b/i, skill: "REST APIs" },
    { pattern: /\b(llm|llms|rag|genai)\b/i, skill: "Generative AI" },
    { pattern: /\b(machine learning|deep learning|pytorch|tensorflow)\b/i, skill: "Machine Learning" }
  ];
  for (const item of KNOWN_PATTERNS) {
    if (item.pattern.test(textToScan)) {
      skillsSet.add(item.skill);
    }
  }
  const list = Array.from(skillsSet);
  if (list.length === 0) {
    return ["Software Engineering", "System Architecture", "Problem Solving"];
  }
  return list.slice(0, 8);
}
async function fetchArbeitnowJobs() {
  const now = Date.now();
  if (arbeitnowCache && now - arbeitnowCache.timestamp < CACHE_TTL_MS) {
    return arbeitnowCache.jobs;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[JobDiscovery] Arbeitnow returned status ${res.status}`);
      return arbeitnowCache?.jobs || [];
    }
    const data = await res.json();
    const rawList = Array.isArray(data?.data) ? data.data : [];
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const normalized = rawList.map((item) => {
      const plainDesc = stripHtml(item.description || "");
      const fullDesc = plainDesc ? plainDesc.length > 5e3 ? plainDesc.slice(0, 5e3) + "..." : plainDesc : "No job description was provided by the source listing. Refer to the official posting link for full requirements.";
      const isRemote = Boolean(item.remote);
      const loc = item.location ? item.location.trim() : isRemote ? "Remote" : "Location not specified";
      const jobTypes = Array.isArray(item.job_types) ? item.job_types.join(", ") : void 0;
      const rawTags = Array.isArray(item.tags) ? item.tags : [];
      const derivedSkills = extractSkillsFromText(item.title || "", fullDesc, rawTags);
      return {
        id: `arbeitnow-${item.slug || Math.random().toString(36).slice(2)}`,
        title: (item.title || "Software Engineer").trim(),
        company: (item.company_name || "Hiring Enterprise").trim(),
        location: loc,
        link: item.url || "https://www.arbeitnow.com/",
        description: fullDesc,
        skills: derivedSkills,
        datePosted: formatRelativeDate(item.created_at),
        source: "Arbeitnow",
        provider: "Arbeitnow",
        retrievedAt,
        jobType: jobTypes,
        isRemote,
        tags: rawTags
      };
    }).filter((j) => j.title && j.link);
    arbeitnowCache = { jobs: normalized, timestamp: now };
    return normalized;
  } catch (err) {
    console.warn("[JobDiscovery] Failed to fetch Arbeitnow:", err.message);
    return arbeitnowCache?.jobs || [];
  }
}
async function fetchRemoteOKJobs() {
  const now = Date.now();
  if (remoteokCache && now - remoteokCache.timestamp < CACHE_TTL_MS) {
    return remoteokCache.jobs;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[JobDiscovery] RemoteOK returned status ${res.status}`);
      return remoteokCache?.jobs || [];
    }
    const data = await res.json();
    const rawList = Array.isArray(data) ? data.slice(1) : [];
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const normalized = rawList.map((item) => {
      const plainDesc = stripHtml(item.description || "");
      const fullDesc = plainDesc ? plainDesc.length > 5e3 ? plainDesc.slice(0, 5e3) + "..." : plainDesc : "No job description was provided by the source listing. Refer to the official posting link for full requirements.";
      const directUrl = item.apply_url || item.url || (item.slug ? `https://remoteok.com/remote-jobs/${item.slug}` : "");
      const rawTags = Array.isArray(item.tags) ? item.tags : [];
      const derivedSkills = extractSkillsFromText(item.position || "Software Engineer", fullDesc, rawTags);
      return {
        id: `remoteok-${item.id || item.slug || Math.random().toString(36).slice(2)}`,
        title: (item.position || "Software Engineer").trim(),
        company: (item.company || "Tech Company").trim(),
        location: (item.location || "Remote / Worldwide").trim(),
        link: directUrl || "https://remoteok.com/",
        description: fullDesc,
        skills: derivedSkills,
        datePosted: formatRelativeDate(item.epoch || item.date),
        source: "RemoteOK",
        provider: "RemoteOK",
        retrievedAt,
        jobType: "Full-time",
        isRemote: true,
        tags: rawTags
      };
    }).filter((j) => j.title && j.link);
    remoteokCache = { jobs: normalized, timestamp: now };
    return normalized;
  } catch (err) {
    console.warn("[JobDiscovery] Failed to fetch RemoteOK:", err.message);
    return remoteokCache?.jobs || [];
  }
}
function canonicalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl.trim());
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
      "fbclid",
      "gclid",
      "twclid",
      "yclid",
      "msclkid",
      "_ga",
      "_gl",
      "session_id"
    ];
    for (const p of trackingParams) {
      url.searchParams.delete(p);
    }
    let path2 = url.pathname.replace(/\/+$/, "");
    if (!path2) path2 = "/";
    url.pathname = path2;
    url.hash = "";
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }
    return url.toString().toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase().split("?")[0].replace(/\/+$/, "");
  }
}
function deduplicateJobs(jobs) {
  const seenIds = /* @__PURE__ */ new Set();
  const seenUrls = /* @__PURE__ */ new Set();
  const seenNormalizedKeys = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const job of jobs) {
    if (!job || !job.title || !job.link) continue;
    const provider = (job.provider || job.source || "job").toLowerCase().trim();
    if (job.id && job.id.trim()) {
      const idKey = `${provider}:${job.id.trim().toLowerCase()}`;
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);
    }
    const canonUrl = canonicalizeUrl(job.link);
    if (canonUrl && canonUrl.length > 5) {
      if (seenUrls.has(canonUrl)) continue;
      seenUrls.add(canonUrl);
    }
    const normTitle = job.title.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    const normCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    const normLoc = job.location.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    const textKey = `${normTitle}|${normCompany}|${normLoc}`;
    if (seenNormalizedKeys.has(textKey)) continue;
    seenNormalizedKeys.add(textKey);
    deduped.push(job);
  }
  return deduped;
}
function classifyJobLocation(job, targetLoc) {
  const cleanTarget = (targetLoc || "").trim().toLowerCase();
  const locLower = (job.location || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  if (!cleanTarget) {
    return {
      isCompatible: true,
      isExact: true,
      classification: job.isRemote ? "Related Location" : "Exact Location Match",
      locationBadge: job.isRemote ? "Remote" : job.location || "Location Open",
      explanation: "No specific location constraint was specified."
    };
  }
  const isTargetIndia = cleanTarget === "india" || cleanTarget.includes("india") || Array.from(INDIA_LOCATIONS).some((k) => {
    const r = new RegExp(`\\b${k}\\b`, "i");
    return r.test(cleanTarget);
  });
  if (isTargetIndia) {
    const hasIndiaInLoc = locLower.includes("india") || Array.from(INDIA_LOCATIONS).some((k) => {
      const regex = new RegExp(`\\b${k}\\b`, "i");
      return regex.test(locLower);
    });
    const hasIndiaInDesc = /\b(based in india|office in (bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|gurugram|noida)|candidates in india|hiring in india|work from india)\b/i.test(descLower);
    if (hasIndiaInLoc || hasIndiaInDesc) {
      return {
        isCompatible: true,
        isExact: true,
        classification: "India Match",
        locationBadge: "India Match",
        explanation: "Verified position based in or hiring directly within India."
      };
    }
    const isExcludedRegion = /\b(usa? only|us only|united states only|north america only|canada only|europe only|eu only|uk only|latin america|latam only|apac only|germany only)\b/i.test(locLower) || /\b(must reside in (the )?(us|usa|united states|canada|europe|uk|germany)|only (us|usa|united states|uk|eu) citizens|authorized to work in (the )?(us|usa|united states)|must be based in (the )?(us|usa|europe|uk))\b/i.test(descLower);
    const isExplicitOtherCountry = /\b(germany|deutschland|berlin|munich|hamburg|frankfurt|london|united kingdom|uk|france|paris|spain|madrid|barcelona|poland|warsaw|netherlands|amsterdam|canada|toronto|vancouver|australia|sydney|singapore|japan|tokyo|austin|san francisco|california|new york|chicago|seattle)\b/i.test(locLower);
    if (!job.isRemote && isExplicitOtherCountry) {
      return {
        isCompatible: false,
        isExact: false,
        classification: "Incompatible Location",
        locationBadge: "Incompatible Location",
        explanation: `Position is located in ${job.location}, incompatible with India search.`
      };
    }
    if (isExcludedRegion && !locLower.includes("worldwide") && !locLower.includes("anywhere")) {
      return {
        isCompatible: false,
        isExact: false,
        classification: "Incompatible Location",
        locationBadge: "Incompatible Location",
        explanation: "Job restricts hiring eligibility to candidates outside of India."
      };
    }
    const isWorldwideRemote = job.isRemote || locLower.includes("remote") || locLower.includes("worldwide") || locLower.includes("anywhere");
    if (isWorldwideRemote) {
      return {
        isCompatible: true,
        isExact: false,
        // Per strict user instructions: worldwide remote is NOT an exact India match!
        classification: "Location Not Confirmed",
        locationBadge: "Worldwide Remote \u2014 India Unconfirmed",
        explanation: "Global remote opening; India-specific employment eligibility is not explicitly confirmed by the provider."
      };
    }
    return {
      isCompatible: false,
      isExact: false,
      classification: "Incompatible Location",
      locationBadge: "Incompatible Location",
      explanation: `Location (${job.location}) does not match India.`
    };
  }
  if (cleanTarget.includes("remote") || cleanTarget.includes("worldwide")) {
    if (job.isRemote || locLower.includes("remote") || locLower.includes("worldwide")) {
      return {
        isCompatible: true,
        isExact: true,
        classification: "Exact Location Match",
        locationBadge: "Remote",
        explanation: "Verified remote opportunity."
      };
    }
  }
  if (locLower.includes(cleanTarget)) {
    return {
      isCompatible: true,
      isExact: true,
      classification: "Exact Location Match",
      locationBadge: `${job.location} Match`,
      explanation: `Position based in requested location: ${job.location}.`
    };
  }
  if (job.isRemote || locLower.includes("remote") || locLower.includes("worldwide")) {
    return {
      isCompatible: true,
      isExact: false,
      classification: "Related Location",
      locationBadge: "Remote / Worldwide",
      explanation: `Remote opportunity; specific eligibility for ${targetLoc} unconfirmed.`
    };
  }
  return {
    isCompatible: false,
    isExact: false,
    classification: "Incompatible Location",
    locationBadge: "Incompatible Location",
    explanation: `Position based in ${job.location}, incompatible with ${targetLoc}.`
  };
}
function parseQueryIntent(rawQuery) {
  const norm = (rawQuery || "").trim().toLowerCase();
  const isInternship = /\b(intern|internship|trainee|apprentice|co-op)\b/i.test(norm);
  let seniority = void 0;
  if (isInternship) {
    seniority = "intern";
  } else if (/\b(junior|jr|entry[ -]?level|associate)\b/i.test(norm)) {
    seniority = "junior";
  } else if (/\b(lead|principal|staff|director|head of|architect)\b/i.test(norm)) {
    seniority = "lead";
  } else if (/\b(senior|sr)\b/i.test(norm)) {
    seniority = "senior";
  }
  const isAgentSpecific = /\b(agent|agents|agentic|ai agent)\b/i.test(norm);
  let requiredFunction = "general";
  if (/\b(developer|engineer|engineering|programmer|coder|swe|sde|architect)\b/i.test(norm)) {
    requiredFunction = "developer";
  } else if (/\b(data analyst|analytics|business intelligence|bi analyst)\b/i.test(norm)) {
    requiredFunction = "data_analyst";
  } else if (/\b(product manager|product owner|product engineer)\b/i.test(norm)) {
    requiredFunction = "product";
  } else if (/\b(qa|quality assurance|tester|test automation|sdet)\b/i.test(norm)) {
    requiredFunction = "qa";
  } else if (/\b(devops|sre|site reliability|cloud engineer|platform engineer)\b/i.test(norm)) {
    requiredFunction = "devops";
  }
  let primaryDomain = "general_swe";
  if (/\b(ai|artificial intelligence|ml|machine learning|deep learning|llm|llms|nlp|computer vision|genai|agent|applied ai)\b/i.test(norm)) {
    primaryDomain = "ai_ml";
  } else if (/\b(data analyst|data analytics|analytics|bi analyst|business intelligence|data scientist|data engineer|sql)\b/i.test(norm)) {
    primaryDomain = "data";
  } else if (/\b(product engineer|product engineering|product manager|product management|pm|product owner)\b/i.test(norm)) {
    primaryDomain = "product";
  } else if (/\b(frontend|front-end|react|vue|angular|ui developer|web developer)\b/i.test(norm)) {
    primaryDomain = "frontend";
  } else if (/\b(backend|back-end|node|express|django|flask|spring|ruby|rails|golang|rust)\b/i.test(norm)) {
    primaryDomain = "backend";
  } else if (/\b(fullstack|full-stack|full stack)\b/i.test(norm)) {
    primaryDomain = "fullstack";
  } else if (/\b(devops|sre|site reliability|cloud engineer|platform engineer|infrastructure|kubernetes)\b/i.test(norm)) {
    primaryDomain = "devops";
  } else if (/\b(mobile|ios|android|flutter|react native)\b/i.test(norm)) {
    primaryDomain = "mobile";
  } else if (/\b(qa|quality assurance|tester|test automation|sdet)\b/i.test(norm)) {
    primaryDomain = "qa";
  }
  const stopWords = /* @__PURE__ */ new Set([
    "and",
    "or",
    "the",
    "in",
    "at",
    "for",
    "with",
    "to",
    "of",
    "a",
    "an",
    "role",
    "roles",
    "job",
    "jobs",
    "position",
    "positions",
    "career",
    "opportunity",
    "hiring",
    "looking",
    "wanted",
    "need",
    "needed"
  ]);
  const keyTerms = norm.split(/[\s,/\-_]+/).map((t) => t.trim()).filter((t) => t.length > 1 && !stopWords.has(t));
  return {
    rawQuery,
    normalizedQuery: norm,
    isInternship,
    seniority,
    primaryDomain,
    requiredFunction,
    isAgentSpecific,
    keyTerms,
    roleKeywords: keyTerms.filter((t) => !["intern", "internship", "trainee", "senior", "junior", "lead", "staff"].includes(t))
  };
}
function evaluateJobRelevance(job, intent, cleanLoc) {
  const titleLower = job.title.toLowerCase();
  const descLower = job.description.toLowerCase();
  const tagsLower = (job.tags || []).map((t) => t.toLowerCase());
  const locResult = classifyJobLocation(job, cleanLoc);
  if (!locResult.isCompatible) {
    return {
      isRelevant: false,
      score: 0,
      relevanceCategory: "related",
      relevanceLabel: "Related Match",
      locationMatch: locResult.locationBadge,
      missingCriteria: ["Incompatible Location"],
      explanation: locResult.explanation
    };
  }
  if (intent.requiredFunction === "developer") {
    const isNonEngRole = /\b(kundenservice|customer support|customer service|copywriter|writer|marketing|sales|talent acquisition|recruiter|human resources|hr |bartender|care navigator|decorator|online bidder|virtual assistant|venture development|business development|gtm academy|product designer|grafikdesigner|graphic designer|brand designer|office assistant|inbound)\b/i.test(titleLower);
    if (isNonEngRole) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: locResult.locationBadge,
        missingCriteria: ["Non-engineering position"],
        explanation: `Non-engineering role (${job.title}) incompatible with developer search.`
      };
    }
  }
  if (intent.primaryDomain === "ai_ml") {
    const hasAiInTitle = /\b(ai|ml|machine learning|deep learning|llm|llms|nlp|agent|data science|applied ai|generative ai)\b/i.test(titleLower);
    const hasAiInTags = tagsLower.some((t) => /\b(ai|ml|machine learning|deep learning|llm|genai|nlp|agent)\b/i.test(t));
    const hasAiInDesc = /\b(machine learning|artificial intelligence|large language model|llm|deep learning|neural network|genai|ai agent|autonomous agent)\b/i.test(descLower);
    if (!hasAiInTitle && !hasAiInTags && !hasAiInDesc) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: locResult.locationBadge,
        missingCriteria: ["No AI/ML requirement"],
        explanation: "Position does not involve AI, ML, or agentic development."
      };
    }
    if (intent.isAgentSpecific && !titleLower.includes("agent") && !descLower.includes("agent") && !tagsLower.some((t) => t.includes("agent")) && !descLower.includes("llm") && !descLower.includes("genai")) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: locResult.locationBadge,
        missingCriteria: ["Not agent-focused"],
        explanation: "Role does not focus on AI agents or LLM systems."
      };
    }
  } else if (intent.primaryDomain === "data") {
    const hasDataInTitle = /\b(data|analytics|analyst|bi|business intelligence|scientist|sql)\b/i.test(titleLower);
    const hasDataInTags = tagsLower.some((t) => /\b(data|analytics|sql|bi)\b/i.test(t));
    if (!hasDataInTitle && !hasDataInTags) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: locResult.locationBadge,
        missingCriteria: ["No data analytics alignment"],
        explanation: "Role does not align with data analysis or analytics."
      };
    }
    if (/\b(frontend|react|devops|full[- ]stack|rails|shopify)\b/i.test(titleLower) && !hasDataInTitle) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: locResult.locationBadge,
        missingCriteria: ["Unrelated software engineering"],
        explanation: "Generic software engineering role does not match data analyst query."
      };
    }
  } else if (intent.normalizedQuery.includes("react")) {
    const hasReactInTitle = /\b(react|reactjs|react\.js)\b/i.test(titleLower);
    const hasReactInSkills = (job.skills || []).some((s) => s.toLowerCase().includes("react"));
    const hasReactInTags = tagsLower.some((t) => t.includes("react"));
    const hasReactInDesc = /\b(react|reactjs|react\.js)\b/i.test(descLower);
    if (!hasReactInTitle && !hasReactInSkills && !hasReactInTags && !hasReactInDesc) {
      return {
        isRelevant: false,
        score: 0,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: locResult.locationBadge,
        missingCriteria: ["No React requirement"],
        explanation: "Role does not require React."
      };
    }
  }
  const jobIsIntern = /\b(intern|internship|trainee|apprentice|co-op)\b/i.test(titleLower) || tagsLower.some((t) => /\b(intern|internship)\b/i.test(t)) || /\b(intern|internship|trainee)\b/i.test(descLower.slice(0, 400));
  const jobIsSenior = /\b(senior|sr|lead|principal|staff|director|head of|architect)\b/i.test(titleLower);
  if (intent.isInternship && jobIsSenior) {
    return {
      isRelevant: false,
      score: 0,
      relevanceCategory: "related",
      relevanceLabel: "Related Match",
      locationMatch: locResult.locationBadge,
      missingCriteria: ["Senior role incompatible with internship"],
      explanation: "Senior or lead role is incompatible with an internship search."
    };
  }
  let baseScore = 65;
  let exactTitleMatch = false;
  if (titleLower.includes(intent.normalizedQuery)) {
    baseScore += 30;
    exactTitleMatch = true;
  } else {
    const matchedKeywords = intent.roleKeywords.filter((k) => titleLower.includes(k));
    if (intent.roleKeywords.length > 0) {
      const ratio = matchedKeywords.length / intent.roleKeywords.length;
      baseScore += ratio * 24;
      if (ratio >= 0.75) exactTitleMatch = true;
    }
  }
  for (const k of intent.roleKeywords) {
    if (tagsLower.some((t) => t.includes(k))) baseScore += 4;
    if ((job.skills || []).some((s) => s.toLowerCase().includes(k))) baseScore += 4;
  }
  if (intent.roleKeywords.some((k) => descLower.includes(k))) {
    baseScore += 3;
  }
  const missingCriteria = [];
  if (cleanLoc && !locResult.isExact) {
    missingCriteria.push(locResult.locationBadge);
  }
  if (intent.isInternship && !jobIsIntern) {
    missingCriteria.push("Full-Time (Not Internship)");
  }
  if (!intent.isInternship && intent.seniority === "senior" && !jobIsSenior) {
    missingCriteria.push("Mid-Level (Not Senior)");
  }
  let relevanceCategory = "exact";
  let relevanceLabel = "Exact Match";
  let explanation = "";
  if (missingCriteria.length === 0) {
    relevanceCategory = "exact";
    if (exactTitleMatch) {
      relevanceLabel = "Exact Match";
      baseScore = Math.min(97, Math.max(90, baseScore));
      explanation = `Verified ${job.title} meeting your exact search criteria.`;
    } else {
      relevanceLabel = "Strong Match";
      baseScore = Math.min(88, Math.max(82, baseScore));
      explanation = `Strong technical alignment with ${job.title}.`;
    }
  } else {
    relevanceCategory = "related";
    relevanceLabel = "Related Match";
    baseScore = Math.min(74, Math.max(60, Math.round(baseScore * 0.75)));
    const criteriaText = missingCriteria.join(", ");
    if (intent.isInternship && !jobIsIntern && !locResult.isExact) {
      explanation = `Verified full-time ${job.title} role; global remote (internship not specified, India unconfirmed).`;
    } else if (intent.isInternship && !jobIsIntern) {
      explanation = `Verified full-time role in ${job.title} (no active internship opening found).`;
    } else if (!locResult.isExact) {
      explanation = `Verified ${job.title} opening; remote worldwide (${locResult.locationBadge}).`;
    } else {
      explanation = `Related opportunity in ${job.title} (${criteriaText}).`;
    }
  }
  return {
    isRelevant: true,
    score: Math.min(98, Math.max(50, Math.round(baseScore))),
    relevanceCategory,
    relevanceLabel,
    locationMatch: locResult.locationBadge,
    missingCriteria,
    explanation
  };
}
async function fetchRemotiveJobs(query) {
  const cleanQ = (query || "").trim().toLowerCase();
  const cacheKey = cleanQ || "__all__";
  const now = Date.now();
  const cached = remotiveQueryCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.jobs;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    let searchParam = cleanQ;
    if (/\b(ai|ml|agent)\b/i.test(cleanQ)) {
      searchParam = "ai";
    } else if (/\b(data)\b/i.test(cleanQ)) {
      searchParam = "data";
    } else if (/\b(react)\b/i.test(cleanQ)) {
      searchParam = "react";
    } else if (/\b(frontend|front-end)\b/i.test(cleanQ)) {
      searchParam = "frontend";
    } else if (/\b(backend|back-end)\b/i.test(cleanQ)) {
      searchParam = "backend";
    } else if (/\b(intern|internship)\b/i.test(cleanQ)) {
      searchParam = "intern";
    }
    const url = searchParam ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchParam)}&limit=50` : "https://remotive.com/api/remote-jobs?limit=50";
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[JobDiscovery] Remotive returned status ${res.status}`);
      return cached?.jobs || [];
    }
    const data = await res.json();
    const rawList = Array.isArray(data?.jobs) ? data.jobs : [];
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const normalized = rawList.map((item) => {
      const plainDesc = stripHtml(item.description || "");
      const fullDesc = plainDesc ? plainDesc.length > 5e3 ? plainDesc.slice(0, 5e3) + "..." : plainDesc : "No job description was provided by the source listing. Refer to the official posting link for full requirements.";
      const loc = item.candidate_required_location ? item.candidate_required_location.trim() : "Remote / Worldwide";
      const jobType = item.job_type ? item.job_type.replace(/_/g, " ") : "Full-time";
      const rawTags = Array.isArray(item.tags) ? item.tags : [];
      const derivedSkills = extractSkillsFromText(item.title || "Developer", fullDesc, rawTags);
      return {
        id: `remotive-${item.id || Math.random().toString(36).slice(2)}`,
        title: (item.title || "Developer").trim(),
        company: (item.company_name || "Remote Enterprise").trim(),
        location: loc,
        link: item.url || "https://remotive.com/",
        description: fullDesc,
        skills: derivedSkills,
        datePosted: formatRelativeDate(item.publication_date),
        source: "Remotive",
        provider: "Remotive",
        retrievedAt,
        jobType,
        isRemote: true,
        tags: rawTags
      };
    }).filter((j) => j.title && j.link);
    if (remotiveQueryCache.size > 30) {
      remotiveQueryCache.clear();
    }
    remotiveQueryCache.set(cacheKey, { jobs: normalized, timestamp: now });
    return normalized;
  } catch (err) {
    console.warn("[JobDiscovery] Failed to fetch Remotive:", err.message);
    return cached?.jobs || [];
  }
}
async function searchRealJobs({
  query,
  location = "",
  limit = 12,
  employmentType,
  isRemote,
  datePosted,
  allowFallback = false
}) {
  const cleanQuery = (query || "").trim();
  const cleanLoc = (location || "").trim();
  const { queryOpenWebNinjaJSearch: queryOpenWebNinjaJSearch2, isJSearchConfigured: isJSearchConfigured2 } = await Promise.resolve().then(() => (init_jsearch(), jsearch_exports));
  if (isJSearchConfigured2()) {
    const jsearchRes = await queryOpenWebNinjaJSearch2({
      query: cleanQuery,
      location: cleanLoc,
      employmentType,
      isRemote,
      datePosted,
      limit
    });
    if (jsearchRes.success && jsearchRes.jobs.length > 0) {
      const intent2 = parseQueryIntent(cleanQuery);
      const qualifiedJobs2 = [];
      for (const job of jsearchRes.jobs) {
        const evalResult = evaluateJobRelevance(job, intent2, cleanLoc);
        qualifiedJobs2.push({
          ...job,
          matchScore: evalResult.score,
          relevanceCategory: evalResult.relevanceCategory,
          relevanceLabel: evalResult.relevanceLabel,
          locationMatch: evalResult.locationMatch,
          missingCriteria: evalResult.missingCriteria,
          roleTier: evalResult.score >= 85 ? "safe" : evalResult.score >= 75 ? "stretch" : "reach",
          matchExplanation: evalResult.explanation
        });
      }
      const sortedJobs = sortJobsByPostingDateNewestFirst(qualifiedJobs2);
      return {
        jobs: sortedJobs.slice(0, Math.max(15, limit)),
        provider: "OpenWeb Ninja JSearch",
        isConfigured: true,
        totalFound: jsearchRes.totalFound,
        cached: jsearchRes.cached
      };
    } else {
      console.warn(`[JobDiscovery] JSearch ${!jsearchRes.success ? `error (${jsearchRes.errorCode}): ${jsearchRes.error}` : "returned 0 vacancies"}. Seamlessly querying verified public live feeds.`);
    }
  }
  const [arbeitnowRes, remoteokRes, remotiveRes] = await Promise.allSettled([
    fetchArbeitnowJobs(),
    fetchRemoteOKJobs(),
    fetchRemotiveJobs(cleanQuery || void 0)
  ]);
  const rawJobs = [];
  if (arbeitnowRes.status === "fulfilled") rawJobs.push(...arbeitnowRes.value);
  if (remoteokRes.status === "fulfilled") rawJobs.push(...remoteokRes.value);
  if (remotiveRes.status === "fulfilled") rawJobs.push(...remotiveRes.value);
  if (rawJobs.length === 0) {
    return {
      jobs: [],
      provider: "Verified Feeds (Fallback)",
      isConfigured: false,
      totalFound: 0,
      errorCode: "PROVIDERS_UNREACHABLE",
      error: "Public job feeds are currently unreachable. Please try again in a moment."
    };
  }
  const dedupedJobs = deduplicateJobs(rawJobs);
  if (!cleanQuery) {
    return {
      jobs: dedupedJobs.slice(0, limit).map((j) => ({
        ...j,
        relevanceCategory: "related",
        relevanceLabel: "Related Match",
        locationMatch: j.isRemote ? "Remote" : j.location || "Location Open",
        missingCriteria: [],
        matchScore: 80,
        roleTier: "stretch",
        matchExplanation: `Verified live opening at ${j.company} from ${j.source}.`
      })),
      provider: "Verified Feeds (Fallback)",
      isConfigured: false,
      totalFound: dedupedJobs.length
    };
  }
  const intent = parseQueryIntent(cleanQuery);
  const qualifiedJobs = [];
  for (const job of dedupedJobs) {
    const evalResult = evaluateJobRelevance(job, intent, cleanLoc);
    if (!evalResult.isRelevant) {
      continue;
    }
    qualifiedJobs.push({
      ...job,
      matchScore: evalResult.score,
      relevanceCategory: evalResult.relevanceCategory,
      relevanceLabel: evalResult.relevanceLabel,
      locationMatch: evalResult.locationMatch,
      missingCriteria: evalResult.missingCriteria,
      roleTier: evalResult.score >= 85 ? "safe" : evalResult.score >= 75 ? "stretch" : "reach",
      matchExplanation: evalResult.explanation
    });
  }
  qualifiedJobs.sort((a, b) => {
    const aIsExact = a.relevanceCategory === "exact" ? 1 : 0;
    const bIsExact = b.relevanceCategory === "exact" ? 1 : 0;
    if (bIsExact !== aIsExact) return bIsExact - aIsExact;
    const tierPriority = (label) => {
      if (!label) return 0;
      if (label.includes("Exact")) return 3;
      if (label.includes("Strong")) return 2;
      return 1;
    };
    const tierDiff = tierPriority(b.relevanceLabel) - tierPriority(a.relevanceLabel);
    if (tierDiff !== 0) return tierDiff;
    return (b.matchScore || 0) - (a.matchScore || 0);
  });
  return {
    jobs: qualifiedJobs.slice(0, limit),
    provider: "Verified Feeds (Fallback)",
    isConfigured: false,
    totalFound: qualifiedJobs.length
  };
}
function applySingleHeuristicScore(job, profileText) {
  const profileLower = (profileText || "").toLowerCase();
  const titleWords = job.title.toLowerCase().split(/[\s,/\-_]+/).filter((w) => w.length > 2);
  let matchPoints = job.matchScore || 72;
  if (profileLower) {
    for (const w of titleWords) {
      if (profileLower.includes(w)) matchPoints += 4;
    }
    for (const t of job.tags || []) {
      if (profileLower.includes(t.toLowerCase())) matchPoints += 3;
    }
  }
  let maxCap = 96;
  if (job.relevanceCategory === "related" || job.relevanceLabel === "Related Match") {
    maxCap = 75;
  }
  const score = Math.min(maxCap, Math.max(55, matchPoints));
  const roleTier = score >= 85 ? "safe" : score >= 75 ? "stretch" : "reach";
  const explanation = job.matchExplanation || (profileText ? `Verified opening matching your background in ${job.tags?.[0] || job.title.split(" ")[0] || "technology"}.` : `Verified live opening at ${job.company} from ${job.source}.`);
  return {
    ...job,
    matchScore: score,
    roleTier,
    matchExplanation: explanation,
    relevanceCategory: job.relevanceCategory,
    relevanceLabel: job.relevanceLabel,
    locationMatch: job.locationMatch,
    missingCriteria: job.missingCriteria
  };
}
function applyHeuristicScores(jobs, profileText) {
  return jobs.map((j) => applySingleHeuristicScore(j, profileText));
}
async function rankAndScoreJobsWithAI({
  jobs,
  candidateProfile,
  callVelona
}) {
  if (!jobs || jobs.length === 0) return [];
  if (!candidateProfile || !callVelona) {
    return applyHeuristicScores(jobs, candidateProfile);
  }
  try {
    const jobSummaries = jobs.map((j, idx) => ({
      index: idx,
      title: j.title,
      company: j.company,
      location: j.location,
      relevanceCategory: j.relevanceCategory,
      relevanceLabel: j.relevanceLabel,
      locationMatch: j.locationMatch,
      missingCriteria: j.missingCriteria || [],
      tags: j.tags?.slice(0, 5) || []
    }));
    const prompt = `You are the candidate matching engine for AI HireFlow.
Compare the candidate's skills and background against these REAL job openings.

Candidate Background:
${candidateProfile.slice(0, 1e3)}

Real Job Openings to Evaluate:
${JSON.stringify(jobSummaries, null, 2)}

Instructions:
1. For each job, evaluate how candidate skills align with the role.
2. If relevanceCategory is "related" or relevanceLabel is "Related Match", do NOT give a matchScore above 75, as this job does not satisfy all primary constraints.
3. Output a JSON array with one object per job:
[
  {
    "index": 0,
    "matchScore": 85,
    "roleTier": "safe",
    "matchExplanation": "One concise sentence under 15 words explaining candidate skill fit."
  }
]
IMPORTANT: Return raw JSON only. Do NOT modify or output job titles, companies, or links.`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5e3);
    let velonaResponse;
    try {
      velonaResponse = await callVelona({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        jsonMode: true,
        maxTokens: 800,
        operation: "job_match",
        signal: controller.signal
      });
    } catch (err) {
      if (err?.name === "AbortError" || err?.code === "TIMEOUT") {
        console.warn("[JobDiscovery] Velona semantic scoring timed out after 5s; falling back to instant heuristic scoring.");
        return applyHeuristicScores(jobs, candidateProfile);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    const rawContent = velonaResponse?.content || velonaResponse?.text || "";
    const cleaned = rawContent.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    const scoreMap = /* @__PURE__ */ new Map();
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item?.index === "number") {
          scoreMap.set(item.index, item);
        }
      }
    }
    return jobs.map((job, idx) => {
      const aiScore = scoreMap.get(idx);
      if (aiScore) {
        let maxCap = 98;
        if (job.relevanceCategory === "related" || job.relevanceLabel === "Related Match") {
          maxCap = 75;
        }
        const rawScore = typeof aiScore.matchScore === "number" ? Math.round(aiScore.matchScore) : job.matchScore || 80;
        const score = Math.max(50, Math.min(maxCap, rawScore));
        const tier = ["safe", "stretch", "reach"].includes(aiScore.roleTier) ? aiScore.roleTier : score >= 85 ? "safe" : score >= 75 ? "stretch" : "reach";
        const explanation = typeof aiScore.matchExplanation === "string" && aiScore.matchExplanation.trim() ? aiScore.matchExplanation.trim() : job.matchExplanation || `Verified opening at ${job.company} matching candidate skillset.`;
        return {
          ...job,
          matchScore: score,
          roleTier: tier,
          matchExplanation: explanation,
          relevanceCategory: job.relevanceCategory,
          relevanceLabel: job.relevanceLabel,
          locationMatch: job.locationMatch,
          missingCriteria: job.missingCriteria
        };
      }
      return applySingleHeuristicScore(job, candidateProfile);
    });
  } catch (err) {
    console.warn("[JobDiscovery] AI matching fallback to heuristic scoring:", err.message);
    return applyHeuristicScores(jobs, candidateProfile);
  }
}
var CACHE_TTL_MS, arbeitnowCache, remoteokCache, remotiveQueryCache, USER_AGENT, INDIA_LOCATIONS;
var init_jobDiscovery = __esm({
  "api/_lib/jobDiscovery.ts"() {
    CACHE_TTL_MS = 10 * 60 * 1e3;
    arbeitnowCache = null;
    remoteokCache = null;
    remotiveQueryCache = /* @__PURE__ */ new Map();
    USER_AGENT = "AIHireFlow-JobDiscovery/1.0 (+https://www.aihireflow.in; contact@aihireflow.in)";
    INDIA_LOCATIONS = /* @__PURE__ */ new Set([
      "india",
      "bharat",
      "ind",
      "bengaluru",
      "bangalore",
      "mumbai",
      "bombay",
      "delhi",
      "new delhi",
      "ncr",
      "delhi ncr",
      "hyderabad",
      "secunderabad",
      "pune",
      "chennai",
      "madras",
      "gurugram",
      "gurgaon",
      "noida",
      "greater noida",
      "kolkata",
      "calcutta",
      "ahmedabad",
      "jaipur",
      "kochi",
      "cochin",
      "kerala",
      "chandigarh",
      "indore",
      "bhopal",
      "lucknow",
      "mysuru",
      "mysore",
      "coimbatore",
      "visakhapatnam",
      "vizag",
      "surat",
      "nagpur",
      "vadodara",
      "thiruvananthapuram",
      "trivandrum",
      "bhubaneswar",
      "patna",
      "dehradun"
    ]);
  }
});

// api/_index.ts
import express from "express";
import "dotenv/config";
import cors from "cors";
import dns from "dns";

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
  learning_path: 0,
  learningPath: 0,
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
  overrideCost,
  deduct = true
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
    if (!deduct) {
      return {
        allowed: true,
        plan: planTier,
        remainingCredits: wallet.balance
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
    if (requiredCredits > 0 || isAdvisor || isAts || isInterview || isEdit || isNewDay) {
      await updateDoc(userRef, {
        creditWallet: wallet,
        subscriptionUsage: usage
      });
    }
    if (requiredCredits > 0) {
      await addDoc(collection(firestore, "users", userId, "transactions"), {
        amount: -requiredCredits,
        type: "spend",
        label: `Backend Execution: ${normalizedOp}`,
        timestamp: now.toISOString()
      }).catch(() => {
      });
      console.log(`[SubscriptionEnforcement] User ${userId} [${planTier}] spent ${requiredCredits} credits for ${normalizedOp}. Remaining: ${wallet.balance}`);
    }
    return {
      allowed: true,
      plan: planTier,
      remainingCredits: wallet.balance
    };
  } catch (err) {
    if (err?.code === "permission-denied" || err?.message?.includes("Missing or insufficient permissions")) {
      console.warn("[SubscriptionEnforcement] Server Firestore unauthenticated read bypassed. Delegating credit verification to client PlanContext.");
    } else {
      console.error("[SubscriptionEnforcement] Error verifying user credits:", err);
    }
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
try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch {
}
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
function sanitizeHttpStatus(status) {
  const num = typeof status === "number" ? status : Number(status);
  if (isNaN(num) || num < 400 || num >= 600) return 500;
  if (num === 520) return 502;
  return num;
}
function sanitizeSafeErrorMessage(rawMessage) {
  if (!rawMessage) return "AI provider is temporarily unavailable. Please try again later.";
  const str = typeof rawMessage === "string" ? rawMessage : rawMessage.message || String(rawMessage);
  if (str.includes("520") || str.includes("502") || str.includes("503") || str.includes("504") || str.includes("524") || str.includes("Bad gateway") || str.includes("Bad Gateway") || str.includes("gateway") || str.includes("Cloudflare") || str.includes("<!DOCTYPE") || str.includes("<!doctype") || str.includes("<html")) {
    return "AI provider is temporarily unavailable. Please try again later.";
  }
  let safe = str.replace(/<[^>]*>/g, " ").replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]").replace(/[a-zA-Z0-9_\-]{32,}/g, "[REDACTED_KEY]").replace(/\s+/g, " ").trim();
  if (safe.length > 250) {
    safe = safe.slice(0, 250) + "...";
  }
  return safe || "AI provider is temporarily unavailable. Please try again later.";
}
async function callVelonaChatCompletion({
  messages,
  temperature = 0.7,
  jsonMode = false,
  maxTokens,
  requestId,
  signal,
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
  const isAtsJob = operation === "resume_analysis_job" || operation === "ats_analysis";
  const isJob = isAtsJob || (operation || "").includes("job");
  const isCoverLetter = operation === "cover_letter";
  const isLearningPath = operation === "learning_path";
  const safeMaxTokens = Math.min(3200, Math.max(1e3, maxTokens || (isJob ? 2800 : isCoverLetter ? 2400 : 1600)));
  const safeTemperature = typeof temperature === "number" && !isNaN(temperature) ? Math.max(0, Math.min(1, temperature)) : isCoverLetter ? 0.3 : 0.1;
  const velonaStart = Date.now();
  const maxRetries = isAtsJob ? 0 : 1;
  const maxTotalBudgetMs = 48e3;
  const perAttemptTimeoutMs = isJob ? 42e3 : isCoverLetter ? 38e3 : isLearningPath ? 38e3 : 4e4;
  let lastError = null;
  const inputChars = meta?.charCount || formattedMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const approxInputTokens = Math.round(inputChars / 4);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const elapsedSoFar = Date.now() - velonaStart;
    const timeRemaining = maxTotalBudgetMs - elapsedSoFar;
    if (attempt > 0 && timeRemaining < 2e4) {
      break;
    }
    const currentAttemptTimeoutMs = Math.min(perAttemptTimeoutMs, Math.max(1e4, timeRemaining - 3e3));
    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), currentAttemptTimeoutMs);
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

${firstUser.content}

IMPORTANT: Be extremely concise. Output strictly raw valid JSON immediately.`
          },
          ...nonSystemParts.slice(1)
        ];
      }
    }
    const payload = {
      model: modelId,
      messages: currentMessages,
      temperature: attempt > 0 ? 0 : safeTemperature,
      stream: false,
      max_tokens: attempt > 0 ? Math.min(2800, safeMaxTokens) : safeMaxTokens
    };
    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1500, 400 * Math.pow(2, attempt - 1));
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
        signal: signal || controller.signal
      });
      clearTimeout(timeoutId);
      const attemptDuration = Date.now() - attemptStart;
      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorBody = await response.text();
          if (errorBody.includes("520") || errorBody.includes("502") || errorBody.includes("Cloudflare") || errorBody.includes("<!DOCTYPE") || errorBody.includes("<html")) {
            errorDetails = "AI provider server encountered a temporary gateway issue.";
          } else {
            try {
              const errJson = JSON.parse(errorBody);
              errorDetails = errJson.error?.message || errJson.message || errorBody;
            } catch {
              errorDetails = errorBody;
            }
          }
        } catch {
          errorDetails = `HTTP status ${response.status}`;
        }
        const safeDetails = sanitizeSafeErrorMessage(errorDetails);
        const resolvedMsg = !safeDetails || safeDetails.toLowerCase().includes("internal server error") ? "AI provider is temporarily unavailable. Please try again later." : safeDetails;
        const effectiveStatus = response.status === 520 ? 502 : response.status;
        const err = new Error(resolvedMsg);
        err.status = effectiveStatus;
        err.velonaStatus = response.status;
        err.attemptDuration = attemptDuration;
        if (response.status === 401) {
          err.code = "PROVIDER_CONFIGURATION_ERROR";
          err.message = `Velona Authentication Failed: Invalid or expired API key. (${resolvedMsg})`;
          throw err;
        } else if (response.status === 402 || response.status === 429) {
          err.code = "PROVIDER_UPSTREAM_ERROR";
          err.message = `Velona Quota/Rate Limit Error: ${resolvedMsg}`;
          throw err;
        } else {
          err.code = "PROVIDER_UPSTREAM_ERROR";
          err.message = resolvedMsg;
        }
        const isTransient = [500, 502, 503, 504, 520].includes(response.status);
        if (!isAtsJob && isTransient && attempt < maxRetries && Date.now() - velonaStart < maxTotalBudgetMs - 15e3) {
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
        err.code = "PROVIDER_UPSTREAM_ERROR";
        err.attemptDuration = attemptDuration;
        throw err;
      }
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        const err = new Error("Velona API returned a non-JSON response.");
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = "PROVIDER_UPSTREAM_ERROR";
        err.attemptDuration = attemptDuration;
        throw err;
      }
      if (!data || typeof data !== "object") {
        const err = new Error("Velona API returned an invalid response structure.");
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = "PROVIDER_UPSTREAM_ERROR";
        err.attemptDuration = attemptDuration;
        throw err;
      }
      if (data.error) {
        const errMsg = sanitizeSafeErrorMessage(typeof data.error === "string" ? data.error : data.error.message || "Velona API error");
        const err = new Error(errMsg);
        err.status = data.error.code === "invalid_api_key" ? 401 : 502;
        err.velonaStatus = response.status;
        err.code = data.error.code === "invalid_api_key" ? "PROVIDER_CONFIGURATION_ERROR" : "PROVIDER_UPSTREAM_ERROR";
        err.attemptDuration = attemptDuration;
        throw err;
      }
      const choice = data.choices?.[0];
      let content = null;
      if (typeof choice?.message?.content === "string" && choice.message.content.trim()) {
        content = choice.message.content;
      } else if (Array.isArray(choice?.message?.content)) {
        const joined = choice.message.content.map((part) => typeof part === "string" ? part : part?.text || part?.content || "").join("").trim();
        if (joined) content = joined;
      } else if (choice?.message?.content && typeof choice.message.content === "object") {
        try {
          content = JSON.stringify(choice.message.content);
        } catch {
        }
      }
      if (!content) {
        if (typeof choice?.text === "string" && choice.text.trim()) {
          content = choice.text;
        } else if (typeof choice?.message?.reasoning_content === "string" && choice.message.reasoning_content.trim()) {
          content = choice.message.reasoning_content;
        } else if (typeof choice?.message?.reasoning === "string" && choice.message.reasoning.trim()) {
          content = choice.message.reasoning;
        } else if (typeof choice?.reasoning === "string" && choice.reasoning.trim()) {
          content = choice.reasoning;
        } else if (typeof choice?.message?.thought === "string" && choice.message.thought.trim()) {
          content = choice.message.thought;
        } else if (typeof choice?.delta?.content === "string" && choice.delta.content.trim()) {
          content = choice.delta.content;
        } else if (typeof choice?.message?.tool_calls?.[0]?.function?.arguments === "string" && choice.message.tool_calls[0].function.arguments.trim()) {
          content = choice.message.tool_calls[0].function.arguments;
        } else if (typeof data?.response === "string" && data.response.trim()) {
          content = data.response;
        } else if (typeof data?.output === "string" && data.output.trim()) {
          content = data.output;
        } else if (typeof data?.text === "string" && data.text.trim()) {
          content = data.text;
        }
      }
      if (!content) {
        const isLengthExhaustion = choice?.finish_reason === "length";
        const err = new Error(
          isLengthExhaustion ? "Velona AI token limit reached during reasoning. Please retry." : "Velona API response did not contain completion content."
        );
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = isLengthExhaustion ? "PROVIDER_TIMEOUT" : "PARSE_ERROR";
        err.attemptDuration = attemptDuration;
        throw err;
      }
      const finishReason = choice?.finish_reason || "stop";
      const totalElapsed2 = Date.now() - velonaStart;
      console.log(`[AI HireFlow][Diagnostics] request_start=${new Date(attemptStart).toISOString()}, request_id=${requestId || "unknown"}, model=${modelId}, input_chars=${inputChars}, approx_input_tokens=${approxInputTokens}, configured_timeout_ms=${perAttemptTimeoutMs}, provider_duration_ms=${attemptDuration}, provider_status=200, retry_count=${attempt}, response_chars=${content.length}, failure_category=none`);
      let cleanText = content;
      if (jsonMode && typeof cleanText === "string") {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
        const firstBrace = cleanText.indexOf("{");
        const firstBracket = cleanText.indexOf("[");
        let firstJsonChar = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          firstJsonChar = firstBrace;
        } else if (firstBracket !== -1) {
          firstJsonChar = firstBracket;
        }
        if (firstJsonChar > 0) {
          cleanText = cleanText.slice(firstJsonChar).trim();
        }
      }
      const resolvedProvider = "velona";
      const resolvedModel = data.model || modelId;
      if (resolvedProvider !== "velona" || !resolvedModel.includes("glm-5.3-flash") && resolvedModel !== "z-ai/glm-5.3-flash") {
        const configErr = new Error(`Configuration error: unexpected provider/model response (${resolvedProvider}/${resolvedModel}). Expected Velona z-ai/glm-5.3-flash.`);
        configErr.code = "PROVIDER_CONFIGURATION_ERROR";
        configErr.status = 502;
        throw configErr;
      }
      console.log(`[AI HireFlow][Diagnostics] endpoint=${VELONA_BASE_URL}/chat/completions, provider=velona, model=z-ai/glm-5.3-flash, http_status=200, provider_duration_ms=${attemptDuration}, total_duration_ms=${totalElapsed2}, request_id=${requestId || "unknown"}, retry_count=${attempt}, parse_status=SUCCESS, failure_category=none`);
      return {
        text: cleanText,
        rawText: content,
        finishReason,
        isTruncated: finishReason === "length",
        model: resolvedModel,
        provider: "velona",
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: {
          velonaDurationMs: attemptDuration,
          totalDurationMs: totalElapsed2
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const attemptDuration = Date.now() - attemptStart;
      if (err.name === "AbortError") {
        const stage = isLearningPath ? "learning_path_timeout" : isJob ? "job_timeout" : isCoverLetter ? "cover_letter_timeout" : `attempt_${attempt}_timeout`;
        lastError = new Error(
          isJob ? "Analysis timed out on the AI provider. Please click Retry Analysis to run a fresh audit." : isCoverLetter ? "Cover letter generation timed out. Please click Retry Cover Letter." : "AI request timed out. Please try again."
        );
        lastError.status = 504;
        lastError.velonaStatus = 504;
        lastError.code = "PROVIDER_TIMEOUT";
        lastError.timeoutStage = stage;
        lastError.attemptDuration = attemptDuration;
        break;
      } else {
        lastError = err;
        lastError.timeoutStage = "none";
        lastError.attemptDuration = attemptDuration;
      }
      const timeRemaining2 = maxTotalBudgetMs - (Date.now() - velonaStart);
      if (!isAtsJob && attempt < maxRetries && timeRemaining2 > 2e4 && (err.name === "FetchError" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "MALFORMED_UPSTREAM_RESPONSE" || err.code === "TOKEN_LIMIT_EXCEEDED" || err.status === 502 || err.status === 503 || err.status === 504 || err.status === 520 || err.velonaStatus === 520)) {
        continue;
      }
      break;
    }
  }
  const totalElapsed = Date.now() - velonaStart;
  const safeMessage = sanitizeSafeErrorMessage(lastError?.message || "Velona API request failed.");
  const errorCategory = lastError?.code || (lastError?.status === 504 ? "PROVIDER_TIMEOUT" : "PROVIDER_UPSTREAM_ERROR");
  const velonaStatus = lastError?.velonaStatus || lastError?.status || 502;
  const timeoutStage = lastError?.timeoutStage || (errorCategory === "PROVIDER_TIMEOUT" ? "request_timeout" : "none");
  const velonaDuration = lastError?.attemptDuration || totalElapsed;
  console.log(`[AI HireFlow][Diagnostics] request_start=${new Date(velonaStart).toISOString()}, request_id=${requestId || "unknown"}, model=${modelId}, input_chars=${inputChars}, approx_input_tokens=${approxInputTokens}, configured_timeout_ms=${perAttemptTimeoutMs}, provider_duration_ms=${velonaDuration}, provider_status=${velonaStatus}, retry_count=0, response_chars=${lastError?.rawSample?.length || 0}, failure_category=${errorCategory}`);
  throw lastError || new Error("Velona API request failed.");
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
        console.log(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=200, model=${modelId}, duration_ms=${Date.now() - requestStart}, velona_status=N/A, status=fallback_allowed, message=Allowed with fallback`);
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
    const isCoverLetter = operation === "cover_letter";
    const requestPurpose = isCoverLetter ? "COVER_LETTER" : "GENERAL";
    const safeReqId = typeof body.requestId === "string" && body.requestId.trim() ? body.requestId.trim() : `gen_${Date.now()}`;
    const result = await callVelonaChatCompletion({
      messages,
      temperature,
      jsonMode: Boolean(jsonMode),
      maxTokens,
      operation: typeof operation === "string" ? operation : "general",
      requestId: safeReqId,
      meta
    });
    const totalDuration = Date.now() - requestStart;
    console.log(`[AI HireFlow][Diagnostics] request_id=${safeReqId}, request_purpose=${requestPurpose}, endpoint=/api/velona/generate, model=${result.model || modelId}, provider_duration_ms=${result.timing?.velonaDurationMs || totalDuration}, total_duration_ms=${totalDuration}, http_status=200, finish_reason=${result.finishReason || "stop"}, parse_status=SUCCESS, failure_category=none, request_count=1`);
    return res.status(200).json({
      ...result,
      timing: {
        ...result.timing,
        totalDurationMs: totalDuration
      }
    });
  } catch (err) {
    const totalDuration = Date.now() - requestStart;
    const rawStatus = sanitizeHttpStatus(typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500);
    const safeMsg = sanitizeSafeErrorMessage(err.message || "Internal AI generation error");
    const errorCode = err.code || "AI_GENERATION_FAILED";
    const velonaStatus = err.velonaStatus || (rawStatus !== 500 ? rawStatus : "N/A");
    const timeoutStage = err.timeoutStage || (errorCode === "TIMEOUT" ? "request_timeout" : "none");
    const isCoverLetter = req.body && req.body.operation === "cover_letter";
    const requestPurpose = isCoverLetter ? "COVER_LETTER" : "GENERAL";
    const safeReqId = req.body && typeof req.body.requestId === "string" && req.body.requestId.trim() ? req.body.requestId.trim() : `gen_${Date.now()}`;
    console.log(`[AI HireFlow][Diagnostics] request_id=${safeReqId}, request_purpose=${requestPurpose}, endpoint=/api/velona/generate, request_start=${new Date(requestStart).toISOString()}, http_status=${rawStatus}, model=${modelId}, provider_duration_ms=${err.attemptDuration || totalDuration}, total_duration_ms=${totalDuration}, finish_reason=error, parse_status=FAILED, failure_category=${errorCode}, request_count=1`);
    return res.status(rawStatus).json({
      error: safeMsg,
      code: errorCode,
      provider: "velona",
      model: modelId,
      timeoutStage,
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
  const rawBreakdown = Array.isArray(rawData?.scoreBreakdown) ? rawData.scoreBreakdown : Array.isArray(rawData?.score_breakdown) ? rawData.score_breakdown : [];
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
  const rawKeywords = rawData?.keywordsFound || rawData?.keywords_found || rawData?.identifiedKeywords || rawData?.keywords || [];
  const keywordsFound = Array.isArray(rawKeywords) ? rawKeywords.map(String).filter(Boolean).slice(0, 10) : [];
  const rawMissing = rawData?.missingKeywords || rawData?.missing_keywords || rawData?.missingSkills || rawData?.skillGaps || [];
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
  let totalInputChars = (resumeText?.length || 0) + (jobDescription?.length || 0);
  let approxInputTokens = Math.round(totalInputChars / 4);
  let didRetry = false;
  try {
    const prepStart = Date.now();
    const cleanResume = (resumeText || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "").replace(/[ \t]+/g, " ").split("\n").map((line) => line.trim()).filter((line, idx, arr) => line.length > 0 && (idx === 0 || line !== arr[idx - 1])).join("\n").slice(0, 3500);
    if (!cleanResume || cleanResume.length < 25) {
      throw new Error("Resume text is too short or empty for ATS analysis.");
    }
    const cleanJD = (jobDescription || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 1200);
    const prepDurationMs = Date.now() - prepStart;
    totalInputChars = cleanResume.length + (cleanJD ? cleanJD.length : 0);
    approxInputTokens = Math.round(totalInputChars / 4);
    const prompt = `You are an ATS Resume Auditor. Analyze this resume against the target job and output strictly valid JSON.

Schema:
{
  "targetRole": "Candidate primary job title",
  "score": number (0-100),
  "atsCompatibility": "High" | "Moderate" | "Low",
  "summary": "max 25 words",
  "strengths": ["max 3 items, max 8 words each"],
  "weaknesses": [
    { "problem": "max 8 words", "whyItMatters": "max 10 words", "howToFix": "max 10 words" }
  ],
  "scoreBreakdown": [
    {
      "category": "Core Technical & Skill Match",
      "weight": 40,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    },
    {
      "category": "Measurable Impact & Hard Metrics",
      "weight": 25,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    },
    {
      "category": "Role & Domain Relevance",
      "weight": 20,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    },
    {
      "category": "Structure & ATS Parsability",
      "weight": 15,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    }
  ],
  "skillsAnalysis": [
    { "skill": "string", "type": "explicit" | "inferred", "confidence_level": "high" | "medium", "evidence": "max 8 words" }
  ],
  "keywordsFound": ["max 6 items"],
  "missingKeywords": ["max 4 items"],
  "recommendations": ["max 3 items, max 10 words each"]
}
STRICT CONSTRAINTS:
- All 4 categories in scoreBreakdown MUST be present.
- Limit skillsAnalysis to at most 6 key technical skills.
- Limit weaknesses to at most 3 items.
- Limit strengths to at most 3 items.
- Keep all explanations, problem statements, and recommendations strictly under 10 words.
- Output raw valid JSON only without markdown code fences or conversational text.

TARGET JOB:
${cleanJD || "General ATS Industry Benchmark for candidate profile"}

CANDIDATE RESUME:
${cleanResume}
`;
    let velonaResult = await callVelonaChatCompletion({
      messages: [
        { role: "system", content: "You are an ultra-fast ATS scoring engine for AI HireFlow. Do not perform extended internal reasoning or chain of thought. Evaluate immediately and concisely. Emit raw valid JSON instantly adhering strictly to word and item limits." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      jsonMode: true,
      maxTokens: 2800,
      requestId: job.analysisId,
      operation: "resume_analysis_job",
      meta: {
        fileType: fileType || "resume",
        charCount: totalInputChars,
        wordCount: cleanResume.split(/\s+/).filter(Boolean).length
      }
    });
    lastFinishReason = velonaResult.finishReason || "stop";
    lastModel = velonaResult.model || VELONA_MODEL_ID;
    lastRawSample = velonaResult.text?.slice(0, 500) || "";
    let parsed = null;
    try {
      parsed = extractAndParseJson(velonaResult.text);
    } catch (firstParseErr) {
      console.warn(`[AI HireFlow][ResumeJob:${job.analysisId}] JSON parse attempt failed (${firstParseErr.message}), finish_reason=${velonaResult.finishReason}.`);
    }
    if (!parsed || typeof parsed !== "object") {
      const isTruncated = velonaResult.finishReason === "length";
      const parseError = new Error(
        isTruncated ? "AI provider token limit reached during reasoning. Please retry." : "Failed to parse AI provider ATS response. Please click Retry Analysis."
      );
      parseError.code = isTruncated ? "PROVIDER_TIMEOUT" : "PARSE_ERROR";
      parseError.status = isTruncated ? 504 : 502;
      parseError.rawSample = velonaResult.text?.slice(0, 500);
      throw parseError;
    }
    const normalized = normalizeAtsAuditResult(parsed);
    if (typeof normalized.score !== "number" || !Array.isArray(normalized.scoreBreakdown) || normalized.scoreBreakdown.length === 0) {
      const schemaErr = new Error("ATS schema validation failed: missing score or breakdown.");
      schemaErr.code = "PARSE_ERROR";
      schemaErr.status = 502;
      throw schemaErr;
    }
    job.status = "completed";
    job.result = normalized;
    job.updatedAt = Date.now();
    job.diagnostics = {
      provider: "velona",
      model: "z-ai/glm-5.3-flash",
      httpStatus: 200,
      velonaRequestCount: 1,
      prepDurationMs,
      totalDurationMs: Date.now() - jobStart,
      velonaDurationMs: velonaResult.timing?.velonaDurationMs,
      tokens: velonaResult.usage,
      finishReason: velonaResult.finishReason,
      parseResult: "SUCCESS",
      schemaValidation: "SUCCESS",
      retried: false
    };
    console.log(`[AI HireFlow][Diagnostics] request_id=${job.analysisId}, request_purpose=ATS, endpoint=/api/resume/analyze-job, timestamp=${new Date(jobStart).toISOString()}, model=z-ai/glm-5.3-flash, input_chars=${totalInputChars}, approx_tokens=${approxInputTokens}, configured_timeout_ms=42000, overall_budget_ms=48000, provider_status=200, provider_duration_ms=${velonaResult.timing?.velonaDurationMs || job.diagnostics.totalDurationMs}, total_duration_ms=${Date.now() - jobStart}, retry_count=0, finish_reason=${velonaResult.finishReason}, parse_status=SUCCESS, failure_category=none, velona_request_count=1`);
  } catch (err) {
    console.log(`[AI HireFlow][ResumeJob:${job.analysisId}] Analysis reported upstream notice:`, err.message);
    job.status = "failed";
    job.updatedAt = Date.now();
    let failureCategory = "PROVIDER_UPSTREAM_ERROR";
    let safeErrorMsg = sanitizeSafeErrorMessage(err.message || "AI provider is temporarily unavailable.");
    let failureCode = err.code || "PROVIDER_UPSTREAM_ERROR";
    if (err.code === "PROVIDER_TIMEOUT" || err.status === 504 || err.message && err.message.toLowerCase().includes("timed out")) {
      failureCode = "PROVIDER_TIMEOUT";
      failureCategory = "PROVIDER_TIMEOUT";
      safeErrorMsg = "Analysis timed out on the AI provider. Please click Retry Analysis.";
    } else if (err.code === "PROVIDER_CONFIGURATION_ERROR" || err.code === "MISSING_API_KEY" || err.code === "INVALID_API_KEY" || err.status === 401) {
      failureCode = "PROVIDER_CONFIGURATION_ERROR";
      failureCategory = "PROVIDER_CONFIGURATION_ERROR";
      safeErrorMsg = "AI provider configuration error. Please verify API configuration.";
    } else if (err.code === "PARSE_ERROR" || err.code === "JSON_PARSE_ERROR" || err.code === "SCHEMA_VALIDATION_ERROR") {
      failureCode = "PARSE_ERROR";
      failureCategory = "PARSE_ERROR";
      safeErrorMsg = "Failed to parse AI provider ATS response. Please click Retry Analysis.";
    } else {
      failureCode = "PROVIDER_UPSTREAM_ERROR";
      failureCategory = "PROVIDER_UPSTREAM_ERROR";
      safeErrorMsg = "AI provider is temporarily unavailable.";
    }
    job.error = safeErrorMsg;
    job.errorCode = failureCode;
    const providerHttpStatus = typeof err.velonaStatus === "number" ? err.velonaStatus : typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : failureCode === "PROVIDER_TIMEOUT" ? 504 : 502;
    job.diagnostics = {
      provider: "velona",
      model: "z-ai/glm-5.3-flash",
      httpStatus: providerHttpStatus,
      velonaRequestCount: 1,
      totalDurationMs: Date.now() - jobStart,
      parseResult: "ERROR",
      finishReason: lastFinishReason,
      failureCategory,
      sample: err.rawSample || lastRawSample
    };
    console.log(`[AI HireFlow][Diagnostics] request_id=${job.analysisId}, request_purpose=ATS, endpoint=/api/resume/analyze-job, timestamp=${new Date(jobStart).toISOString()}, model=z-ai/glm-5.3-flash, input_chars=${totalInputChars}, approx_tokens=${approxInputTokens}, configured_timeout_ms=42000, overall_budget_ms=48000, provider_status=${providerHttpStatus}, provider_duration_ms=${job.diagnostics.totalDurationMs}, total_duration_ms=${Date.now() - jobStart}, retry_count=0, finish_reason=${lastFinishReason}, parse_status=FAILED, failure_category=${failureCategory}, velona_request_count=1`);
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
      try {
        const enforcement = await enforceSubscriptionAndCredits({
          userId: effectiveUserId,
          userEmail: effectiveUserEmail,
          operation: "ats_analysis",
          overrideCost: 20,
          deduct: false
          // Pre-validation check: do not double-debit before analysis succeeds
        });
        if (!enforcement.allowed) {
          return res.status(enforcement.status || 403).json({
            error: enforcement.error,
            code: enforcement.code || "ACCESS_DENIED",
            requiredCredits: enforcement.requiredCredits,
            balance: enforcement.balance
          });
        }
      } catch (enfErr) {
        console.warn("[analyze-job] Credit pre-check warning, deferring to client enforcement:", enfErr.message);
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
      if (existing.status === "completed" && existing.result) {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: "completed",
          result: existing.result,
          diagnostics: {
            provider: "velona",
            model: "z-ai/glm-5.3-flash",
            httpStatus: 200,
            velonaRequestCount: 1,
            ...existing.diagnostics
          }
        });
      }
      if (existing.status === "processing" || existing.status === "queued") {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: existing.status,
          message: "Analysis job is already in progress"
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
    await processResumeAnalysisJob(job, resumeText, jobDescription, fileType);
    if (job.status === "completed" && job.result) {
      return res.status(200).json({
        analysisId: job.analysisId,
        status: "completed",
        result: job.result,
        diagnostics: {
          provider: "velona",
          model: "z-ai/glm-5.3-flash",
          httpStatus: 200,
          velonaRequestCount: 1,
          ...job.diagnostics
        }
      });
    }
    const failureCode = job.errorCode || "PROVIDER_UPSTREAM_ERROR";
    const responseStatus = failureCode === "PROVIDER_TIMEOUT" ? 504 : failureCode === "PROVIDER_CONFIGURATION_ERROR" && job.diagnostics?.httpStatus === 401 ? 401 : 502;
    return res.status(responseStatus).json({
      analysisId: job.analysisId,
      status: "failed",
      code: failureCode,
      error: job.error || "AI provider is temporarily unavailable.",
      diagnostics: {
        provider: "velona",
        model: "z-ai/glm-5.3-flash",
        httpStatus: job.diagnostics?.httpStatus || responseStatus,
        velonaRequestCount: 1,
        ...job.diagnostics
      }
    });
  } catch (err) {
    console.error("Failed to create resume analysis job:", err);
    const safeError = sanitizeSafeErrorMessage(err.message || "AI provider is temporarily unavailable.");
    res.status(502).json({
      status: "failed",
      code: "PROVIDER_UPSTREAM_ERROR",
      error: safeError,
      diagnostics: {
        provider: "velona",
        model: "z-ai/glm-5.3-flash",
        httpStatus: 502,
        velonaRequestCount: 1
      }
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
async function checkIsPaymentProcessed(paymentId) {
  if (!paymentId) return false;
  if (processedPaymentIds.has(paymentId)) return true;
  const firestore = getServerFirestore();
  if (firestore) {
    try {
      const { doc: doc2, getDoc: getDoc2 } = await import("firebase/firestore");
      const docRef = doc2(firestore, "processed_payments", paymentId);
      const snap = await getDoc2(docRef);
      if (snap.exists()) {
        processedPaymentIds.add(paymentId);
        return true;
      }
    } catch (e) {
      console.warn("[Idempotency] Firestore read check warning:", e.message);
    }
  }
  return false;
}
async function reservePaymentIdempotency(paymentId, metadata) {
  if (!paymentId) {
    return { success: false, alreadyProcessed: false };
  }
  if (processedPaymentIds.has(paymentId)) {
    return { success: false, alreadyProcessed: true };
  }
  const firestore = getServerFirestore();
  if (!firestore) {
    processedPaymentIds.add(paymentId);
    return { success: true, alreadyProcessed: false };
  }
  try {
    const { doc: doc2, runTransaction, getDoc: getDoc2 } = await import("firebase/firestore");
    const docRef = doc2(firestore, "processed_payments", paymentId);
    await runTransaction(firestore, async (txn) => {
      const snap = await txn.get(docRef);
      if (snap.exists()) {
        throw new Error("ALREADY_PROCESSED");
      }
      txn.set(docRef, {
        paymentId,
        orderId: metadata.orderId || "",
        userId: metadata.userId || "anonymous",
        amount: metadata.amount || 0,
        currency: metadata.currency || "INR",
        item: metadata.item || "",
        packId: metadata.packId || "",
        credits: metadata.credits || 0,
        claimedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    processedPaymentIds.add(paymentId);
    return { success: true, alreadyProcessed: false };
  } catch (err) {
    if (err.message === "ALREADY_PROCESSED") {
      processedPaymentIds.add(paymentId);
      return { success: false, alreadyProcessed: true };
    }
    console.error("[Idempotency] Atomic reservation collision or error:", err.message);
    try {
      const { doc: doc2, getDoc: getDoc2 } = await import("firebase/firestore");
      const docRef = doc2(firestore, "processed_payments", paymentId);
      const snap = await getDoc2(docRef);
      if (snap.exists()) {
        processedPaymentIds.add(paymentId);
        return { success: false, alreadyProcessed: true };
      }
    } catch {
    }
    return { success: false, alreadyProcessed: true };
  }
}
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
      paymentMode,
      userId,
      type,
      item,
      credits,
      price,
      packId
    } = req.body;
    const isUnverifiedSubmission = paymentMode === "upi_qr" || !razorpay_signature || !razorpay_payment_id || !razorpay_order_id || typeof razorpay_signature !== "string" || typeof razorpay_payment_id !== "string" || typeof razorpay_order_id !== "string" || razorpay_signature.startsWith("sig_qr_") || razorpay_signature.startsWith("sig_bank_") || razorpay_signature.startsWith("sig_mock_") || razorpay_signature.startsWith("sig_unverified_") || razorpay_signature === "sig_verified_mock_256" || razorpay_payment_id.startsWith("rzp_qr_") || razorpay_order_id.startsWith("ord_rzp_qr_");
    if (isUnverifiedSubmission) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Payment could not be verified yet. Credits will be added after successful payment confirmation."
      });
    }
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Authenticated user identifier is required for payment verification."
      });
    }
    const alreadyProcessed = await checkIsPaymentProcessed(razorpay_payment_id);
    if (alreadyProcessed) {
      return res.status(409).json({
        success: false,
        error: "Duplicate payment claim: Credits for this payment have already been allocated.",
        alreadyAllocated: true
      });
    }
    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Razorpay secret key is not configured on server."
      });
    }
    const crypto = await import("crypto");
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto.createHmac("sha256", keySecret).update(text).digest("hex");
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Payment could not be verified yet. Credits will be added after successful payment confirmation."
      });
    }
    let paymentDetails = null;
    const client = await getRazorpay();
    if (client) {
      try {
        const payment = await client.payments.fetch(razorpay_payment_id);
        if (!payment) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: "Payment could not be verified yet. Credits will be added after successful payment confirmation."
          });
        }
        paymentDetails = payment;
        let paymentStatus = payment.status;
        if (paymentStatus === "authorized") {
          try {
            const captured = await client.payments.capture(razorpay_payment_id, payment.amount, payment.currency || "INR");
            if (captured && captured.status === "captured") {
              paymentStatus = "captured";
            }
          } catch (capErr) {
            console.warn("[Razorpay] Backend capture attempt notice:", capErr?.message);
          }
        }
        if (paymentStatus !== "captured") {
          return res.status(400).json({
            success: false,
            verified: false,
            error: `Payment status is '${payment.status}'. Credits can only be granted for successfully captured payments.`
          });
        }
        if (payment.order_id && payment.order_id !== razorpay_order_id) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: "Payment order reference mismatch."
          });
        }
        if (payment.currency && payment.currency !== "INR") {
          return res.status(400).json({
            success: false,
            verified: false,
            error: "Invalid payment currency. Expected INR."
          });
        }
        const matchedPack2 = getCreditPackById(packId || item);
        const expectedPaisa = matchedPack2 ? Math.round(matchedPack2.price.INR * 100) : price ? Math.round(Number(price) * 100) : null;
        if (expectedPaisa && payment.amount < expectedPaisa) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: "Paid amount does not match package price."
          });
        }
      } catch (fetchErr) {
        console.error("Razorpay payment fetch error:", fetchErr?.message);
        if (fetchErr?.statusCode === 400 || fetchErr?.error?.code === "BAD_REQUEST_ERROR") {
          return res.status(400).json({
            success: false,
            verified: false,
            error: "Payment could not be verified yet. Credits will be added after successful payment confirmation."
          });
        }
      }
    }
    const matchedPack = getCreditPackById(packId || item);
    const finalCredits = matchedPack ? matchedPack.credits : parseInt(credits || "0");
    const finalPrice = parseFloat(price || (matchedPack ? matchedPack.price.INR.toString() : "0"));
    const reservation = await reservePaymentIdempotency(razorpay_payment_id, {
      orderId: razorpay_order_id,
      userId: userId.trim(),
      amount: paymentDetails?.amount || (finalPrice ? Math.round(finalPrice * 100) : 0),
      currency: paymentDetails?.currency || "INR",
      item: matchedPack?.name || item || "credits",
      packId: matchedPack?.id || packId,
      credits: finalCredits
    });
    if (!reservation.success) {
      return res.status(409).json({
        success: false,
        error: "Duplicate payment claim: Credits for this payment have already been allocated.",
        alreadyAllocated: true
      });
    }
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
    res.status(500).json({
      success: false,
      error: "Internal payment verification error"
    });
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
app.get("/api/jobs/provider-status", (req, res) => {
  const hasKey = Boolean(process.env.OPENWEB_NINJA_API_KEY || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY);
  res.json({
    provider: "OpenWeb Ninja JSearch",
    configured: hasKey,
    plan: "Pay As You Go",
    endpoint: hasKey ? "https://api.openwebninja.com/jsearch/search" : null,
    costProtection: {
      maxPagesPerQuery: 1,
      cacheTtlMinutes: 15,
      requestDeduplication: true
    }
  });
});
app.all(["/api/jobs/search", "/api/jobs"], async (req, res, next) => {
  try {
    const isPost = req.method === "POST";
    const params = isPost ? req.body || {} : req.query || {};
    const query = typeof params.query === "string" ? params.query : typeof params.q === "string" ? params.q : "";
    const location = typeof params.location === "string" ? params.location : typeof params.loc === "string" ? params.loc : "";
    const candidateProfile = typeof params.candidateProfile === "string" ? params.candidateProfile : typeof params.profile === "string" ? params.profile : "";
    const employmentType = typeof params.employmentType === "string" ? params.employmentType : void 0;
    const isRemote = params.isRemote === true || params.isRemote === "true";
    const datePosted = typeof params.datePosted === "string" ? params.datePosted : void 0;
    const allowFallback = params.allowFallback === true || params.allowFallback === "true";
    const limit = Math.min(25, Math.max(1, Number(params.limit) || 12));
    const { searchRealJobs: searchRealJobs2, rankAndScoreJobsWithAI: rankAndScoreJobsWithAI2, sortJobsByPostingDateNewestFirst: sortJobsByPostingDateNewestFirst2 } = await Promise.resolve().then(() => (init_jobDiscovery(), jobDiscovery_exports));
    const searchResult = await searchRealJobs2({
      query: query.trim(),
      location: location.trim(),
      limit,
      employmentType,
      isRemote,
      datePosted,
      allowFallback
    });
    if (searchResult.errorCode) {
      return res.status(200).json({
        success: false,
        isConfigured: searchResult.isConfigured,
        provider: searchResult.provider,
        errorCode: searchResult.errorCode,
        error: searchResult.error,
        requiresKey: searchResult.errorCode === "MISSING_KEY",
        jobs: [],
        exactMatches: [],
        relatedMatches: [],
        exactCount: 0,
        relatedCount: 0,
        totalCount: 0,
        retrievedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const realListings = searchResult.jobs || [];
    if (realListings.length === 0) {
      return res.json({
        success: true,
        isConfigured: searchResult.isConfigured,
        provider: searchResult.provider,
        jobs: [],
        exactMatches: [],
        relatedMatches: [],
        exactCount: 0,
        relatedCount: 0,
        totalCount: 0,
        cached: searchResult.cached,
        message: "No live job listings were found matching your search criteria. Try adjusting role keywords or location filters.",
        retrievedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const scoredJobs = await rankAndScoreJobsWithAI2({
      jobs: realListings,
      candidateProfile: candidateProfile.trim(),
      callVelona: callVelonaChatCompletion
    });
    const sortedJobs = sortJobsByPostingDateNewestFirst2(scoredJobs);
    const exactMatches = sortedJobs.filter((j) => j.relevanceCategory === "exact");
    const relatedMatches = sortedJobs.filter((j) => j.relevanceCategory !== "exact");
    return res.json({
      success: true,
      isConfigured: searchResult.isConfigured,
      provider: searchResult.provider,
      jobs: sortedJobs,
      exactMatches,
      relatedMatches,
      exactCount: exactMatches.length,
      relatedCount: relatedMatches.length,
      totalCount: sortedJobs.length,
      cached: searchResult.cached,
      query: query.trim(),
      location: location.trim(),
      message: exactMatches.length === 0 && relatedMatches.length > 0 ? location.trim().toLowerCase().includes("india") ? "No verified exact internships in India were found for this query in this search batch. Below are verified related opportunities with noted differences." : "No exact live openings matching all criteria were found. Below are verified related opportunities from live feeds." : void 0,
      retrievedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("[RealJobSearch] Unexpected error:", err);
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
  const rawStatus = typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  const status = sanitizeHttpStatus(rawStatus);
  const safeMsg = sanitizeSafeErrorMessage(err.message || "Internal Server Error");
  console.log(`[AI HireFlow][Diagnostics] endpoint=${req.path || "/api"}, http_status=${status}, model=${getVelonaModel()}, duration_ms=0, velona_status=N/A, error_category=${err.code || "INTERNAL_ERROR"}, message=${safeMsg}`);
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
  sanitizeHttpStatus,
  sanitizeSafeErrorMessage
};
