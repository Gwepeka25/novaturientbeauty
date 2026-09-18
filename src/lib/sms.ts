// Minimal Twilio REST integration — a plain fetch() call rather than the
// Twilio SDK, since this is the one endpoint (send an SMS) the app needs.
// Mirrors src/lib/email.ts's pattern: silently logs instead of sending when
// no provider is configured, so this is safe to ship and wire up before
// Michelle ever creates a Twilio account.

export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[sms:not-configured] would send "${body}" to ${to}`);
    return;
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Failed to send SMS to ${to}: ${res.status} ${text}`);
  }
}
