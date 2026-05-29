// Imports
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database"

// Re-export the full database type
export type { Database } from "@/lib/types/database"

// Friendly aliases for x_connections table from the generated database schema
export type XConnection = Tables<"x_connections">
export type XConnectionInsert = TablesInsert<"x_connections">
export type XConnectionUpdate = TablesUpdate<"x_connections">

// Friendly aliases for monitors table from the generated database schema
export type Monitor = Tables<"monitors">
export type MonitorInsert = TablesInsert<"monitors">
export type MonitorUpdate = TablesUpdate<"monitors">

// Friendly aliases for scans table from the generated database schema
export type Scan = Tables<"scans">
export type ScanInsert = TablesInsert<"scans">
export type ScanUpdate = TablesUpdate<"scans">

// Friendly aliases for stories table from the generated database schema
export type Story = Tables<"stories">
export type StoryInsert = TablesInsert<"stories">
export type StoryUpdate = TablesUpdate<"stories">

// Friendly aliases for drafts table from the generated database schema
export type Draft = Tables<"drafts">
export type DraftInsert = TablesInsert<"drafts">
export type DraftUpdate = TablesUpdate<"drafts">

// Friendly aliases for posts table from the generated database schema
export type Post = Tables<"posts">
export type PostInsert = TablesInsert<"posts">
export type PostUpdate = TablesUpdate<"posts">

// Status unions mirror the DB CHECK constraints in the slice-1 migration
export type MonitorStatus = "active" | "paused"
export type ScanStatus = "running" | "completed" | "failed"
export type DraftStatus = "draft" | "edited" | "posted" | "failed"
