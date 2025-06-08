import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  duration: integer("duration").notNull(), // in milliseconds
  overallRisk: text("overall_risk").notNull(),
  securityScore: integer("security_score").notNull(),
  ssl: jsonb("ssl").notNull(),
  headers: jsonb("headers").notNull(),
  ports: jsonb("ports").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  completed: boolean("completed").default(false).notNull(),
});

export const sslSchema = z.object({
  valid: z.boolean(),
  daysRemaining: z.number().optional(),
  issuer: z.string().optional(),
  expires: z.string().optional(),
  error: z.string().optional(),
});

export const headersSchema = z.object({
  missing: z.array(z.string()),
  present: z.array(z.string()),
  score: z.number(),
});

export const portsSchema = z.object({
  open: z.array(z.number()),
  closed: z.array(z.number()),
  total: z.number(),
});

export const insertScanSchema = createInsertSchema(scans).pick({
  url: true,
});

export const startScanSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
export type StartScan = z.infer<typeof startScanSchema>;
export type SSLInfo = z.infer<typeof sslSchema>;
export type HeadersInfo = z.infer<typeof headersSchema>;
export type PortsInfo = z.infer<typeof portsSchema>;
