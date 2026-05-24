import { GoogleGenAI, Modality } from "@google/genai";
import pRetry, { AbortError } from "p-retry";
import { logger } from "./logger.js";

export class MissingApiKeyError extends Error {
  constructor() {
    super("Gemini API key not set. Open Admin → Customize Site and add your Google Gemini API key.");
    this.name = "MissingApiKeyError";
  }
}

function buildClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

function isPermanent(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(400|401|403|404)\b|API key not valid|invalid api key|permission denied/i.test(msg);
}

export interface GeneratedCollegeData {
  collegeName?: string;
  shortName?: string;
  tagline?: string;
  established?: number;
  accreditation?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  principalName?: string;
  principalMessage?: string;
  chairmanName?: string;
  chairmanMessage?: string;
  aboutText?: string;
  missionText?: string;
  visionText?: string;
  facilities?: string[];
  achievements?: string[];
  schools?: Array<{ name: string; description?: string }>;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  marqueeItems?: string[];
  stats?: Array<{ label: string; value: string }>;
  whyUs?: Array<{ title: string; description: string }>;
  testimonials?: Array<{ name: string; course?: string; company?: string; text: string; rating?: number }>;
  newsItems?: Array<{ title: string; date: string; category: string; summary?: string }>;
}

const SYSTEM_INSTRUCTION = `You are an expert at generating realistic, well-formatted website content for educational institutions in India. You research and produce ready-to-use content for a college's public website.

Rules:
- Output STRICT JSON only, matching the requested schema. No prose, no markdown.
- If you cannot find verified data for a field (e.g., a real phone number), use a sensible placeholder appropriate for an Indian college website. Never invent fake government accreditation IDs.
- For long text fields (messages, about, mission, vision), produce 2-4 sentences each, professional tone.
- "facilities" and "achievements" should each be 5-8 short bullet items (each item under 100 chars).
- "schools" should list 4-9 typical academic schools/departments suitable for the college type.
- Use the user-provided college name verbatim in collegeName.
- Use Indian phone format (+91-XXXXXXXXXX) and Indian state names.`;

async function callGemini<T>(apiKey: string | null | undefined, fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  if (!apiKey || !apiKey.trim()) throw new MissingApiKeyError();
  const ai = buildClient(apiKey.trim());
  return pRetry(
    async () => {
      try {
        return await fn(ai);
      } catch (err) {
        if (err instanceof MissingApiKeyError) throw new AbortError(err.message);
        if (isPermanent(err)) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new AbortError(msg);
        }
        throw err;
      }
    },
    {
      retries: 4,
      minTimeout: 1000,
      maxTimeout: 8000,
      factor: 2,
      onFailedAttempt: (e) => {
        if (isRateLimit(e)) {
          logger.warn({ attempt: e.attemptNumber, retriesLeft: e.retriesLeft }, "Gemini rate-limited, backing off");
        }
      },
    },
  );
}

export async function generateCollegeContent(
  apiKey: string | null | undefined,
  collegeName: string,
  hint?: string,
): Promise<GeneratedCollegeData> {
  if (!collegeName || collegeName.trim().length < 2) throw new Error("College name is required");

  const userPrompt = `Generate website content for the following college:

College name: ${collegeName.trim()}
${hint ? `Additional context: ${hint.trim()}` : ""}

Return JSON with this exact shape (omit fields you genuinely cannot infer):
{
  "collegeName": string,
  "shortName": string (3-6 letters, derived from college name),
  "tagline": string (short marketing tagline, max 80 chars),
  "established": number (year, 1900-2025) or null,
  "accreditation": string (e.g. "NAAC Accredited", "AICTE Approved") or null,
  "heroTitle": string (max 60 chars),
  "heroSubtitle": string (max 140 chars),
  "phone": string,
  "email": string,
  "address": string (street + locality),
  "city": string,
  "state": string,
  "pincode": string (6 digits),
  "principalName": string (Dr. <Name>),
  "principalMessage": string (2-3 sentences),
  "chairmanName": string,
  "chairmanMessage": string (2-3 sentences),
  "aboutText": string (3-4 sentences about the college),
  "missionText": string (2-3 sentences),
  "visionText": string (2-3 sentences),
  "facilities": string[] (5-8 items),
  "achievements": string[] (5-8 items),
  "schools": [ { "name": string, "description": string } ] (4-9 items),
  "socialLinks": {
    "facebook": string (url) or null,
    "instagram": string (url) or null,
    "twitter": string (url) or null,
    "youtube": string (url) or null,
    "linkedin": string (url) or null
  },
  "marqueeItems": string[] (5-8 short scrolling announcements, e.g. "Admissions Open 2025-26", "NAAC A+ Accredited", "100% Placement Support"),
  "stats": [
    { "label": string (e.g. "Students Enrolled"), "value": string (e.g. "5,000+") }
  ] (exactly 4 items — pick meaningful counters for this college: total students, faculty count, years established, placement rate or similar),
  "whyUs": [
    { "title": string (3-5 words), "description": string (1-2 sentences, max 120 chars) }
  ] (4-6 items highlighting unique strengths of this college),
  "testimonials": [
    { "name": string, "course": string (e.g. "MBA 2024"), "company": string (current employer + role), "text": string (2-3 sentences personal quote, first person), "rating": number (4 or 5) }
  ] (3-4 realistic student testimonials),
  "newsItems": [
    { "title": string (headline, max 80 chars), "date": string (e.g. "March 15, 2025"), "category": string (one of: Achievement, Placement, Events, Infrastructure, Academic), "summary": string (1-2 sentences, max 160 chars) }
  ] (4-5 plausible recent news items for this college)
}`;

  const response = await callGemini(apiKey, (ai) =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    }),
  );

  const raw = response.text || "";
  if (!raw.trim()) throw new Error("Gemini returned empty response");
  let parsed: GeneratedCollegeData;
  try {
    parsed = JSON.parse(raw) as GeneratedCollegeData;
  } catch (err) {
    logger.error({ err, raw: raw.slice(0, 500) }, "Failed to parse Gemini JSON");
    throw new Error("AI returned invalid JSON");
  }
  return sanitize(parsed, collegeName);
}

function sanitize(data: GeneratedCollegeData, fallbackName: string): GeneratedCollegeData {
  const out: GeneratedCollegeData = { ...data };
  out.collegeName = (data.collegeName || fallbackName).slice(0, 200);
  if (out.shortName) out.shortName = out.shortName.slice(0, 12);
  if (out.tagline) out.tagline = out.tagline.slice(0, 200);
  if (out.heroTitle) out.heroTitle = out.heroTitle.slice(0, 200);
  if (out.heroSubtitle) out.heroSubtitle = out.heroSubtitle.slice(0, 400);
  if (out.facilities) out.facilities = out.facilities.slice(0, 12).map(s => String(s).slice(0, 200));
  if (out.achievements) out.achievements = out.achievements.slice(0, 12).map(s => String(s).slice(0, 200));
  if (out.schools) {
    out.schools = out.schools.slice(0, 12).map(s => ({
      name: String(s.name || "").slice(0, 120),
      description: s.description ? String(s.description).slice(0, 300) : undefined,
    })).filter(s => s.name);
  }
  if (out.marqueeItems) {
    out.marqueeItems = out.marqueeItems.slice(0, 10).map(s => String(s).slice(0, 200));
  }
  if (out.stats) {
    out.stats = out.stats.slice(0, 6).map(s => ({
      label: String(s.label || "").slice(0, 80),
      value: String(s.value || "").slice(0, 40),
    })).filter(s => s.label && s.value);
  }
  if (out.whyUs) {
    out.whyUs = out.whyUs.slice(0, 8).map(s => ({
      title: String(s.title || "").slice(0, 80),
      description: String(s.description || "").slice(0, 200),
    })).filter(s => s.title);
  }
  if (out.testimonials) {
    out.testimonials = out.testimonials.slice(0, 6).map(s => ({
      name: String(s.name || "").slice(0, 100),
      course: s.course ? String(s.course).slice(0, 100) : undefined,
      company: s.company ? String(s.company).slice(0, 120) : undefined,
      text: String(s.text || "").slice(0, 500),
      rating: typeof s.rating === "number" ? Math.min(5, Math.max(1, Math.round(s.rating))) : 5,
    })).filter(s => s.name && s.text);
  }
  if (out.newsItems) {
    out.newsItems = out.newsItems.slice(0, 8).map(s => ({
      title: String(s.title || "").slice(0, 160),
      date: String(s.date || "").slice(0, 40),
      category: String(s.category || "Achievement").slice(0, 60),
      summary: s.summary ? String(s.summary).slice(0, 300) : undefined,
    })).filter(s => s.title && s.date);
  }
  return out;
}

export async function generateImageForSite(apiKey: string | null | undefined, prompt: string): Promise<string> {
  const response = await callGemini(apiKey, (ai) =>
    ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    }),
  );

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData,
  );
  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in AI response");
  }
  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    const ai = buildClient(apiKey.trim());
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "ok" }] }],
      config: { maxOutputTokens: 8 },
    });
    return !!r;
  } catch {
    return false;
  }
}
