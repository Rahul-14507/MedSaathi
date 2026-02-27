import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums (handled as text in SQLite)
export const ORG_TYPES = ["hospital", "pharmacy", "lab", "platform"] as const;
export const USER_ROLES = [
  "doctor",
  "nurse",
  "pharmacy",
  "diagnostic",
  "admin",
  "super_admin",
] as const;
export const ACTION_TYPES = [
  "prescription",
  "lab_test",
  "radiology",
  "procedure",
  "observation",
  "transfer",
] as const;
export const ACTION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

// Organizations (Hospitals, Pharmacies, Labs)
export const organizations = sqliteTable("organizations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // hospital, pharmacy, lab
  code: text("code").notNull().unique(), // e.g., "CITYHOSP" for login
  address: text("address"),
});

// Users (linked to an Organization)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  employeeId: text("employee_id").notNull(), // e.g., "DOC001"
  name: text("name").notNull(),
  role: text("role").notNull(), // doctor, nurse, pharmacy, diagnostic
  password: text("password").notNull(),
  // Composite unique constraint typically handled in DB, but for now we trust app logic/seed
});

// Patients (Global Registry)
export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uniqueId: text("unique_id").notNull().unique(), // e.g., "PAT-2024-001"
  name: text("name").notNull(),
  dob: integer("dob", { mode: "timestamp" }).notNull(),
  gender: text("gender").notNull(),
  contact: text("contact"),
  bloodGroup: text("blood_group"),
});

// Clinical Visits (Encounters at a specific organization)
export const clinicalVisits = sqliteTable("clinical_visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  vitals: text("vitals", { mode: "json" }), // { weight, bp, temp, hr, spo2 }
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  priority: text("priority").default("normal"), // normal, emergency, critical
  attendedBy: integer("attended_by").references(() => users.id), // Doctor/Nurse who managed visit
});

// Clinical Actions (Orders/Requests)
export const clinicalActions = sqliteTable("clinical_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  visitId: integer("visit_id").references(() => clinicalVisits.id), // Optional, linked to a visit
  authorId: integer("author_id")
    .references(() => users.id)
    .notNull(), // Who ordered it
  fromOrganizationId: integer("from_organization_id")
    .references(() => organizations.id)
    .notNull(), // Origin

  type: text("type").notNull(), // prescription, lab_test
  status: text("status").default("pending").notNull(),
  description: text("description").notNull(),
  payload: text("payload", { mode: "json" }),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  completedAt: integer("completed_at", { mode: "timestamp" }),
  completedBy: integer("completed_by").references(() => users.id),
  completedByOrganizationId: integer("completed_by_organization_id").references(
    () => organizations.id,
  ),
  notes: text("notes"),
});

// Zod Schemas
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients);
export const insertVisitSchema = createInsertSchema(clinicalVisits);
export const insertActionSchema = createInsertSchema(clinicalActions);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type ClinicalVisit = typeof clinicalVisits.$inferSelect;
export type ClinicalAction = typeof clinicalActions.$inferSelect;
