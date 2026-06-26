function configured(value) {
  return typeof value === 'string' && value.length > 0;
}

export function createNotificationAdapter({
  fetchImpl = fetch,
  twilioAccountSid = process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken = process.env.TWILIO_AUTH_TOKEN,
  twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID,
  resendApiKey = process.env.RESEND_API_KEY,
  resendFromAddress = process.env.RESEND_FROM_ADDRESS
} = {}) {
  return {
    async send({ channel, destination, subject, text }) {
      if (channel === 'sms') {
        if (![twilioAccountSid, twilioAuthToken, twilioMessagingServiceSid].every(configured)) {
          throw new Error('Twilio SMS delivery is not configured');
        }

        const body = new URLSearchParams({
          To: destination,
          MessagingServiceSid: twilioMessagingServiceSid,
          Body: text
        });
        const response = await fetchImpl(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
          }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message ?? `Twilio failed with ${response.status}`);
        return { providerId: payload.sid ?? null };
      }

      if (channel === 'email') {
        if (![resendApiKey, resendFromAddress].every(configured)) {
          throw new Error('Resend email delivery is not configured');
        }

        const response = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ from: resendFromAddress, to: [destination], subject, text })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message ?? `Resend failed with ${response.status}`);
        return { providerId: payload.id ?? null };
      }

      throw new Error(`Unsupported notification channel '${channel}'`);
    }
  };
}
