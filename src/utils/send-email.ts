import nodemailer from 'nodemailer';

export async function sendEmail(email: string, subject: string, text: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'your_email@example.com',
        pass: 'your_email_password'
      }
    });

    const mailOptions = {
      from: 'your_email@example.com',
      to: email,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error('Failed to send secret key via email');
  }
}
