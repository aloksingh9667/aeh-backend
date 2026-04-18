import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  eventDate: text("event_date").notNull(),
  eventDateEnd: text("event_date_end"),
  location: text("location"),
  imageUrl: text("image_url"),
  isFeatured: boolean("is_featured").default(false),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
