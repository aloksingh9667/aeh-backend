import { Router } from "express";
import { db, applicationsTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import {
  CreateApplicationBody,
  UpdateApplicationStatusBody,
  ListApplicationsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const parsed = ListApplicationsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;
  const status = parsed.success ? parsed.data.status : undefined;

  try {
    const query = db.select().from(applicationsTable).orderBy(desc(applicationsTable.createdAt));

    const whereClause = status ? eq(applicationsTable.status, status as "pending" | "reviewing" | "accepted" | "rejected") : undefined;

    const data = whereClause
      ? await query.where(whereClause).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);

    const [{ value: total }] = whereClause
      ? await db.select({ value: count() }).from(applicationsTable).where(whereClause)
      : await db.select({ value: count() }).from(applicationsTable);

    res.json({
      data: data.map(mapApplication),
      total: Number(total),
    });
  } catch (err) {
    req.log.error({ err }, "List applications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [app] = await db.insert(applicationsTable).values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      course: parsed.data.course,
      classType: parsed.data.classType as "regular" | "weekend",
      message: parsed.data.message ?? null,
    }).returning();
    res.status(201).json(mapApplication(app));
  } catch (err) {
    req.log.error({ err }, "Create application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id)).limit(1);
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    res.json(mapApplication(app));
  } catch (err) {
    req.log.error({ err }, "Get application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateApplicationStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [updated] = await db.update(applicationsTable)
      .set({
        status: parsed.data.status as "pending" | "reviewing" | "accepted" | "rejected",
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(applicationsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    res.json(mapApplication(updated));
  } catch (err) {
    req.log.error({ err }, "Update application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(applicationsTable).where(eq(applicationsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Application not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete application error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapApplication(a: typeof applicationsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    course: a.course,
    classType: a.classType,
    message: a.message,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export default router;
