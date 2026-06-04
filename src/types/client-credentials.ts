export type CredentialAccessAction = 'viewed' | 'copied' | 'edited'

export type ClientCredentialsRow = {
  id: string
  created_at: string
  updated_at: string
  project_id: string
  added_by: string
  updated_by: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  client_whatsapp: string | null
  client_alternate_phone: string | null
  client_business_name: string | null
  client_gst_number: string | null
  client_address: string | null
  client_city: string | null
  client_poc_name: string | null
  domain_name: string | null
  domain_registrar: string | null
  domain_registrar_email: string | null
  domain_registrar_password: string | null
  domain_expiry_date: string | null
  domain_auto_renew: boolean
  dns_provider: string | null
  dns_login_email: string | null
  dns_login_password: string | null
  hosting_provider: string | null
  hosting_plan: string | null
  hosting_login_email: string | null
  hosting_login_password: string | null
  hosting_expiry_date: string | null
  hosting_renewal_cost: number | null
  server_ip: string | null
  cpanel_url: string | null
  cpanel_username: string | null
  cpanel_password: string | null
  ftp_host: string | null
  ftp_username: string | null
  ftp_password: string | null
  ssh_key: string | null
  business_email: string | null
  business_email_password: string | null
  email_provider: string | null
  google_workspace_admin: string | null
  google_workspace_password: string | null
  website_url: string
  staging_url: string | null
  cms_type: string | null
  cms_admin_url: string | null
  cms_username: string | null
  cms_password: string | null
  github_repo_url: string | null
  github_username: string | null
  vercel_project_url: string | null
  env_variables: string | null
  analytics_account: string | null
  search_console_email: string | null
  razorpay_account: string | null
  whatsapp_business_number: string | null
  google_maps_api_key: string | null
  other_integrations: string | null
  internal_notes: string | null
  project_status_notes: string | null
  last_accessed_by: string | null
  last_accessed_at: string | null
}

/** Fields that must never appear in page-load metadata responses. */
export const SENSITIVE_CREDENTIAL_FIELDS = [
  'domain_registrar_password',
  'dns_login_password',
  'hosting_login_password',
  'cpanel_password',
  'ftp_password',
  'ssh_key',
  'business_email_password',
  'google_workspace_password',
  'cms_password',
  'env_variables',
] as const

export type ClientCredentialsMetadata = Pick<
  ClientCredentialsRow,
  | 'id'
  | 'project_id'
  | 'client_name'
  | 'website_url'
  | 'domain_name'
  | 'domain_expiry_date'
  | 'hosting_provider'
  | 'hosting_expiry_date'
  | 'cms_type'
  | 'updated_at'
>

export const PASSWORD_FIELD_LABELS: Record<string, string> = {
  domain_registrar_password: 'Domain registrar password',
  dns_login_password: 'DNS login password',
  hosting_login_password: 'Hosting login password',
  cpanel_password: 'cPanel password',
  ftp_password: 'FTP password',
  business_email_password: 'Business email password',
  google_workspace_password: 'Google Workspace password',
  cms_password: 'CMS password',
}

export function daysUntilExpiry(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function expiryBadgeTone(days: number | null): 'green' | 'amber' | 'red' | 'slate' {
  if (days == null) return 'slate'
  if (days > 60) return 'green'
  if (days >= 30) return 'amber'
  return 'red'
}
