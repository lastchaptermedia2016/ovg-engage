/**
 * Booking Confirmation Notification API
 * Sends booking confirmations via WhatsApp, SMS, or Email
 * 
 * Configuration via environment variables:
 * - WHATSAPP_API_KEY: Twilio or WhatsApp Business API key
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_PHONE_NUMBER: Twilio phone number for SMS/WhatsApp
 * - SENDGRID_API_KEY: SendGrid API key for emails
 * - EMAIL_FROM: Sender email address
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

interface NotificationRequest {
  type: 'whatsapp' | 'sms' | 'email' | 'all';
  phone?: string;
  email?: string;
  clientName: string;
  treatment: string;
  date: string;
  time: string;
  price: number;
  refreshment?: string;
  bookingId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, phone, email, clientName, treatment, date, time, price, refreshment, bookingId }: NotificationRequest = req.body;

  // Validate required fields
  if (!clientName || !treatment || !date || !time || !price) {
    return res.status(400).json({ error: 'Missing required booking details' });
  }

  if ((type === 'whatsapp' || type === 'sms') && !phone) {
    return res.status(400).json({ error: 'Phone number required for WhatsApp/SMS' });
  }

  if (type === 'email' && !email) {
    return res.status(400).json({ error: 'Email address required' });
  }

  // Build the confirmation message
  const confirmationMessage = buildConfirmationMessage({
    clientName, treatment, date, time, price, refreshment, bookingId
  });

  const results = {
    whatsapp: false,
    sms: false,
    email: false,
    errors: [] as string[]
  };

  try {
    // Send WhatsApp
    if (type === 'whatsapp' || type === 'all') {
      if (phone) {
        try {
          await sendWhatsApp(phone, confirmationMessage);
          results.whatsapp = true;
        } catch (error: any) {
          results.errors.push(`WhatsApp: ${error.message}`);
        }
      }
    }

    // Send SMS
    if (type === 'sms' || type === 'all') {
      if (phone) {
        try {
          await sendSMS(phone, confirmationMessage);
          results.sms = true;
        } catch (error: any) {
          results.errors.push(`SMS: ${error.message}`);
        }
      }
    }

    // Send Email
    if (type === 'email' || type === 'all') {
      if (email) {
        try {
          await sendEmail(email, clientName, confirmationMessage);
          results.email = true;
        } catch (error: any) {
          results.errors.push(`Email: ${error.message}`);
        }
      }
    }

    // If no API keys configured, log the message (fallback)
    if (!process.env.TWILIO_ACCOUNT_SID && !process.env.WHATSAPP_API_KEY && !process.env.SENDGRID_API_KEY) {
      console.log('📩 Notification (no API keys configured - message logged):');
      console.log(`To: ${phone || email || 'N/A'}`);
      console.log(confirmationMessage);
      
      return res.status(200).json({
        success: true,
        message: 'Notification logged (configure API keys to send)',
        results,
        preview: confirmationMessage
      });
    }

    return res.status(200).json({
      success: true,
      results,
      errors: results.errors
    });

  } catch (error: any) {
    console.error('Notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      errors: [error.message]
    });
  }
}

function buildConfirmationMessage(data: Omit<NotificationRequest, 'type' | 'phone' | 'email'>): string {
  const { clientName, treatment, date, time, price, refreshment, bookingId } = data;
  
  let message = `🌟 *Booking Confirmed - The Luxe Med Spa* 🌟\n\n`;
  message += `Dear ${clientName},\n\n`;
  message += `Your appointment has been successfully booked!\n\n`;
  message += `📋 *Details:*\n`;
  message += `• Treatment: ${treatment}\n`;
  message += `• Date: ${date}\n`;
  message += `• Time: ${time}\n`;
  message += `• Price: $${price}\n`;
  
  if (bookingId) {
    message += `• Booking ID: ${bookingId}\n`;
  }
  
  if (refreshment) {
    message += `• Refreshment: ${refreshment} (ready on arrival)\n`;
  }
  
  message += `\nWe look forward to pampering you! ✨\n\n`;
  message += `📍 The Luxe Med Spa\n`;
  message += `📞 27760330046\n`;
  message += `💎 Your sanctuary awaits...`;
  
  return message;
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioSid || !twilioToken || !twilioNumber) {
    throw new Error('Twilio credentials not configured');
  }

  // Clean phone number for WhatsApp
  const cleanPhone = phone.replace(/\D/g, '');
  const whatsappNumber = `whatsapp:+${cleanPhone}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${twilioNumber}`,
        To: whatsappNumber,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }

  console.log('✅ WhatsApp sent to:', phone);
}

async function sendSMS(phone: string, message: string): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioSid || !twilioToken || !twilioNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const cleanPhone = phone.replace(/\D/g, '');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioNumber,
        To: `+${cleanPhone}`,
        Body: message.replace(/[*_`~]/g, ''), // Strip markdown for SMS
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio SMS error: ${error}`);
  }

  console.log('✅ SMS sent to:', phone);
}

async function sendEmail(email: string, clientName: string, message: string): Promise<void> {
  const sendGridKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'bookings@luxemedspa.com';

  if (!sendGridKey) {
    throw new Error('SendGrid API key not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendGridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
        subject: 'Booking Confirmation - The Luxe Med Spa',
      }],
      from: { email: fromEmail, name: 'The Luxe Med Spa' },
      content: [
        {
          type: 'text/plain',
          value: message,
        },
        {
          type: 'text/html',
          value: `
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #D4AF37;">🌟 Booking Confirmed 🌟</h1>
                  <p style="color: #666;">The Luxe Med Spa</p>
                </div>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 10px;">
                  <h2>Dear ${clientName},</h2>
                  <p>Your appointment has been successfully booked!</p>
                  <h3 style="color: #D4AF37;">Appointment Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    ${message.split('\n').filter(line => line.startsWith('•')).map(line => 
                      `<li style="padding: 5px 0;">${line}</li>`
                    ).join('')}
                  </ul>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #666;">
                  <p>We look forward to pampering you! ✨</p>
                  <p>📍 The Luxe Med Spa | 📞 27760330046</p>
                </div>
              </body>
            </html>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  console.log('✅ Email sent to:', email);
}