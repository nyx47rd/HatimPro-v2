import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY || 'BEryiIKVG98nuPG9_yjLcUIc9ZPP2ruWPD3LVrZAo0WAijZ4B-Q55NC_LkjNTxZg4dn96PCAeWtk0tVnX4dFxPU';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '4z-4kM5PDCLl8aJKuTp4vGTNnlragY08gFWH2RgM79I';

webpush.setVapidDetails(
  'mailto:yasar.123.sevda@gmail.com',
  publicVapidKey,
  privateVapidKey
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, url, subscription } = req.body;
  
  if (!subscription) {
    return res.status(400).json({ error: 'No subscription provided' });
  }

  const payload = JSON.stringify({ 
    title: title || 'HatimPro', 
    body: body || 'Yeni bildirim!', 
    url: url || '/' 
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Push error:', error);
    return res.status(error.statusCode || 500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
}
