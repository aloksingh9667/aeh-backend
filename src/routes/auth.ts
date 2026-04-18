import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../lib/auth.js";
import type { Request } from "express";
import type { JwtPayload } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const ADMIN_CREATE_SECRET = "Abcd1234";
const ADMIN_CREATE_OTP = "123456";

router.post("/login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password } = parsed.data;
  try {
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
    if (!admin) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    const token = signToken({ adminId: admin.id, username: admin.username, role: admin.role });
    res.json({
      token,
      user: { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  const admin = (req as Request & { admin?: JwtPayload }).admin!;
  try {
    const [user] = await db.select().from(adminsTable).where(eq(adminsTable.id, admin.adminId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

const VerifySecretBody = z.object({
  secretKey: z.string().min(1),
});

const VerifyOtpBody = z.object({
  secretKey: z.string().min(1),
  otp: z.string().min(1),
});

const CreateAdminBody = z.object({
  secretKey: z.string().min(1),
  otp: z.string().min(1),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "admissions_officer", "content_manager"]).default("admin"),
});

router.post("/verify-secret", (req, res) => {
  const parsed = VerifySecretBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Secret key is required" });
    return;
  }
  if (parsed.data.secretKey !== ADMIN_CREATE_SECRET) {
    res.status(403).json({ error: "Invalid secret key" });
    return;
  }
  res.json({ success: true });
});

router.post("/verify-otp", (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (parsed.data.secretKey !== ADMIN_CREATE_SECRET) {
    res.status(403).json({ error: "Invalid secret key" });
    return;
  }
  if (parsed.data.otp !== ADMIN_CREATE_OTP) {
    res.status(400).json({ error: "Invalid OTP. Please enter the correct OTP." });
    return;
  }
  res.json({ success: true });
});

router.post("/create-admin", async (req, res) => {
  const parsed = CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  const { secretKey, otp, username, password, name, role } = parsed.data;
  if (secretKey !== ADMIN_CREATE_SECRET) {
    res.status(403).json({ error: "Invalid secret key" });
    return;
  }
  if (otp !== ADMIN_CREATE_OTP) {
    res.status(403).json({ error: "Invalid OTP" });
    return;
  }
  try {
    const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
    if (existing) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [admin] = await db.insert(adminsTable).values({ username, passwordHash, name, role }).returning();
    req.log.info({ adminId: admin.id, username }, "New admin created");
    res.status(201).json({
      success: true,
      admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
    });
  } catch (err) {
    req.log.error({ err }, "Create admin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
