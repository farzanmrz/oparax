// Imports
import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/types/database"

// Re-export the full database type
export type { Database } from "@/lib/types/database"

// Friendly aliases for x_connections table from the generated database schema
export type XConnection = Tables<"x_connections">
export type XConnectionInsert = TablesInsert<"x_connections">
export type XConnectionUpdate = TablesUpdate<"x_connections">

// Friendly aliases for agents table (the saved agent configuration)
export type Agent = Tables<"agents">
export type AgentInsert = TablesInsert<"agents">
export type AgentUpdate = TablesUpdate<"agents">

// Friendly aliases for runs table (one "Run agent" = scan + draft together)
export type Run = Tables<"runs">
export type RunInsert = TablesInsert<"runs">
export type RunUpdate = TablesUpdate<"runs">

// Friendly aliases for run_items table (one story + draft + post-state per row)
export type RunItem = Tables<"run_items">
export type RunItemInsert = TablesInsert<"run_items">
export type RunItemUpdate = TablesUpdate<"run_items">

// Status unions come straight from the Postgres enums (generated)
export type AgentStatus = Enums<"agent_status">
export type RunSource = Enums<"run_source">
export type RunStatus = Enums<"run_status">
export type ItemStatus = Enums<"item_status">
