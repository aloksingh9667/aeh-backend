import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const eventSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().min(1),
  eventDateEnd: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

// Public: list published events
router.get("/", async (req, res) => {
  try {
    const events = await db.select().from(eventsTable)
      .where(eq(eventsTable.isPublished, true))
      .orderBy(desc(eventsTable.isFeatured), eventsTable.eventDate);
    res.json({ data: events });
  } catch (err) {
    req.log.error({ err }, "Events list error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: list all events
router.get("/all", requireAuth, async (req, res) => {
  try {
    const events = await db.select().from(eventsTable)
      .orderBy(desc(eventsTable.createdAt));
    res.json({ data: events });
  } catch (err) {
    req.log.error({ err }, "Events all list error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: create event
router.post("/", requireAuth, async (req, res) => {
  try {
    const data = eventSchema.parse(req.body);
    const [event] = await db.insert(eventsTable).values({
      title: data.title,
      category: data.category,
      shortDescription: data.shortDescription,
      description: data.description,
      eventDate: data.eventDate,
      eventDateEnd: data.eventDateEnd,
      location: data.location,
      imageUrl: data.imageUrl,
      isFeatured: data.isFeatured ?? false,
      isPublished: data.isPublished ?? true,
    }).returning();
    res.status(201).json(event);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    req.log.error({ err }, "Event create error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: update event
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = eventSchema.partial().parse(req.body);
    const [event] = await db.update(eventsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(eventsTable.id, id))
      .returning();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(event);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    req.log.error({ err }, "Event update error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: delete event
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Event delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
