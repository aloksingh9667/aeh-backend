import { Router } from "express";
import { db, careersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import {
  CreateCareerBody,
  UpdateCareerStatusBody,
  ListCareersQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const parsed = ListCareersQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;
  const status = parsed.success ? parsed.data.status : undefined;

  try {
    const query = db.select().from(careersTable).orderBy(desc(careersTable.createdAt));
    const whereClause = status ? eq(careersTable.status, status as "pending" | "reviewing" | "hired" | "rejected") : undefined;

    const data = whereClause
      ? await query.where(whereClause).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);

    const [{ value: total }] = whereClause
      ? await db.select({ value: count() }).from(careersTable).where(whereClause)
      : await db.select({ value: count() }).from(careersTable);

    res.json({
      data: data.map(mapCareer),
      total: Number(total),
    });
  } catch (err) {
    req.log.error({ err }, "List careers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateCareerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [career] = await db.insert(careersTable).values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      position: parsed.data.position ?? null,
      cvUrl: parsed.data.cvUrl ?? null,
    }).returning();
    res.status(201).json(mapCareer(career));
  } catch (err) {
    req.log.error({ err }, "Create career error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateCareerStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [updated] = await db.update(careersTable)
      .set({ status: parsed.data.status as "pending" | "reviewing" | "hired" | "rejected", updatedAt: new Date() })
      .where(eq(careersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Career not found" });
      return;
    }
    res.json(mapCareer(updated));
  } catch (err) {
    req.log.error({ err }, "Update career error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(careersTable).where(eq(careersTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Career not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete career error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapCareer(c: typeof careersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    position: c.position,
    cvUrl: c.cvUrl,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
