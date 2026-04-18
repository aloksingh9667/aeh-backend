import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import studentAuthRouter from "./studentAuth.js";
import applicationsRouter from "./applications.js";
import contactsRouter from "./contacts.js";
import careersRouter from "./careers.js";
import statsRouter from "./stats.js";
import coursesRouter from "./courses.js";
import feeStructuresRouter from "./feeStructures.js";
import paymentsRouter from "./payments.js";
import studentsRouter from "./students.js";
import eventsRouter from "./events.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/student", studentAuthRouter);
router.use("/applications", applicationsRouter);
router.use("/contacts", contactsRouter);
router.use("/careers", careersRouter);
router.use("/stats", statsRouter);
router.use("/courses", coursesRouter);
router.use("/fee-structures", feeStructuresRouter);
router.use("/payments", paymentsRouter);
router.use("/students", studentsRouter);
router.use("/events", eventsRouter);

export default router;
