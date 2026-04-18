import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "success", "failed", "refunded"]);

export const feePaymentsTable = pgTable("fee_payments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  studentName: text("student_name").notNull(),
  studentEmail: text("student_email").notNull(),
  rollNumber: text("roll_number").notNull(),
  courseCode: text("course_code").notNull(),
  courseName: text("course_name").notNull(),
  paymentPlan: text("payment_plan").notNull(),
  amount: integer("amount").notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  receiptNumber: text("receipt_number").unique().notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
