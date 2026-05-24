import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, siteConfigTable, siteConfigUpdateSchema, type SiteConfig } from "../db/index.js";
import { requireAuth } from "../lib/auth.js";
import { generateCollegeContent, generateImageForSite, verifyApiKey, MissingApiKeyError } from "../lib/gemini.js";

const router = Router();

async function getOrCreateConfig(): Promise<SiteConfig> {
  const existing = await db.select().from(siteConfigTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(siteConfigTable).values({}).returning();
  return created;
}

function publicView(c: SiteConfig) {
  const { geminiApiKey, ...rest } = c;
  return { ...rest, geminiApiKeySet: !!(geminiApiKey && geminiApiKey.trim()) };
}

router.get("/", async (_req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json(publicView(config));
  } catch {
    res.status(500).json({ error: "Failed to load site config" });
  }
});

// Admin view returns the same redacted shape (key value never leaves server, only the "set" flag)
router.get("/admin", requireAuth, async (_req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json(publicView(config));
  } catch {
    res.status(500).json({ error: "Failed to load site config" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  const parsed = siteConfigUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const existing = await getOrCreateConfig();
    // If geminiApiKey is empty string, treat as "clear"; if missing, leave alone
    const data = { ...parsed.data, updatedAt: new Date() };
    if (Object.prototype.hasOwnProperty.call(data, "geminiApiKey")) {
      const v = data.geminiApiKey;
      if (v === undefined) delete data.geminiApiKey;
      else if (typeof v === "string" && v.trim() === "") data.geminiApiKey = null;
    }
    const [updated] = await db
      .update(siteConfigTable)
      .set(data)
      .where(eq(siteConfigTable.id, existing.id))
      .returning();
    res.json(publicView(updated));
  } catch (err) {
    req.log.error({ err }, "Update site config error");
    res.status(500).json({ error: "Failed to update site config" });
  }
});

const verifyKeySchema = z.object({ apiKey: z.string().min(10).max(200) });

router.post("/verify-key", requireAuth, async (req, res) => {
  const parsed = verifyKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const ok = await verifyApiKey(parsed.data.apiKey);
  res.json({ valid: ok });
});

const generateBodySchema = z.object({
  collegeName: z.string().min(2).max(200),
  hint: z.string().max(500).optional(),
});

router.post("/generate", requireAuth, async (req, res) => {
  const parsed = generateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const config = await getOrCreateConfig();
    const data = await generateCollegeContent(config.geminiApiKey, parsed.data.collegeName, parsed.data.hint);
    res.json({ data });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      res.status(400).json({ error: err.message, missingKey: true });
      return;
    }
    const msg = err instanceof Error ? err.message : "AI generation failed";
    req.log.error({ err }, "Generate site content error");
    res.status(502).json({ error: msg });
  }
});

const generateImageSchema = z.object({
  prompt: z.string().min(5).max(500),
  field: z.enum(["logoUrl", "heroImageUrl", "principalPhotoUrl", "chairmanPhotoUrl", "faviconUrl"]),
});

router.post("/generate-image", requireAuth, async (req, res) => {
  const parsed = generateImageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const config = await getOrCreateConfig();
    const dataUrl = await generateImageForSite(config.geminiApiKey, parsed.data.prompt);
    res.json({ dataUrl, field: parsed.data.field });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      res.status(400).json({ error: err.message, missingKey: true });
      return;
    }
    const msg = err instanceof Error ? err.message : "Image generation failed";
    req.log.error({ err }, "Generate site image error");
    res.status(502).json({ error: msg });
  }
});

const scheduleBodySchema = z.object({
  scheduledAt: z.string().min(1),
  data: z.record(z.unknown()),
});

router.get("/schedule", requireAuth, async (_req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json({
      scheduledAt: config.scheduledAt ? config.scheduledAt.toISOString() : null,
    });
  } catch {
    res.status(500).json({ error: "Failed to read schedule" });
  }
});

router.put("/schedule", requireAuth, async (req, res) => {
  const parsed = scheduleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  try {
    const config = await getOrCreateConfig();
    const { scheduledAt, data } = parsed.data;
    const dt = new Date(scheduledAt);
    if (isNaN(dt.getTime()) || dt <= new Date()) {
      res.status(400).json({ error: "Scheduled time must be in the future" });
      return;
    }
    await db
      .update(siteConfigTable)
      .set({ scheduledData: data, scheduledAt: dt })
      .where(eq(siteConfigTable.id, config.id));
    res.json({ scheduledAt: dt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Schedule set error");
    res.status(500).json({ error: "Failed to save schedule" });
  }
});

router.delete("/schedule", requireAuth, async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    await db
      .update(siteConfigTable)
      .set({ scheduledData: null, scheduledAt: null })
      .where(eq(siteConfigTable.id, config.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Schedule cancel error");
    res.status(500).json({ error: "Failed to cancel schedule" });
  }
});

export default router;
