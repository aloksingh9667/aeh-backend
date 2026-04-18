import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "aeh-secret-key-change-in-prod";

export interface StudentJwtPayload {
  studentId: number;
  email: string;
  rollNumber: string;
}

export function signStudentToken(payload: StudentJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyStudentToken(token: string): StudentJwtPayload {
  return jwt.verify(token, JWT_SECRET) as StudentJwtPayload;
}

export function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyStudentToken(token);
    (req as Request & { student?: StudentJwtPayload }).student = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
