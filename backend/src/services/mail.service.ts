import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey = process.env.MAILJET_API_KEY;
  private readonly apiSecret = process.env.MAILJET_API_SECRET;
  private readonly senderEmail = process.env.MAILJET_SENDER_EMAIL || 'no-reply@blockscodex.com';
  private readonly senderName = process.env.MAILJET_SENDER_NAME || 'blockscodeX';
  private readonly appUrl = process.env.FRONTEND_URL || 'https://blockscodex.com';
  private readonly appName = process.env.APP_NAME || 'blockscodeX';

  async sendWelcomeEmail(user: { email: string; name: string; password: string }, organization: { name: string; primaryColor?: string; logo?: string; domain?: string }) {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Mailjet credentials not found. Skipping email sending.');
      return;
    }

    const primaryColor = organization.primaryColor || '#fc751b';
    const orgName = organization.name;
    const orgLogo = organization.logo;
    const orgDomain = organization.domain;

    const baseDashboardUrl = orgDomain && orgDomain.includes('.') && !orgDomain.includes('localhost')
      ? `https://${orgDomain}`
      : this.appUrl;

    const logoHtml = orgLogo
      ? `<div style="text-align: center; margin-bottom: 15px;"><img src="${orgLogo}" alt="${orgName} Logo" style="max-height: 50px;" /></div>`
      : '';

    const htmlPart = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eef2f6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background-color: ${primaryColor}; padding: 30px 20px; text-align: center; color: white;">
          ${logoHtml}
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">Welcome to ${orgName}</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #334155; margin-top: 0;">Hello <strong style="color: #0f172a;">${user.name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Your account has been successfully created at <strong style="color: #0f172a;">${orgName}</strong>. We're excited to have you on board!</p>
          
          <div style="margin: 35px 0;">
            <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 10px;">Your Login Credentials</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #475569;"><strong style="color: #334155; display: inline-block; width: 80px;">Email:</strong> ${user.email}</p>
              <p style="margin: 0; font-size: 15px; color: #475569;"><strong style="color: #334155; display: inline-block; width: 80px;">Password:</strong> <span style="font-family: 'Courier New', Courier, monospace; font-size: 1.1em; font-weight: 600; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a;">${user.password}</span></p>
            </div>
          </div>
          
          <p style="font-size: 15px; color: #ef4444; font-weight: 500;">For your security, please log in and change your temporary password immediately.</p>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="${baseDashboardUrl}/login" style="background-color: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">Login to Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #eef2f6; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8; display: flex; align-items: center; justify-content: center; gap: 5px;">
            Powered by <strong style="color: #0f172a;">${this.appName}</strong>
          </p>
        </div>
      </div>
    `;

    try {
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From: {
                Email: this.senderEmail,
                Name: orgName || this.senderName,
              },
              To: [
                {
                  Email: user.email,
                  Name: user.name,
                },
              ],
              Subject: `Welcome to ${orgName} - Your Login Credentials`,
              HTMLPart: htmlPart,
              TextPart: `Welcome to ${orgName}. Your login credentials are: Email: ${user.email}, Password: ${user.password}. Please login to ${this.appUrl}/login and change your password.`,
            },
          ],
        },
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Welcome email sent to ${user.email}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${user.email}: ${error.message}`, error.response?.data);
      // Don't throw error to prevent blocking user creation, just log it
    }
  }

  async sendPasswordResetEmail(user: { email: string; name: string }, newPassword: string, organization: { name: string; primaryColor?: string; logo?: string; domain?: string }) {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Mailjet credentials not found. Skipping email sending.');
      return;
    }

    const primaryColor = organization.primaryColor || '#fc751b';
    const orgName = organization.name;
    const orgLogo = organization.logo;
    const orgDomain = organization.domain;

    const baseDashboardUrl = orgDomain && orgDomain.includes('.') && !orgDomain.includes('localhost')
      ? `https://${orgDomain}`
      : this.appUrl;

    const logoHtml = orgLogo
      ? `<div style="text-align: center; margin-bottom: 15px;"><img src="${orgLogo}" alt="${orgName} Logo" style="max-height: 50px;" /></div>`
      : '';

    const htmlPart = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eef2f6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background-color: ${primaryColor}; padding: 30px 20px; text-align: center; color: white;">
          ${logoHtml}
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">Password Reset</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #334155; margin-top: 0;">Hello <strong style="color: #0f172a;">${user.name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">We received a request to reset your password for <strong style="color: #0f172a;">${orgName}</strong>.</p>
          <p style="font-size: 15px; color: #475569; margin-top: 25px;">Your new temporary password is:</p>
          
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin: 15px 0 25px 0; text-align: center;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 1.8em; font-weight: 700; letter-spacing: 3px; color: #0f172a; background-color: #f1f5f9; padding: 4px 12px; border-radius: 6px;">${newPassword}</span>
          </div>
          
          <p style="font-size: 15px; color: #ef4444; font-weight: 600; text-align: center;">Please log in and change your password immediately.</p>
          
          <div style="text-align: center; margin-top: 35px;">
            <a href="${baseDashboardUrl}/login" style="background-color: ${primaryColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">Login to Dashboard</a>
          </div>
          
          <p style="margin-top: 40px; font-size: 13px; color: #64748b; text-align: center;">If you did not request this password reset, please contact support immediately.</p>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #eef2f6; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8; display: flex; align-items: center; justify-content: center; gap: 5px;">
            Powered by <strong style="color: #0f172a;">${this.appName}</strong>
          </p>
        </div>
      </div>
    `;

    try {
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From: {
                Email: this.senderEmail,
                Name: orgName || this.senderName,
              },
              To: [
                {
                  Email: user.email,
                  Name: user.name,
                },
              ],
              Subject: `Password Reset - ${orgName}`,
              HTMLPart: htmlPart,
              TextPart: `Password Reset for ${orgName}. Your new temporary password is: ${newPassword}. Please login to ${this.appUrl}/login and change your password immediately.`,
            },
          ],
        },
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      this.logger.log(`Password reset email sent to ${user.email}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${error.message}`, error.response?.data);
    }
  }

}
