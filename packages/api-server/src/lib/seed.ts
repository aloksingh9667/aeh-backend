import bcrypt from "bcryptjs";
import { db, adminsTable, applicationsTable, contactsTable, careersTable, coursesTable, feeStructuresTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "./logger.js";

export async function seedDatabase() {
  try {
    const existingAdmins = await db.select().from(adminsTable).limit(1);
    if (existingAdmins.length === 0) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      await db.insert(adminsTable).values([
        { username: "admin", passwordHash, name: "Administrator", role: "admin" },
        { username: "admissions", passwordHash: await bcrypt.hash("admissions123", 10), name: "Admissions Officer", role: "admissions_officer" },
      ]);
      logger.info("Created default admin users");
    }

    const existingApps = await db.select({ cnt: count() }).from(applicationsTable);
    if (Number(existingApps[0]?.cnt ?? 0) === 0) {
      await db.insert(applicationsTable).values([
        { name: "Rahul Sharma", email: "rahul@example.com", phone: "9876543210", course: "BBA", classType: "regular", status: "pending", message: "Interested in management studies" },
        { name: "Priya Gupta", email: "priya@example.com", phone: "9812345678", course: "BCA", classType: "regular", status: "reviewing", message: "Looking forward to IT career" },
        { name: "Amit Kumar", email: "amit@example.com", phone: "9765432101", course: "MBA", classType: "weekend", status: "accepted" },
        { name: "Sunita Singh", email: "sunita@example.com", phone: "9823456789", course: "B.Com", classType: "regular", status: "pending" },
        { name: "Deepak Patel", email: "deepak@example.com", phone: "9898989898", course: "BJMC", classType: "regular", status: "rejected" },
      ]);
      logger.info("Seeded sample applications");
    }

    const existingContacts = await db.select({ cnt: count() }).from(contactsTable);
    if (Number(existingContacts[0]?.cnt ?? 0) === 0) {
      await db.insert(contactsTable).values([
        { name: "Vikram Mehta", email: "vikram@example.com", phone: "9811234567", message: "Please share details about BBA program", course: "BBA", status: "new" },
        { name: "Kavya Joshi", email: "kavya@example.com", phone: "9877654321", message: "What is the fee structure for MCA?", course: "MCA", status: "read" },
        { name: "Rohan Tiwari", email: "rohan@example.com", phone: "9865432198", message: "How to apply for scholarship?", status: "replied" },
      ]);
      logger.info("Seeded sample contacts");
    }

    const existingCareers = await db.select({ cnt: count() }).from(careersTable);
    if (Number(existingCareers[0]?.cnt ?? 0) === 0) {
      await db.insert(careersTable).values([
        { name: "Dr. Neha Verma", email: "neha@example.com", phone: "9871234567", position: "Assistant Professor - Management", status: "reviewing" },
        { name: "Prof. Rajesh Kumar", email: "rajesh@example.com", phone: "9845678901", position: "Associate Professor - Computer Science", status: "pending" },
      ]);
      logger.info("Seeded sample career applications");
    }
    const existingCourses = await db.select({ cnt: count() }).from(coursesTable);
    if (Number(existingCourses[0]?.cnt ?? 0) === 0) {
      await db.insert(coursesTable).values([
        { name: "Bachelor of Business Administration", code: "BBA", school: "School of Management", duration: "3 Years", totalSemesters: 6, eligibility: "10+2 in any stream", description: "Professional management program" },
        { name: "Master of Business Administration", code: "MBA", school: "School of Management", duration: "2 Years", totalSemesters: 4, eligibility: "Bachelor's degree in any field", description: "Advanced management studies" },
        { name: "Bachelor of Computer Applications", code: "BCA", school: "School of CS & IT", duration: "3 Years", totalSemesters: 6, eligibility: "10+2 with Mathematics", description: "Comprehensive IT program" },
        { name: "Master of Computer Applications", code: "MCA", school: "School of CS & IT", duration: "2 Years", totalSemesters: 4, eligibility: "BCA or B.Sc (Computer Science)", description: "Advanced IT program" },
        { name: "Bachelor of Commerce", code: "BCOM", school: "School of Commerce", duration: "3 Years", totalSemesters: 6, eligibility: "10+2 in Commerce", description: "Commerce and accounting program" },
        { name: "Master of Commerce", code: "MCOM", school: "School of Commerce", duration: "2 Years", totalSemesters: 4, eligibility: "B.Com", description: "Advanced commerce studies" },
        { name: "Bachelor of Arts", code: "BA", school: "School of Humanities", duration: "3 Years", totalSemesters: 6, eligibility: "10+2 in any stream", description: "Humanities and arts program" },
        { name: "Bachelor of Journalism & Mass Communication", code: "BJMC", school: "School of Communication", duration: "3 Years", totalSemesters: 6, eligibility: "10+2 in any stream", description: "Media and journalism program" },
        { name: "Bachelor of Pharmacy", code: "BPHARM", school: "School of Pharmacy", duration: "4 Years", totalSemesters: 8, eligibility: "10+2 with PCB/PCM", description: "Pharmaceutical sciences program" },
        { name: "Diploma in Pharmacy", code: "DPHARM", school: "School of Pharmacy", duration: "2 Years", totalSemesters: 4, eligibility: "10+2 with PCB/PCM", description: "Diploma in Pharmacy" },
        { name: "BA LLB", code: "BALLB", school: "School of Law", duration: "5 Years", totalSemesters: 10, eligibility: "10+2 in any stream", description: "Integrated law program" },
        { name: "Bachelor of Education", code: "BED", school: "School of Education", duration: "2 Years", totalSemesters: 4, eligibility: "Bachelor's degree", description: "Teaching and education program" },
      ]);
      logger.info("Seeded courses");
    }

    const existingFees = await db.select({ cnt: count() }).from(feeStructuresTable);
    if (Number(existingFees[0]?.cnt ?? 0) === 0) {
      await db.insert(feeStructuresTable).values([
        { courseCode: "BBA", courseName: "Bachelor of Business Administration", paymentPlan: "semester", amount: 25000 },
        { courseCode: "BBA", courseName: "Bachelor of Business Administration", paymentPlan: "yearly", amount: 48000 },
        { courseCode: "BBA", courseName: "Bachelor of Business Administration", paymentPlan: "full_course", amount: 135000 },
        { courseCode: "MBA", courseName: "Master of Business Administration", paymentPlan: "semester", amount: 35000 },
        { courseCode: "MBA", courseName: "Master of Business Administration", paymentPlan: "yearly", amount: 65000 },
        { courseCode: "MBA", courseName: "Master of Business Administration", paymentPlan: "full_course", amount: 125000 },
        { courseCode: "BCA", courseName: "Bachelor of Computer Applications", paymentPlan: "semester", amount: 22000 },
        { courseCode: "BCA", courseName: "Bachelor of Computer Applications", paymentPlan: "yearly", amount: 42000 },
        { courseCode: "BCA", courseName: "Bachelor of Computer Applications", paymentPlan: "full_course", amount: 120000 },
        { courseCode: "MCA", courseName: "Master of Computer Applications", paymentPlan: "semester", amount: 30000 },
        { courseCode: "MCA", courseName: "Master of Computer Applications", paymentPlan: "yearly", amount: 56000 },
        { courseCode: "MCA", courseName: "Master of Computer Applications", paymentPlan: "full_course", amount: 108000 },
        { courseCode: "BCOM", courseName: "Bachelor of Commerce", paymentPlan: "semester", amount: 18000 },
        { courseCode: "BCOM", courseName: "Bachelor of Commerce", paymentPlan: "yearly", amount: 34000 },
        { courseCode: "BCOM", courseName: "Bachelor of Commerce", paymentPlan: "full_course", amount: 96000 },
        { courseCode: "BJMC", courseName: "Bachelor of Journalism & Mass Communication", paymentPlan: "semester", amount: 22000 },
        { courseCode: "BJMC", courseName: "Bachelor of Journalism & Mass Communication", paymentPlan: "yearly", amount: 42000 },
        { courseCode: "BJMC", courseName: "Bachelor of Journalism & Mass Communication", paymentPlan: "full_course", amount: 120000 },
        { courseCode: "BPHARM", courseName: "Bachelor of Pharmacy", paymentPlan: "semester", amount: 40000 },
        { courseCode: "BPHARM", courseName: "Bachelor of Pharmacy", paymentPlan: "yearly", amount: 75000 },
        { courseCode: "BPHARM", courseName: "Bachelor of Pharmacy", paymentPlan: "full_course", amount: 288000 },
        { courseCode: "BALLB", courseName: "BA LLB", paymentPlan: "semester", amount: 28000 },
        { courseCode: "BALLB", courseName: "BA LLB", paymentPlan: "yearly", amount: 52000 },
        { courseCode: "BALLB", courseName: "BA LLB", paymentPlan: "full_course", amount: 250000 },
        { courseCode: "BED", courseName: "Bachelor of Education", paymentPlan: "semester", amount: 25000 },
        { courseCode: "BED", courseName: "Bachelor of Education", paymentPlan: "yearly", amount: 47000 },
        { courseCode: "BED", courseName: "Bachelor of Education", paymentPlan: "full_course", amount: 90000 },
        { courseCode: "BA", courseName: "Bachelor of Arts", paymentPlan: "semester", amount: 15000 },
        { courseCode: "BA", courseName: "Bachelor of Arts", paymentPlan: "yearly", amount: 28000 },
        { courseCode: "BA", courseName: "Bachelor of Arts", paymentPlan: "full_course", amount: 80000 },
      ]);
      logger.info("Seeded fee structures");
    }
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}
