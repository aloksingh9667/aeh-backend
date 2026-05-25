import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const siteConfigTable = pgTable("site_config", {
  id: serial("id").primaryKey(),

  collegeName: text("college_name").notNull().default("Avviare Educational Hub"),
  shortName: text("short_name").notNull().default("AEH"),
  tagline: text("tagline").notNull().default("Excellence in Education"),
  established: integer("established"),
  accreditation: text("accreditation"),

  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  heroImageUrl: text("hero_image_url"),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),

  primaryColor: text("primary_color").notNull().default("#0a2540"),
  accentColor: text("accent_color").notNull().default("#c9a227"),

  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  officeHours: text("office_hours"),
  mapEmbedUrl: text("map_embed_url"),

  principalName: text("principal_name"),
  principalMessage: text("principal_message"),
  principalPhotoUrl: text("principal_photo_url"),

  chairmanName: text("chairman_name"),
  chairmanMessage: text("chairman_message"),
  chairmanPhotoUrl: text("chairman_photo_url"),

  aboutText: text("about_text"),
  missionText: text("mission_text"),
  visionText: text("vision_text"),

  facilities: jsonb("facilities").$type<string[]>().default([]),
  achievements: jsonb("achievements").$type<string[]>().default([]),
  schools: jsonb("schools").$type<Array<{ name: string; description?: string }>>().default([]),
  socialLinks: jsonb("social_links").$type<{
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  }>().default({}),

  geminiApiKey: text("gemini_api_key"),

  marqueeItems: jsonb("marquee_items").$type<string[]>().default([]),
  stats: jsonb("stats").$type<Array<{ label: string; value: string }>>().default([]),
  whyUs: jsonb("why_us").$type<Array<{ title: string; description: string }>>().default([]),
  testimonials: jsonb("testimonials").$type<Array<{
    name: string;
    course?: string;
    company?: string;
    text: string;
    photoUrl?: string;
    rating?: number;
  }>>().default([]),
  team: jsonb("team").$type<Array<{
    department: string;
    members: Array<{ name: string; title: string; photoUrl?: string }>;
  }>>().default([]),
  gallery: jsonb("gallery").$type<Array<{
    title: string;
    description?: string;
    items: Array<{ label: string; imageUrl: string }>;
  }>>().default([]),
  newsItems: jsonb("news_items").$type<Array<{
    title: string;
    date: string;
    category: string;
    summary?: string;
    body?: string;
    imageUrl?: string;
  }>>().default([]),

  featureFlags: jsonb("feature_flags").$type<{
    showTopBar?: boolean;
    showMarquee?: boolean;
    showStats?: boolean;
    showWhyUs?: boolean;
    showTestimonials?: boolean;
    showNews?: boolean;
    showLeadership?: boolean;
    showGallery?: boolean;
    showTeam?: boolean;
    showSchools?: boolean;
    showAchievements?: boolean;
    showApplyCta?: boolean;
    showFacilities?: boolean;
    sectionTemplates?: Record<string, string>;
  }>().default({}),

  navbar: jsonb("navbar").$type<{
    items?: Array<{ label: string; href: string; visible?: boolean; children?: Array<{ label: string; href: string; sub?: string }> }>;
    showStudentLogin?: boolean;
    showApplyButton?: boolean;
    applyButtonText?: string;
  }>().default({}),

  topBar: jsonb("top_bar").$type<{
    phone?: string;
    email?: string;
    badge?: string;
    deadline?: string;
  }>().default({}),

  footer: jsonb("footer").$type<{
    template?: string;
    aboutText?: string;
    columns?: Array<{ heading: string; links: Array<{ label: string; href: string }> }>;
    bottomText?: string;
    showSocial?: boolean;
    showApplyButton?: boolean;
  }>().default({}),

  testimonialsLayout: text("testimonials_layout").default("featured"),
  razorpayMode: text("razorpay_mode").default("test"),

  scheduledData: jsonb("scheduled_data").$type<Record<string, unknown>>(),
  scheduledAt: timestamp("scheduled_at"),

  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const siteConfigSelectSchema = createSelectSchema(siteConfigTable);
export const siteConfigInsertSchema = createInsertSchema(siteConfigTable).omit({
  id: true,
  updatedAt: true,
});
export const siteConfigUpdateSchema = siteConfigInsertSchema.partial();

export type SiteConfig = typeof siteConfigTable.$inferSelect;
export type SiteConfigInsert = z.infer<typeof siteConfigInsertSchema>;
export type SiteConfigUpdate = z.infer<typeof siteConfigUpdateSchema>;
