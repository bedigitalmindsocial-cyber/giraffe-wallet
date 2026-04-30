// Supabase implementation of DataStore. Activated when both
// NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in env.
//
// This file is intentionally minimal in v1: it falls back to mock data when
// queries return empty results so the UI is never blank for an unconfigured
// project. The schema in supabase/migrations/0001_init.sql is the source of
// truth; once that migration runs, replace the bodies below with real queries.
//
// We deliberately keep the contract narrow so that filling in the real impl
// later is a pure swap without touching anything in src/app.

import type { DataStore } from "./store";
import { mockStore } from "./mock";

// For v1 we delegate to the mock implementation. Each method below should be
// replaced one-by-one with a real Supabase call against the schema in 0001.
//
// The contract (DataStore) is identical, so this is safe: anything that works
// against the mock works against this until methods are filled in.

export const supabaseStore: DataStore = {
  ...mockStore,
};
