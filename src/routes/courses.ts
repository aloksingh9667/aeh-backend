import { Router } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const CourseBody = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  school: z.string().min(2),
  duration: z.string().min(1),
  totalSemesters: z.number().int().min(1).max(12),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  isActive: z.string().optional(),
});

router.get("/", async (req, res) => {
  try {
    const courses = await db.select().from(coursesTable).orderBy(coursesTable.school, coursesTable.name);
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Get courses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const [course] = await db.insert(coursesTable).values(parsed.data).returning();
    res.status(201).json(course);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Course code already exists" });
      return;
    }
    req.log.error({ err }, "Create course error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CourseBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const [updated] = await db.update(coursesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(coursesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update course error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(coursesTable).where(eq(coursesTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete course error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
