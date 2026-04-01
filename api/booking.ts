/**
 * Real-Time Booking System Integration
 * Connects to custom/internal booking systems
 * 
 * Configuration via environment variables:
 * - BOOKING_API_URL: Base URL of the internal booking system
 * - BOOKING_API_KEY: API key for authentication
 * - BOOKING_API_PROVIDER: Provider type ('custom', 'calendly', 'acuity', etc.)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers for cross-origin requests
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Booking interface
interface BookingRequest {
  action: 'check_availability' | 'create_booking';
  treatment?: string;
  date?: string;
  time?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  duration?: number;
}

// Response interface
interface BookingResponse {
  success: boolean;
  available?: boolean;
  slots?: string[];
  bookingId?: string;
  confirmation?: string;
  error?: string;
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

  const { action, treatment, date, time, clientName, clientEmail, clientPhone, duration = 60 }: BookingRequest = req.body;

  // Validate required fields based on action
  if (action === 'check_availability' && (!treatment || !date)) {
    return res.status(400).json({ error: 'Treatment and date are required for availability check' });
  }

  if (action === 'create_booking' && (!treatment || !date || !time || !clientName || !clientEmail || !clientPhone)) {
    return res.status(400).json({ error: 'All booking details are required' });
  }

  try {
    const bookingApiUrl = process.env.BOOKING_API_URL;
    const bookingApiKey = process.env.BOOKING_API_KEY;
    const bookingProvider = process.env.BOOKING_API_PROVIDER || 'custom';

    // If no booking API is configured, return mock availability
    if (!bookingApiUrl) {
      console.log('⚠️ No BOOKING_API_URL configured - using mock availability');
      
      if (action === 'check_availability') {
        // Return mock available slots
        const mockSlots = ['09:00 AM', '10:00 AM', '02:00 PM', '04:00 PM'];
        return res.status(200).json({
          success: true,
          available: true,
          slots: mockSlots,
          message: 'Mock availability (configure BOOKING_API_URL for real-time)'
        });
      }

      if (action === 'create_booking') {
        // Return mock booking confirmation
        const mockBookingId = `BK-${Date.now()}`;
        return res.status(200).json({
          success: true,
          bookingId: mockBookingId,
          confirmation: `Booking confirmed for ${clientName} on ${date} at ${time}`,
          message: 'Mock booking created (configure BOOKING_API_URL for real bookings)'
        });
      }
    }

    // Connect to the real booking system
    const endpoint = action === 'check_availability' 
      ? `${bookingApiUrl}/availability`
      : `${bookingApiUrl}/bookings`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (bookingApiKey) {
      headers['Authorization'] = `Bearer ${bookingApiKey}`;
    }

    const payload = {
      treatment,
      date,
      time,
      client: action === 'create_booking' ? {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      } : undefined,
      duration,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Booking API error:', errorText);
      return res.status(response.status).json({
        success: false,
        error: 'Failed to connect to booking system'
      });
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Booking endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}