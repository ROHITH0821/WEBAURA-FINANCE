import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const REFERRAL_TABLES = [
  'referrers', 'referral_leads', 'referral_visits', 'referrer_sessions', 
  'onboarding_otps', 'recruitment_rewards', 'contact_submissions', 'leads'
]

const REFERRAL_RPCS = [
  'apply_recruiter_signup_bonus', 'apply_passive_commission', 
  'apply_recruitment_unlock_bonus', 'apply_welcome_bonus', 'increment_referrer_login'
]

export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )

  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (prop === 'from' && typeof value === 'function') {
        return (tableName: string) => {
          const schema = REFERRAL_TABLES.includes(tableName) ? 'referrals' : 'finance';
          return target.schema(schema).from(tableName);
        };
      }
      if (prop === 'rpc' && typeof value === 'function') {
        return (rpcName: string, ...args: any[]) => {
          const schema = REFERRAL_RPCS.includes(rpcName) ? 'referrals' : 'finance';
          return target.schema(schema).rpc(rpcName, ...args);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

// Service role client for bypass RLS and admin tasks
export function createStaticClient() {
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (prop === 'from' && typeof value === 'function') {
        return (tableName: string) => {
          const schema = REFERRAL_TABLES.includes(tableName) ? 'referrals' : 'finance';
          return target.schema(schema).from(tableName);
        };
      }
      if (prop === 'rpc' && typeof value === 'function') {
        return (rpcName: string, ...args: any[]) => {
          const schema = REFERRAL_RPCS.includes(rpcName) ? 'referrals' : 'finance';
          return target.schema(schema).rpc(rpcName, ...args);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}
