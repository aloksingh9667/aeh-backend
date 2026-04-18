import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, studentsTable } from "@workspace/db";
import { eq, desc, ilike, or, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const UpdateStudentBody = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  course: z.string().optional(),
  courseCode: z.string().optional(),
  semester: z.string().optional(),
  status: z.enum(["active", "inactive", "graduated", "suspended"]).optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  enrollmentYear: z.string().optional(),
});

const CreateStudentBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  rollNumber: z.string().min(3),
  course: z.string().min(2),
  courseCode: z.string().min(2),
  enrollmentYear: z.string().min(4),
  semester: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const { search, status, limit: lim = "50", offset: off = "0" } = req.query as Record<string, string>;
  try {
    const limit = parseInt(lim) || 50;
    const offset = parseInt(off) || 0;
    let data;
    if (search) {
      data = await db.select().from(studentsTable)
        .where(or(
          ilike(studentsTable.name, `%${search}%`),
          ilike(studentsTable.email, `%${search}%`),
          ilike(studentsTable.rollNumber, `%${search}%`),
        ))
        .orderBy(desc(studentsTable.createdAt)).limit(limit).offset(offset);
    } else if (status) {
      data = await db.select().from(studentsTable)
        .where(eq(studentsTable.status, status as "active" | "inactive" | "graduated" | "suspended"))
        .orderBy(desc(studentsTable.createdAt)).limit(limit).offset(offset);
    } else {
      data = await db.select().from(studentsTable)
        .orderBy(desc(studentsTable.createdAt)).limit(limit).offset(offset);
    }
    const sanitized = data.map(({ passwordHash: _, ...rest }) => rest);
    const [{ total }] = await db.select({ total: count() }).from(studentsTable);
    res.json({ data: sanitized, total });
  } catch (err) {
    req.log.error({ err }, "Get students error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  const { password, ...rest } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [student] = await db.insert(studentsTable).values({ ...rest, passwordHash }).returning();
    const { passwordHash: _, ...safe } = student;
    res.status(201).json(safe);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Email or roll number already exists" });
      return;
    }
    req.log.error({ err }, "Create student error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const [updated] = await db.update(studentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(studentsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const { passwordHash: _, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    req.log.error({ err }, "Update student error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(studentsTable).where(eq(studentsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete student error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
