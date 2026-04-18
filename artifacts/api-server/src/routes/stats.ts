import { Router } from "express";
import { db, applicationsTable, contactsTable, careersTable, studentsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const [[{ total: totalApps }], [{ pending: pendingApps }], [{ total: totalContacts }], [{ newContacts }], [{ total: totalCareers }], [{ total: totalStudents }], [{ pendingStudents }]] = await Promise.all([
      db.select({ total: count() }).from(applicationsTable),
      db.select({ pending: count() }).from(applicationsTable).where(eq(applicationsTable.status, "pending")),
      db.select({ total: count() }).from(contactsTable),
      db.select({ newContacts: count() }).from(contactsTable).where(eq(contactsTable.status, "new")),
      db.select({ total: count() }).from(careersTable),
      db.select({ total: count() }).from(studentsTable),
      db.select({ pendingStudents: count() }).from(studentsTable).where(eq(studentsTable.status, "pending")),
    ]);

    const appsByStatus = await db
      .select({ status: applicationsTable.status, cnt: count() })
      .from(applicationsTable)
      .groupBy(applicationsTable.status);

    const appsByCourse = await db
      .select({ course: applicationsTable.course, cnt: count() })
      .from(applicationsTable)
      .groupBy(applicationsTable.course)
      .orderBy(desc(count()));

    const applicationsByStatus: Record<string, number> = {};
    for (const row of appsByStatus) {
      applicationsByStatus[row.status] = Number(row.cnt);
    }

    res.json({
      totalApplications: Number(totalApps),
      pendingApplications: Number(pendingApps),
      totalContacts: Number(totalContacts),
      newContacts: Number(newContacts),
      totalCareers: Number(totalCareers),
      totalStudents: Number(totalStudents),
      pendingStudents: Number(pendingStudents),
      applicationsByStatus,
      applicationsByCourse: appsByCourse.map(r => ({ course: r.course, count: Number(r.cnt) })),
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent", requireAuth, async (req, res) => {
  try {
    const [recentApps, recentContacts, recentCareers] = await Promise.all([
      db.select().from(applicationsTable).orderBy(desc(applicationsTable.createdAt)).limit(5),
      db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt)).limit(5),
      db.select().from(careersTable).orderBy(desc(careersTable.createdAt)).limit(5),
    ]);

    const items = [
      ...recentApps.map(a => ({ type: "application" as const, id: a.id, name: a.name, action: `Applied for ${a.course}`, createdAt: a.createdAt.toISOString() })),
      ...recentContacts.map(c => ({ type: "contact" as const, id: c.id, name: c.name, action: "Sent contact inquiry", createdAt: c.createdAt.toISOString() })),
      ...recentCareers.map(c => ({ type: "career" as const, id: c.id, name: c.name, action: c.position ? `Applied for ${c.position}` : "Submitted CV", createdAt: c.createdAt.toISOString() })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    res.json({ items });
  } catch (err) {
    req.log.error({ err }, "Recent activity error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
