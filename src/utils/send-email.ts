import nodemailer from 'nodemailer';
import ENVIRONMENT from '../config/environment';

export async function sendEmail(email: string, subject: string, text: string) {
  try {
    const transporter = nodemailer.createTransport({
      name: 'langit-wallet',
      host: ENVIRONMENT.SMTP_HOST ?? 'localhost',
      port: ENVIRONMENT.SMTP_PORT ?? 25,
      secure: false,
      auth:
        ENVIRONMENT.SMTP_USER && ENVIRONMENT.SMTP_PASSWORD
          ? {
              user: ENVIRONMENT.SMTP_USER,
              pass: ENVIRONMENT.SMTP_PASSWORD,
            }
          : {},
      service: 'gmail',
    });

    const mailOptions = {
      from: ENVIRONMENT.SMTP_USER,
      to: email,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error('Failed to send secret key via email => ' + error);
  }
}

export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
