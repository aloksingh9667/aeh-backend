import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const studentStatusEnum = pgEnum("student_status", ["pending", "active", "inactive", "graduated", "suspended"]);

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  rollNumber: text("roll_number").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  course: text("course").notNull(),
  courseCode: text("course_code").notNull(),
  enrollmentYear: text("enrollment_year").notNull(),
  semester: text("semester").default("1"),
  status: studentStatusEnum("status").default("pending").notNull(),
  admissionDate: text("admission_date"),
  address: text("address"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
