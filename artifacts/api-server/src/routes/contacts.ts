import { Router } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import {
  CreateContactBody,
  UpdateContactStatusBody,
  ListContactsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const parsed = ListContactsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;
  const status = parsed.success ? parsed.data.status : undefined;

  try {
    const query = db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt));
    const whereClause = status ? eq(contactsTable.status, status as "new" | "read" | "replied") : undefined;

    const data = whereClause
      ? await query.where(whereClause).limit(limit).offset(offset)
      : await query.limit(limit).offset(offset);

    const [{ value: total }] = whereClause
      ? await db.select({ value: count() }).from(contactsTable).where(whereClause)
      : await db.select({ value: count() }).from(contactsTable);

    res.json({
      data: data.map(mapContact),
      total: Number(total),
    });
  } catch (err) {
    req.log.error({ err }, "List contacts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [contact] = await db.insert(contactsTable).values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      course: parsed.data.course ?? null,
      classType: parsed.data.classType as "regular" | "weekend" | undefined ?? null,
    }).returning();
    res.status(201).json(mapContact(contact));
  } catch (err) {
    req.log.error({ err }, "Create contact error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateContactStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [updated] = await db.update(contactsTable)
      .set({ status: parsed.data.status as "new" | "read" | "replied", updatedAt: new Date() })
      .where(eq(contactsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.json(mapContact(updated));
  } catch (err) {
    req.log.error({ err }, "Update contact error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(contactsTable).where(eq(contactsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Contact not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete contact error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapContact(c: typeof contactsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    message: c.message,
    course: c.course,
    classType: c.classType,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
