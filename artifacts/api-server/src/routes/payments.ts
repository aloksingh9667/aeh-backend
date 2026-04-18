import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, feePaymentsTable, feeStructuresTable, studentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireStudentAuth } from "../lib/studentAuth.js";
import { requireAuth } from "../lib/auth.js";
import type { Request } from "express";
import type { StudentJwtPayload } from "../lib/studentAuth.js";
import { z } from "zod";

const router = Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret || key_id.includes("PLACEHOLDER")) {
    throw new Error("Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({ key_id, key_secret });
}

function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `AEH${year}${month}${random}`;
}

const CreateOrderBody = z.object({
  feeStructureId: z.number().int(),
  paymentPlan: z.enum(["quarterly", "semester", "yearly", "full_course"]),
});

const VerifyPaymentBody = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  paymentId: z.number().int(),
});

router.post("/create-order", requireStudentAuth, async (req, res) => {
  const student = (req as Request & { student?: StudentJwtPayload }).student!;
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const razorpay = getRazorpay();
    const [feeStructure] = await db.select().from(feeStructuresTable).where(eq(feeStructuresTable.id, parsed.data.feeStructureId)).limit(1);
    if (!feeStructure) {
      res.status(404).json({ error: "Fee structure not found" });
      return;
    }
    const [studentRecord] = await db.select().from(studentsTable).where(eq(studentsTable.id, student.studentId)).limit(1);
    if (!studentRecord) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const receiptNumber = generateReceiptNumber();
    const order = await razorpay.orders.create({
      amount: feeStructure.amount * 100,
      currency: "INR",
      receipt: receiptNumber,
      notes: {
        studentId: String(studentRecord.id),
        rollNumber: studentRecord.rollNumber,
        courseCode: feeStructure.courseCode,
        paymentPlan: feeStructure.paymentPlan,
      },
    });
    const [payment] = await db.insert(feePaymentsTable).values({
      studentId: studentRecord.id,
      studentName: studentRecord.name,
      studentEmail: studentRecord.email,
      rollNumber: studentRecord.rollNumber,
      courseCode: feeStructure.courseCode,
      courseName: feeStructure.courseName,
      paymentPlan: feeStructure.paymentPlan,
      amount: feeStructure.amount,
      razorpayOrderId: order.id,
      receiptNumber,
      status: "pending",
    }).returning();
    res.json({
      orderId: order.id,
      amount: feeStructure.amount * 100,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment.id,
      receiptNumber,
      studentName: studentRecord.name,
      studentEmail: studentRecord.email,
    });
  } catch (err: any) {
    req.log.error({ err }, "Create order error");
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/verify", requireStudentAuth, async (req, res) => {
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = parsed.data;
  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET!;
    const hmac = crypto.createHmac("sha256", key_secret);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generated = hmac.digest("hex");
    if (generated !== razorpaySignature) {
      res.status(400).json({ error: "Payment verification failed - invalid signature" });
      return;
    }
    const [payment] = await db.update(feePaymentsTable)
      .set({
        razorpayPaymentId,
        razorpaySignature,
        status: "success",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(feePaymentsTable.id, paymentId))
      .returning();
    res.json({ success: true, payment, receiptNumber: payment.receiptNumber });
  } catch (err) {
    req.log.error({ err }, "Verify payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my-payments", requireStudentAuth, async (req, res) => {
  const student = (req as Request & { student?: StudentJwtPayload }).student!;
  try {
    const payments = await db.select().from(feePaymentsTable)
      .where(eq(feePaymentsTable.studentId, student.studentId))
      .orderBy(desc(feePaymentsTable.createdAt));
    res.json(payments);
  } catch (err) {
    req.log.error({ err }, "Get my payments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const payments = await db.select().from(feePaymentsTable).orderBy(desc(feePaymentsTable.createdAt));
    res.json(payments);
  } catch (err) {
    req.log.error({ err }, "Get all payments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(feePaymentsTable).where(eq(feePaymentsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
