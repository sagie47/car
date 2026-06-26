import crypto from 'node:crypto';

function headerValue(headers, name) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSupabaseAuth({
  supabaseUrl = process.env.SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  internalRenderToken = process.env.LOT_PILOT_SERVER_API_TOKEN,
  requireAuth = process.env.LOT_PILOT_REQUIRE_AUTH === 'true',
  resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET,
  fetchImpl = fetch
} = {}) {
  const enabled = Boolean(requireAuth && supabaseUrl && anonKey);

  async function authenticate(authorization) {
    if (!enabled) return { id: 'local-development', email: 'local@lotpilot.test', bypass: true };
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new Error('Authentication is required');
    if (internalRenderToken && token === internalRenderToken) {
      return { id: 'server-render', email: 'server@lotpilot.internal', bypass: true };
    }

    const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    const user = await response.json().catch(() => ({}));
    if (!response.ok || !user.id || !user.email) throw new Error('Invalid Supabase session');
    return {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      phone: user.phone ?? null,
      bypass: false
    };
  }

  async function invite(email, redirectTo) {
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to invite users');
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, redirect_to: redirectTo })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.msg ?? payload.message ?? 'Supabase invitation failed');
    return payload;
  }

  function verifyResendWebhook(rawBody, headers) {
    if (!resendWebhookSecret) throw new Error('RESEND_WEBHOOK_SECRET is required for inbound email webhooks');
    const messageId = headerValue(headers, 'svix-id');
    const timestamp = headerValue(headers, 'svix-timestamp');
    const signatureHeader = headerValue(headers, 'svix-signature');
    if (!messageId || !timestamp || !signatureHeader) throw new Error('Missing webhook signature headers');

    const encodedSecret = resendWebhookSecret.replace(/^whsec_/, '');
    const secret = Buffer.from(encodedSecret, 'base64');
    const signedContent = `${messageId}.${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(signedContent).digest('base64');
    const signatures = signatureHeader.split(' ').map((entry) => entry.split(',')[1]).filter(Boolean);
    if (!signatures.some((signature) => timingSafeEqual(signature, expected))) {
      throw new Error('Invalid Resend webhook signature');
    }
  }

  return { enabled, authenticate, invite, verifyResendWebhook };
}
