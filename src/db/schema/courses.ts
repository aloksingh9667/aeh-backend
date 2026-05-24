import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const courseDurationEnum = pgEnum("course_duration_type", ["1_year", "2_year", "3_year", "4_year", "5_year"]);

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  school: text("school").notNull(),
  duration: text("duration").notNull(),
  totalSemesters: integer("total_semesters").notNull().default(4),
  description: text("description"),
  eligibility: text("eligibility"),
  isActive: text("is_active").default("true").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
