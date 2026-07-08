import nodemailer from "nodemailer";

// Function for email verification (uses OTP)
export const sendEmail = async (email: string, otp: string) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return false;
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.verify();

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #333;">Hello,</p>
                    <p style="font-size: 16px; color: #333;">Thank you for registering with <strong>CrixLink</strong>!</p>
                    <p style="font-size: 16px; color: #333;">Please use the following OTP to verify your email address:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #667eea;">
                            ${otp}
                        </div>
                    </div>
                    <p style="font-size: 14px; color: #666;">⏰ This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #666;">🔒 If you didn't request this, please ignore this email.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message, please do not reply.</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Verify Your Email - CrixLink',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;

    } catch (error) {
        return false;
    }
};