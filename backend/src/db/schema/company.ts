import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Client companies that the agency recruits for.
 */
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 1000 }),
  timeZone: varchar("time_zone", { length: 64 }).notNull().default("UTC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const company = pgTable("company", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 1000 }),
  // IANA name, such as "Asia/Colombo". Dates and times in emails are written in this zone.
  timeZone: varchar("time_zone", { length: 64 }).notNull().default("UTC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .references(() => company.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.companyId, t.name),
    unique().on(t.clientId, t.name),
  ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Company = typeof company.$inferSelect;
export type NewCompany = typeof company.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
