import type { SupabaseClient } from "@supabase/supabase-js";

const WRITES = new Set(["insert", "update", "upsert", "delete", "rpc", "upload", "remove"]);

interface State {
  writes: boolean;
  single: boolean;
}

/**
 * Stands in for Supabase when it isn't configured, so the app opens as an empty template
 * instead of crashing. Any chain of calls ends in one of three results:
 *  - a read: no rows, no error;
 *  - .single(): no row (the caller reports "not found");
 *  - a write (insert / update / upsert / delete / rpc / upload): an error carrying `message`.
 */
export function createEmptyClient(message: string): SupabaseClient {
  const chain = (state: State): unknown =>
    new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: unknown) => void) => {
            if (state.writes) return resolve({ data: null, error: { message }, count: null });
            if (state.single) return resolve({ data: null, error: { message: "No rows found" }, count: null });
            return resolve({ data: [], error: null, count: 0 });
          };
        }
        if (typeof prop === "symbol") return undefined;
        return chain({
          writes: state.writes || WRITES.has(prop),
          single: state.single || prop === "single" || prop === "maybeSingle",
        });
      },
      apply() {
        return chain(state);
      },
    });
  return chain({ writes: false, single: false }) as SupabaseClient;
}
