import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import webpush from "web-push";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

// VAPID keys should be generated once and kept secret
// For this demo, we'll use these or generate them if not in env
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY || 'BEryiIKVG98nuPG9_yjLcUIc9ZPP2ruWPD3LVrZAo0WAijZ4B-Q55NC_LkjNTxZg4dn96PCAeWtk0tVnX4dFxPU';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '4z-4kM5PDCLl8aJKuTp4vGTNnlragY08gFWH2RgM79I';

webpush.setVapidDetails(
  'mailto:yasar.123.sevda@gmail.com',
  publicVapidKey,
  privateVapidKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json());

  // In-memory subscription storage (In production, use a database)
  const subscriptions: any[] = [];

  // Subscribe Route
  app.post("/api/notifications/subscribe", (req, res) => {
    const subscription = req.body;
    
    // Check if already exists
    const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
    }

    res.status(201).json({});
  });

  // Send Notification Route (Manual trigger)
  app.post("/api/notifications/send", (req, res) => {
    const { title, body, url, subscription } = req.body;
    const payload = JSON.stringify({ title, body, url });

    if (subscription) {
      // Send to specific subscription
      webpush.sendNotification(subscription, payload)
        .then(() => res.status(200).json({ message: "Notification sent" }))
        .catch(err => res.status(500).json({ error: err.message }));
    } else {
      // Send to all in-memory subscriptions (fallback)
      const notifications = subscriptions.map(sub => {
        return webpush.sendNotification(sub, payload).catch(err => {
          console.error("Error sending notification:", err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            const index = subscriptions.indexOf(sub);
            if (index > -1) subscriptions.splice(index, 1);
          }
        });
      });

      Promise.all(notifications)
        .then(() => res.status(200).json({ message: "Notifications sent" }))
        .catch(err => res.status(500).json({ error: err.message }));
    }
  });

  // Background "Cron" to simulate server-side triggers
  // For example, a daily reminder at a specific time
  setInterval(() => {
    const now = new Date();
    // Example: Send a reminder every hour at minute 0
    if (now.getMinutes() === 0 && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: "Hatim Pro Hatırlatıcı",
        body: "Bugünkü okumalarınızı yapmayı unutmayın!",
        url: "/"
      });

      subscriptions.forEach(subscription => {
        webpush.sendNotification(subscription, payload).catch(() => {});
      });
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
