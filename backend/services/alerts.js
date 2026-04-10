const SibApiV3Sdk = require('sib-api-v3-sdk');

function getMissingAlertConfig() {
  const required = ['BREVO_API_KEY', 'FROM_EMAIL', 'ALERT_EMAIL'];
  return required.filter((key) => !process.env[key]);
}

function buildAlertPayload({ subject, message, details = {} }) {
  const detailRows = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:700;border:1px solid #e5e7eb;">${key}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;"><pre style="margin:0;white-space:pre-wrap;font-family:Consolas,monospace;">${String(value)}</pre></td>
      </tr>
    `)
    .join('');

  return {
    subject: `[ALERTE] ${subject}`,
    text: [message, ...Object.entries(details).map(([key, value]) => `${key}: ${value}`)].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto;color:#111827;">
        <h2 style="color:#b91c1c;">Alerte backend C'Reussite</h2>
        <p>${message}</p>
        ${detailRows ? `<table style="width:100%;border-collapse:collapse;">${detailRows}</table>` : ''}
      </div>
    `,
  };
}

async function sendOpsAlert({ subject, message, details }) {
  const missing = getMissingAlertConfig();
  if (missing.length) {
    console.warn(`[alerts] Alerte non envoyee, configuration manquante: ${missing.join(', ')}`);
    return { skipped: true, reason: 'missing_config', missing };
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

  const payload = buildAlertPayload({ subject, message, details });
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const email = new SibApiV3Sdk.SendSmtpEmail();

  email.sender = {
    name: process.env.ALERT_FROM_NAME || process.env.FROM_NAME || "C'Reussite",
    email: process.env.FROM_EMAIL,
  };
  email.to = [{ email: process.env.ALERT_EMAIL }];
  email.replyTo = { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME || "C'Reussite" };
  email.subject = payload.subject;
  email.htmlContent = payload.html;
  email.textContent = payload.text;

  const result = await apiInstance.sendTransacEmail(email);
  console.log(`[alerts] Alerte envoyee a ${process.env.ALERT_EMAIL} - messageId: ${result.messageId}`);
  return result;
}

module.exports = {
  buildAlertPayload,
  getMissingAlertConfig,
  sendOpsAlert,
};
