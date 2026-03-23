import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
          // Simple in-process lock that avoids Navigator LockManager contention
          return await fn()
        },
      },
    }
  )
  return client
}
