import { createBrowserClient } from '@supabase/ssr'

const REFERRAL_TABLES = [
  'referrers', 'referral_leads', 'referral_visits', 'referrer_sessions', 
  'onboarding_otps', 'recruitment_rewards', 'leads',
  'referral_login_tokens', 'referral_reward_logs', 'referrer_deletion_log', 'referral_lead_deletion_log',
  'contact_submissions'
]

const REFERRAL_RPCS = [
  'apply_recruiter_signup_bonus', 'apply_passive_commission', 
  'apply_recruitment_unlock_bonus', 'apply_welcome_bonus', 'increment_referrer_login'
]

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      
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
