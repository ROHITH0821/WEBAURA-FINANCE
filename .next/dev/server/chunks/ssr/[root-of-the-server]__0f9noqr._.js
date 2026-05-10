module.exports = [
"[project]/src/lib/supabaseServer.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient,
    "createStaticClient",
    ()=>createStaticClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const url = ("TURBOPACK compile-time value", "https://rwxvypzvyogrbmmfvqxm.supabase.co");
    const anon = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eHZ5cHp2eW9ncmJtbWZ2cXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTMxODcsImV4cCI6MjA5MzEyOTE4N30.41c0L0d9_mtEYS7H0JNfjjMjQxWwdloS_dfGX3ISb4I");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(url, anon, {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // Server Components can't set cookies; ignore.
                }
            }
        }
    });
}
function createStaticClient() {
    const url = ("TURBOPACK compile-time value", "https://rwxvypzvyogrbmmfvqxm.supabase.co");
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    // Service role, no cookie persistence.
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(url, service, {
        cookies: {
            getAll: ()=>[],
            setAll: ()=>{}
        }
    });
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/auth-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4013d407e385d04b47bc3560294fce8eeddf200527":{"name":"sendResendOTP"},"609bee4bef3d52d6a57b4c079f8f5957227e5d0cd3":{"name":"verifyResendOTP"}},"src/lib/auth-actions.ts",""] */ __turbopack_context__.s([
    "sendResendOTP",
    ()=>sendResendOTP,
    "verifyResendOTP",
    ()=>verifyResendOTP
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseServer.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
async function sendResendOTP(email) {
    if (!("TURBOPACK compile-time value", "https://rwxvypzvyogrbmmfvqxm.supabase.co") || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
            error: 'Server is not configured (missing Supabase URL or Service Role Key).'
        };
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createStaticClient"])();
    const normalizedEmail = email.trim().toLowerCase();
    // 1) Primary authorization is via DB (Team Settings)
    const { data: adminUser, error: adminLookupErr } = await supabase.from('admin_users').select('full_name,email,is_active').eq('email', normalizedEmail).maybeSingle();
    if (adminLookupErr && adminLookupErr?.code === '42P01') {
        return {
            error: 'Missing DB table `admin_users`. Run migration `018_finance_portal_admin_users.sql` in Supabase.'
        };
    }
    if (adminUser && adminUser.is_active === false) {
        return {
            error: 'Access not authorized for this email.'
        };
    }
    // Ensure Rohith is always super_admin (even if an old row exists as founder)
    if (adminUser && normalizedEmail === 'rapakarohith8@gmail.com') {
        await supabase.from('admin_users').update({
            role: 'super_admin',
            is_active: true
        }).eq('email', normalizedEmail);
    }
    // 2) Bootstrap allow-list (only when email is not yet in admin_users)
    const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map((e)=>e.trim().toLowerCase()).filter(Boolean);
    const isBootstrapAuthorized = authorizedEmails.includes(normalizedEmail);
    // If user exists in admin_users and is active → allow.
    // If not in admin_users → allow only if in bootstrap allow-list (then auto-provision below).
    if (!adminUser && !isBootstrapAuthorized) {
        return {
            error: 'Access not authorized for this email.'
        };
    }
    // Auto-provision admin_users on first login request (no manual DB seeding needed)
    if (!adminUser) {
        const isRohith = normalizedEmail === 'rapakarohith8@gmail.com';
        const { error: provisionError } = await supabase.from('admin_users').insert({
            email: normalizedEmail,
            full_name: normalizedEmail.split('@')[0],
            role: isRohith ? 'super_admin' : 'founder',
            is_active: true
        });
        if (provisionError) {
            console.error('Admin user auto-provision error:', provisionError);
            if (provisionError?.code === '42P01') {
                return {
                    error: 'Missing DB table `admin_users`. Run migration `018_finance_portal_admin_users.sql` in Supabase.'
                };
            }
            return {
                error: `Could not provision admin access: ${provisionError?.message || 'Unknown error'}`
            };
        }
    }
    // 2. Generate 6-digit OTP
    const otp = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomInt(100000, 999999).toString();
    const otpHash = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins
    ;
    // 3. Store OTP in DB
    const { error: updateError } = await supabase.from('finance_otp_requests').upsert({
        email: normalizedEmail,
        otp_secret: otpHash,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        updated_at: new Date().toISOString()
    });
    if (updateError) {
        console.error('Failed to store OTP:', updateError);
        // Most common: migration not run yet
        if (updateError?.code === '42P01') {
            return {
                error: 'Missing DB table `finance_otp_requests`. Run migration `016_finance_portal_otp.sql` in Supabase.'
            };
        }
        return {
            error: 'Failed to generate secure access code. Please try again.'
        };
    }
    // 4. Send Email via Resend
    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY is missing in environment variables');
            return {
                error: 'Email service configuration error. Please contact admin.'
            };
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'WebAura Finance <info@webauraindia.com>',
                to: normalizedEmail,
                subject: `${otp} is your Finance Access Code`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 40px; color: #1a2314;">
            <img
              src="https://webaura-finance.vercel.app/webaura-mark-light.png"
              width="44"
              height="44"
              alt="WebAura"
              style="display:block;margin:0 0 24px 0;object-fit:contain;"
            />
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.02em;">Finance Portal Access</h1>
            <p style="font-size: 14px; line-height: 1.5; color: #666; margin-bottom: 32px;">
              Hello ${(adminUser?.full_name || normalizedEmail.split('@')[0]).split(' ')[0]}, use the secure code below to access the WebAura Internal Finance Module.
            </p>
            <div style="background: #f7f7dc; padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 32px; border: 1px solid #efefd0;">
              <span style="font-family: ui-monospace, monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #000;">${otp}</span>
            </div>
            <p style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">
              Expires in 10 minutes • Internal Use Only
            </p>
          </div>
        `
            })
        });
        const data = await res.json();
        if (!res.ok) {
            console.error('Resend API Error:', data);
            throw new Error(data.message || 'Failed to send email');
        }
        return {
            ok: true
        };
    } catch (err) {
        console.error('Resend OTP Error:', err);
        return {
            error: 'Failed to send verification code. Please try again.'
        };
    }
}
async function verifyResendOTP(email, otp) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createStaticClient"])();
    const normalizedEmail = email.trim().toLowerCase();
    const { data: req, error: reqError } = await supabase.from('finance_otp_requests').select('*').eq('email', normalizedEmail).single();
    if (reqError || !req) return {
        error: 'Verification failed'
    };
    // 1. Checks
    if (!req.otp_secret || !req.otp_expires_at) return {
        error: 'No access code requested'
    };
    if (new Date(req.otp_expires_at) < new Date()) return {
        error: 'Access code has expired'
    };
    if (req.otp_attempts >= 5) return {
        error: 'Too many attempts. Please request a new code.'
    };
    // 2. Verify Hash
    const isValid = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].compare(otp, req.otp_secret);
    if (!isValid) {
        const newAttempts = (req.otp_attempts || 0) + 1;
        await supabase.from('finance_otp_requests').update({
            otp_attempts: newAttempts,
            updated_at: new Date().toISOString()
        }).eq('email', normalizedEmail);
        return {
            error: `Incorrect code. ${5 - newAttempts} attempts remaining.`
        };
    }
    // 3. Success - Generate Supabase Magic Link via Admin API
    // This allows us to use Resend for delivery but Supabase for the session
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: {
            redirectTo: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : `${("TURBOPACK compile-time value", "http://localhost:3000") || 'http://localhost:3000'}/auth/callback`
        }
    });
    if (authError) {
        console.error('Auth Link Error:', authError);
        return {
            error: 'Failed to initialize secure session.'
        };
    }
    // 4. Cleanup OTP
    await supabase.from('finance_otp_requests').update({
        otp_secret: null,
        otp_expires_at: null,
        otp_attempts: 0,
        updated_at: new Date().toISOString()
    }).eq('email', normalizedEmail);
    // Store the founder email for UI convenience (Supabase session remains the source of truth).
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    const cookieDomain = ("TURBOPACK compile-time value", "development") === 'production' && process.env.COOKIE_DOMAIN?.trim() ? "TURBOPACK unreachable" : undefined;
    cookieStore.set('founder_email', normalizedEmail, {
        path: '/',
        httpOnly: false,
        secure: ("TURBOPACK compile-time value", "development") === 'production',
        sameSite: 'lax',
        ...("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : {},
        maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    // Return the magic link URL for the client to redirect to
    return {
        ok: true,
        redirectUrl: authData.properties.action_link
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    sendResendOTP,
    verifyResendOTP
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(sendResendOTP, "4013d407e385d04b47bc3560294fce8eeddf200527", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(verifyResendOTP, "609bee4bef3d52d6a57b4c079f8f5957227e5d0cd3", null);
}),
"[project]/.next-internal/server/app/(auth)/login/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/lib/auth-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth-actions.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/.next-internal/server/app/(auth)/login/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/lib/auth-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "4013d407e385d04b47bc3560294fce8eeddf200527",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendResendOTP"],
    "609bee4bef3d52d6a57b4c079f8f5957227e5d0cd3",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyResendOTP"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$auth$292f$login$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$lib$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(auth)/login/page/actions.js { ACTIONS_MODULE0 => "[project]/src/lib/auth-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth-actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0f9noqr._.js.map