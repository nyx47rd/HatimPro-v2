import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID || '61205574-f992-486d-ae82-7b6632beb067';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json());

  // Subscribe Route (Kept for backward compatibility if needed, but OneSignal handles this)
  app.post("/api/notifications/subscribe", (req, res) => {
    res.status(201).json({});
  });

  // Send Notification Route
  app.post("/api/notifications/send", async (req, res) => {
    const { title, body, url, subscription } = req.body;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return res.status(500).json({ error: "OneSignal REST_API_KEY eksik. Lütfen Environment Variables kısmına ekleyin." });
    }

    try {
      const payload: any = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: title, tr: title },
        contents: { en: body, tr: body },
        url: url || '/',
        target_channel: "push"
      };

      if (subscription) {
        // subscription is the OneSignal subscription ID
        payload.include_subscription_ids = [subscription];
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
        res.status(200).json({ message: "Notification sent", data });
      } else {
        console.error("OneSignal API Error:", data);
        res.status(response.status).json({ error: data.errors ? data.errors[0] : "OneSignal API Hatası" });
      }
    } catch (err: any) {
      console.error("Error sending OneSignal notification:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Background "Cron" to simulate server-side triggers
  setInterval(async () => {
    const now = new Date();
    // Example: Send a reminder every hour at minute 0
    if (now.getMinutes() === 0 && ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
      try {
        await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            included_segments: ["All"],
            headings: { en: "Hatim Pro Hatırlatıcı", tr: "Hatim Pro Hatırlatıcı" },
            contents: { en: "Bugünkü okumalarınızı yapmayı unutmayın!", tr: "Bugünkü okumalarınızı yapmayı unutmayın!" },
            url: "/"
          })
        });
      } catch (e) {
        console.error("Cron notification error:", e);
      }
    }
  }, 60000); // Check every minute

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
