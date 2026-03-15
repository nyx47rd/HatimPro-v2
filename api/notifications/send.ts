import type { VercelRequest, VercelResponse } from '@vercel/node';

const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID || '61205574-f992-486d-ae82-7b6632beb067';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, url, subscription } = req.body;
  
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: "OneSignal REST_API_KEY eksik. Lütfen Vercel Environment Variables kısmına ekleyin." });
  }

  try {
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title || 'HatimPro', tr: title || 'HatimPro' },
      contents: { en: body || 'Yeni bildirim!', tr: body || 'Yeni bildirim!' },
      url: url || '/',
      target_channel: "push"
    };

    if (subscription) {
      // subscription is the OneSignal subscription ID
      payload.include_aliases = {
        onesignal_id: [subscription]
      };
    } else {
      // Send to all
      payload.included_segments = ["Total Subscriptions"];
    }

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      console.error("OneSignal API Error:", data);
      return res.status(response.status).json({ 
        error: 'Failed to send notification',
        details: data.errors ? data.errors[0] : "OneSignal API Hatası" 
      });
    }
  } catch (error: any) {
    console.error('Push error:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
}
