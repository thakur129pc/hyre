import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Lazy-initializes and returns the SMTP transporter instance.
 */
const getTransporter = () => {
  if (!transporter) {
    const { ZEPTOMAIL_USER, ZEPTOMAIL_PASS } = process.env;

    if (!ZEPTOMAIL_USER || !ZEPTOMAIL_PASS) {
      console.warn('⚠️ SMTP mail credentials (ZEPTOMAIL_USER/ZEPTOMAIL_PASS) are missing in environment variables.');
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.zeptomail.in',
      port: 465,
      secure: true,
      auth: {
        user: ZEPTOMAIL_USER,
        pass: ZEPTOMAIL_PASS,
      },
      pool: true, // Enable connection pooling
      maxConnections: 5,
      maxMessages: 100,
    });
  }
  return transporter;
};

/**
 * Send an email using Zoho ZeptoMail SMTP.
 * @param {string|string[]} emails - Recipient email address(es)
 * @param {string} subject - Email subject
 * @param {string} mailContent - Email HTML content
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise.
 */
const sendMail = async (emails, subject, mailContent) => {
  const { MAIL_NAME, MAIL_EMAIL } = process.env;

  if (!MAIL_NAME || !MAIL_EMAIL) {
    console.warn('⚠️ Sender information (MAIL_NAME/MAIL_EMAIL) is missing in environment variables.');
  }

  const mailOptions = {
    from: `"${MAIL_NAME}" <${MAIL_EMAIL}>`,
    to: Array.isArray(emails) ? emails.join(', ') : emails,
    subject: subject,
    html: mailContent,
  };

  try {
    const activeTransporter = getTransporter();
    await activeTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email with Zoho:', error);
    return false;
  }
};

export default sendMail;
