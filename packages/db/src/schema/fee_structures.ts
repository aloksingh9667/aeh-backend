import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const paymentPlanEnum = pgEnum("payment_plan", ["quarterly", "semester", "yearly", "full_course"]);

export const feeStructuresTable = pgTable("fee_structures", {
  id: serial("id").primaryKey(),
  courseCode: text("course_code").notNull(),
  courseName: text("course_name").notNull(),
  paymentPlan: paymentPlanEnum("payment_plan").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  isActive: text("is_active").default("true").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
