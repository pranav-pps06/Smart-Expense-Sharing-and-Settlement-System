const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  // Fallback transport to console
  return {
    sendMail: async (opts) => {
      console.log('[DEV MAILER] To:', opts.to, 'Subject:', opts.subject, 'Text:', opts.text);
      return { messageId: 'dev-' + Date.now() };
    },
  };
}

async function sendOtpEmail(to, code) {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const subject = 'Your verification code';
  const text = `Your OTP is ${code}. It will expire in ${process.env.OTP_TTL_MINUTES || 10} minutes.`;
  return transporter.sendMail({ from, to, subject, text });
}

module.exports = { sendOtpEmail };
