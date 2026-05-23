import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const stripeClient = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Lazy initialize Gemini to prevent crash if key is missing on startup
let generativeAI: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!generativeAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    generativeAI = new GoogleGenAI({ apiKey });
  }
  return generativeAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API: Create Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripeClient) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    try {
      const { service, amount, orderId, email } = req.body;

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: service,
                description: `Order ID: ${orderId}`,
              },
              unit_amount: Math.round(amount * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/payment?success=true&orderId=${orderId}`,
        cancel_url: `${req.headers.origin}/payment?canceled=true&orderId=${orderId}`,
        metadata: {
          orderId,
          service,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Notify via WhatsApp (Simulated/Proxy)
  app.post("/api/notify-payment", async (req, res) => {
    const { orderId, amount, service, userEmail } = req.body;
    const phone = process.env.WHATSAPP_NUMBER || "00963931423016";
    const message = `🔔 إشعار دفع جديد!\n\n🛍️ الخدمة: ${service}\n💰 المبلغ: $${amount}\n📧 العميل: ${userEmail}\n🆔 رقم الطلب: ${orderId}`;
    
    // In a real scenario, this would call Twilio or a similar API.
    // For now, we return the WhatsApp link that the client-side can trigger if needed,
    // or log it as a successful notification on our "bridge".
    console.log(`[WhatsApp Notify] To: ${phone} - Message: ${message}`);
    
    res.json({ success: true, message: "Notification sent (logged on server)" });
  });

  // API: Sync Invoice to Google Sheets
  app.post("/api/sync-to-sheets", async (req, res) => {
    const { token, invoice, spreadsheetId } = req.body;
    
    if (!token) {
      return res.status(401).json({ error: "Missing access token" });
    }

    try {
      const targetId = spreadsheetId || "my-invoices-sheet"; // Placeholder or user provided
      
      // First, we'd check if sheet exists or create one. 
      // For simplicity, we assume the user provides a valid spreadsheetId or we append to a known one.
      // Append row to Google Sheets
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: [[
            invoice.orderId,
            invoice.date,
            invoice.userName,
            invoice.userEmail,
            invoice.service,
            invoice.amount,
            invoice.paymentMethod,
            invoice.referralCode || ""
          ]]
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }

      res.json({ success: true, result });
    } catch (error: any) {
      console.error("Sheets Sync Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: AI Insights for Sales
  app.post("/api/ai-insights", async (req, res) => {
    const { invoices } = req.body;
    
    if (!invoices || !Array.isArray(invoices)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    try {
      const summaryData = invoices.map(inv => ({
        service: inv.service,
        amount: inv.amount,
        date: inv.date.substring(0, 10),
        method: inv.paymentMethod
      })).slice(0, 50);

      const prompt = `Analyze these sales records for "Wsim Store" and provide:
      1. A short summary of total revenue.
      2. Top performing services.
      3. Strategic suggestions to increase profit based on the data.
      4. A motivational quote for the team.
      
      Data: ${JSON.stringify(summaryData)}
      
      Answer in Arabic (Since the app is for Arabic audience).`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
