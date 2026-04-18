import { Router } from "express";
import { db, feeStructuresTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const FeeStructureBody = z.object({
  courseCode: z.string().min(1),
  courseName: z.string().min(1),
  paymentPlan: z.enum(["quarterly", "semester", "yearly", "full_course"]),
  amount: z.number().int().min(1),
  description: z.string().optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  fineAmount: z.number().int().min(0).optional(),
  fineType: z.enum(["fixed", "per_day"]).optional(),
  academicYear: z.string().optional(),
  isActive: z.string().optional(),
});

router.get("/", async (req, res) => {
  try {
    const { courseCode } = req.query;
    let query = db.select().from(feeStructuresTable);
    if (courseCode) {
      const fees = await db.select().from(feeStructuresTable).where(eq(feeStructuresTable.courseCode, courseCode as string));
      res.json(fees);
      return;
    }
    const fees = await db.select().from(feeStructuresTable).orderBy(feeStructuresTable.courseCode, feeStructuresTable.paymentPlan);
    res.json(fees);
  } catch (err) {
    req.log.error({ err }, "Get fee structures error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = FeeStructureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const [fee] = await db.insert(feeStructuresTable).values(parsed.data).returning();
    res.status(201).json(fee);
  } catch (err) {
    req.log.error({ err }, "Create fee structure error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = FeeStructureBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const [updated] = await db.update(feeStructuresTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(feeStructuresTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update fee structure error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(feeStructuresTable).where(eq(feeStructuresTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete fee structure error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
