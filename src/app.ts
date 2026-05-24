import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { seedDatabase } from "./lib/seed.js";
import { db, pool, siteConfigTable } from "./db/index.js";
import { eq } from "drizzle-orm";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["*"];

app.use(cors({
  origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/api", router);

seedDatabase().catch(err => logger.error({ err }, "Failed to seed database"));

// Back-fill quarterly fee records for courses that have semester fees but no quarterly fees
pool.query(`
  INSERT INTO fee_structures
    (course_code, course_name, payment_plan, amount, fee_category, academic_year,
     due_day, fine_amount, fine_type, is_active, created_at, updated_at)
  SELECT
    course_code, course_name, 'quarterly',
    ROUND(amount / 2.0)::int,
    fee_category, academic_year, due_day, fine_amount, fine_type, is_active,
    NOW(), NOW()
  FROM fee_structures f
  WHERE f.payment_plan = 'semester'
    AND NOT EXISTS (
      SELECT 1 FROM fee_structures q
      WHERE q.course_code = f.course_code
        AND q.payment_plan = 'quarterly'
        AND q.fee_category = f.fee_category
    );
`).then(r => {
  if (r.rowCount && r.rowCount > 0)
    logger.info({ inserted: r.rowCount }, "Back-filled quarterly fee records");
}).catch(err => logger.error({ err }, "Quarterly fee back-fill error"));

// Add schedule columns if they don't exist (idempotent migration)
pool.query(`
  ALTER TABLE site_config
    ADD COLUMN IF NOT EXISTS scheduled_data jsonb,
    ADD COLUMN IF NOT EXISTS scheduled_at timestamp;
`).then(() => {
  logger.info("Schedule columns ready");
}).catch(err => logger.error({ err }, "Schedule migration error"));

// Background job: check every 60s and auto-publish scheduled configs
setInterval(async () => {
  try {
    const rows = await db.select().from(siteConfigTable).limit(1);
    if (rows.length === 0) return;
    const config = rows[0];
    if (config.scheduledAt && config.scheduledData && new Date(config.scheduledAt) <= new Date()) {
      const { scheduledData, scheduledAt: _sa, ...rest } = config;
      void rest;
      const updatePayload = {
        ...(scheduledData as Record<string, unknown>),
        scheduledData: null,
        scheduledAt: null,
        updatedAt: new Date(),
      };
      await db
        .update(siteConfigTable)
        .set(updatePayload)
        .where(eq(siteConfigTable.id, config.id));
      logger.info({ configId: config.id }, "Scheduled config auto-published");
    }
  } catch (err) {
    logger.error({ err }, "Schedule checker error");
  }
}, 60_000);

export default app;
