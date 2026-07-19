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
          if (tableName.startsWith('information_schema.')) return target.from(tableName);
          const schema = REFERRAL_TABLES.includes(tableName) ? 'referrals' : 'finance';
          
          const query = target.schema(schema).from(tableName);
          
          if (schema === 'finance' && (query as any).then) {
            const originalThen = (query as any).then.bind(query);
            (query as any).then = ((onfulfilled: any, onrejected: any) => {
              return originalThen((res: any) => {
                if (
                  res.error &&
                  (res.error.message?.includes('schema') ||
                    res.error.message?.includes('schema cache') ||
                    res.error.message?.includes('Could not find the table') ||
                    res.error.code === '42P01' ||
                    res.error.code === 'PGRST205' ||
                    res.error.code === 'PGRST204' ||
                    // Empty PostgREST payloads still mean "not available on this schema"
                    (!res.error.code && !res.error.message && tableName === 'admin_users'))
                ) {
                  if (tableName === 'admin_users') {
                    return (target.schema('admin').from(tableName) as any).then((adminRes: any) => {
                      if (adminRes?.error) {
                        return (target.from(tableName) as any).then(onfulfilled, onrejected)
                      }
                      return onfulfilled ? onfulfilled(adminRes) : adminRes
                    }, onrejected)
                  }
                  return (target.from(tableName) as any).then(onfulfilled, onrejected)
                }
                return onfulfilled ? onfulfilled(res) : res;
              }, onrejected);
            }) as any;
          }
          
          return query;
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
          if (tableName.startsWith('information_schema.')) return target.from(tableName);
          const schema = REFERRAL_TABLES.includes(tableName) ? 'referrals' : 'finance';
          
          const query = target.schema(schema).from(tableName);
          
          if (schema === 'finance' && (query as any).then) {
            const originalThen = (query as any).then.bind(query);
            (query as any).then = ((onfulfilled: any, onrejected: any) => {
              return originalThen((res: any) => {
                if (
                  res.error &&
                  (res.error.message?.includes('schema') ||
                    res.error.message?.includes('schema cache') ||
                    res.error.message?.includes('Could not find the table') ||
                    res.error.code === '42P01' ||
                    res.error.code === 'PGRST205' ||
                    res.error.code === 'PGRST204' ||
                    // Empty PostgREST payloads still mean "not available on this schema"
                    (!res.error.code && !res.error.message && tableName === 'admin_users'))
                ) {
                  if (tableName === 'admin_users') {
                    return (target.schema('admin').from(tableName) as any).then((adminRes: any) => {
                      if (adminRes?.error) {
                        return (target.from(tableName) as any).then(onfulfilled, onrejected)
                      }
                      return onfulfilled ? onfulfilled(adminRes) : adminRes
                    }, onrejected)
                  }
                  return (target.from(tableName) as any).then(onfulfilled, onrejected)
                }
                return onfulfilled ? onfulfilled(res) : res;
              }, onrejected);
            }) as any;
          }
          
          return query;
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
