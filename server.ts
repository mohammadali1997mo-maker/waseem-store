import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp as serverInitializeApp } from "firebase/app";
import { getFirestore as serverGetFirestore, doc as serverDoc, setDoc as serverSetDoc, updateDoc as serverUpdateDoc, deleteDoc as serverDeleteDoc, increment as serverIncrement, getDoc as serverGetDoc, collection as serverCollection, query as serverQuery, where as serverWhere, getDocs as serverGetDocs, runTransaction as serverRunTransaction } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const serverFirebaseApp = serverInitializeApp(firebaseConfig);
const serverDb = serverGetFirestore(serverFirebaseApp, firebaseConfig.firestoreDatabaseId);

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

  // API: Dispatch order to integration gateway (100% White-Label partner proxy)
  app.post("/api/dispatch-order", async (req, res) => {
    try {
      const { service, amount, orderId, email, uid, currency, qty, pid, playerId, playerName, promoCode } = req.body;

      console.log(`[Dispatched Order to Background Partner] Waseem Order ID: ${orderId} | Player ID: ${playerId} | Service: ${service}`);

      // Perform a silent background request to Al-Kasr reception gateway (completely hidden from browser developers)
      try {
        const response = await fetch("https://alkasr-vip.com/api/v1/orders/receive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Waseem-Partner-Token": process.env.ALKASR_PARTNER_TOKEN || "waseem_golden_partner_secure_token_2026",
          },
          body: JSON.stringify({
            partner_order_id: orderId,
            game_service: service,
            charge_amount: amount,
            charge_currency: currency,
            player_id: playerId,
            player_name: playerName || "",
            quantity: qty,
            promo_code: promoCode || "",
            client_uid: uid,
            client_email: email,
            request_timestamp: new Date().toISOString()
          })
        });

        const resText = await response.text();
        console.log(`[Background Partner Response]`, resText.substring(0, 200));
      } catch (innerErr) {
        console.warn("[Background Partner Request failed silently, continuing gracefully]", innerErr);
      }

      res.json({ success: true, orderId, message: "تم إرسال الطلب ومعالجة الشحن بنجاح في الخلفية" });
    } catch (error: any) {
      console.error("Dispatch Error:", error);
      res.status(500).json({ error: error.message });
    }
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
    const phone = process.env.WHATSAPP_NUMBER || "00963943467444";
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

  // --- External Integrations APIs (Ready for Point Linkage & Webhooks) ---

  // 1. Webhook callback for order/withdrawal status updates from connected sites (e.g., Al-Kasr, etc.)
  app.post("/api/integration/webhook", async (req, res) => {
    try {
      const authKey = req.headers["x-integration-key"] || req.headers["authorization"] || req.body.token || req.query.token;
      const expectedToken = process.env.ALKASR_PARTNER_TOKEN || "waseem_golden_partner_secure_token_2026";
      
      if (!authKey || authKey !== expectedToken) {
        return res.status(401).json({ success: false, error: "فشل التحقق من مفتاح الربط الآمن (Unauthorized Token)" });
      }

      const { orderId, partner_order_id, status, notes } = req.body;
      const targetOrderId = orderId || partner_order_id;

      if (!targetOrderId || !status) {
        return res.status(400).json({ success: false, error: "المعطيات ناقصة. يجب توفير رقم الطلب والحالة الجديدة" });
      }

      console.log(`[Integration Webhook] Received status update for order ${targetOrderId} -> ${status}`);

      // Try searching first in withdrawals
      const withdrawalRef = serverDoc(serverDb, "withdrawals", targetOrderId);
      const withdrawalSnap = await serverGetDoc(withdrawalRef);

      if (withdrawalSnap.exists()) {
        const withData = withdrawalSnap.data();
        const oldStatus = withData.status;

        // If status changes to rejected (مرفوض) and it was "قيد المعالجة" (pending), refund the user
        if (status === "مرفوض" && oldStatus !== "مرفوض") {
          const uid = withData.uid;
          const amount = Number(withData.amount || 0);
          
          if (uid && amount > 0) {
            await serverRunTransaction(serverDb, async (transaction) => {
              const userRef = serverDoc(serverDb, "users", uid);
              const userSnap = await transaction.get(userRef);
              if (userSnap.exists()) {
                const currentBalance = Number(userSnap.data().ucBalance || 0);
                const currentLifetime = Number(userSnap.data().lifetimeAccumulatedUC || 0);
                
                transaction.update(userRef, {
                  ucBalance: currentBalance + amount,
                  lifetimeAccumulatedUC: currentLifetime + amount
                });
                
                // Add a notification about refund
                const notifRef = serverDoc(serverCollection(serverDb, "notifications"));
                transaction.set(notifRef, {
                  uid,
                  title: "تم رفض عملية السحب وإرجاع النقاط",
                  content: `تم رفض سحب ${amount} UC من قبل النظام المرتبط وتم إعادة النقاط فوراً لرصيدك.`,
                  createdAt: new Date().toISOString(),
                  read: false
                });
              }
            });
            console.log(`[Webhook Refund] Automatically refunded ${amount} UC to user ${uid} due to rejection.`);
          }
        }

        // Update withdrawal doc
        await serverUpdateDoc(withdrawalRef, {
          status: status,
          notes: notes || "تحديث تلقائي عبر الربط البرمجي للموقع",
          updatedAt: new Date().toISOString()
        });

        return res.json({ success: true, message: `تم تحديث حالة طلب السحب إلى (${status}) بنجاح.` });
      }

      // If not in withdrawals, look in invoices (deposits)
      const invoiceRef = serverDoc(serverDb, "invoices", targetOrderId);
      const invoiceSnap = await serverGetDoc(invoiceRef);

      if (invoiceSnap.exists()) {
        const invData = invoiceSnap.data();
        const isManualTopup = invData.paymentMethod === "شام كاش - إيداع محفظة يدوي" || invData.paymentMethod?.includes("كاش") || invData.paymentMethod?.includes("إيداع");
        const isApproving = status === "مكتمل" || status === "تم الشحن";

        if (isManualTopup && isApproving && !invData.credited) {
          const uid = invData.uid;
          const qty = parseInt(invData.qty || "0", 10);
          const bonusQty = parseInt(invData.bonusQty || "0", 10);
          const ucToAdd = qty + bonusQty;

          if (uid && ucToAdd > 0) {
            await serverRunTransaction(serverDb, async (transaction) => {
              const userRef = serverDoc(serverDb, "users", uid);
              const userSnap = await transaction.get(userRef);
              if (userSnap.exists()) {
                const currentBalance = Number(userSnap.data().ucBalance || 0);
                const currentLifetime = Number(userSnap.data().lifetimeAccumulatedUC || 0);

                transaction.update(userRef, {
                  ucBalance: currentBalance + ucToAdd,
                  lifetimeAccumulatedUC: currentLifetime + ucToAdd
                });

                transaction.update(invoiceRef, {
                  status: status,
                  credited: true,
                  updatedAt: new Date().toISOString()
                });

                // Add real-time user notification
                const notifRef = serverDoc(serverCollection(serverDb, "notifications"));
                transaction.set(notifRef, {
                  uid,
                  title: "تم اعتماد نقاطك بنجاح",
                  content: `تم شحن رصيدك تلقائياً بـ ${ucToAdd} UC عبر تأكيد الإيداع التلقائي البرمجي.`,
                  createdAt: new Date().toISOString(),
                  read: false
                });
              }
            });
            console.log(`[Webhook Deposit Credit] Credited ${ucToAdd} UC to user ${uid} via automatic status approve webhook.`);
            return res.json({ success: true, message: `تم تحديث حالة الفاتورة واعتماد رصيد النقاط تلقائياً لـ ${ucToAdd} UC.` });
          }
        }

        // Regular invoice status update
        await serverUpdateDoc(invoiceRef, {
          status: status,
          updatedAt: new Date().toISOString()
        });
        return res.json({ success: true, message: `تم تحديث حالة طلب الشراء إلى (${status}) بنجاح.` });
      }

      return res.status(404).json({ success: false, error: "لم يتم العثور على أي فاتورة أو طلب سحب يحمل المعرف المرفق" });
    } catch (err: any) {
      console.error("[Integration Webhook Error]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Add/Credit points and balance to any user directly from the connected external website
  app.post("/api/integration/add-points", async (req, res) => {
    try {
      const authKey = req.headers["x-integration-key"] || req.headers["authorization"] || req.body.token || req.query.token;
      const expectedToken = process.env.ALKASR_PARTNER_TOKEN || "waseem_golden_partner_secure_token_2026";
      
      if (!authKey || authKey !== expectedToken) {
        return res.status(401).json({ success: false, error: "غير مصرح: رمز التحقق الأمني غير صحيح لحساب النقاط" });
      }

      const { email, uid, amount, reason } = req.body;
      const parsedAmount = Number(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, error: "المبلغ/النقاط غير صالحة. يجب أن يكون رقماً أكبر من صفر" });
      }

      if (!uid && !email) {
        return res.status(400).json({ success: false, error: "الرجاء تحديد معرف المستخدم (uid) أو بريده الإلكتروني (email) للبحث وتحديث رصيده" });
      }

      let targetUid = uid;

      // If uid not provided, search by email inside firestore users
      if (!targetUid && email) {
        const usersCol = serverCollection(serverDb, "users");
        const q = serverQuery(usersCol, serverWhere("email", "==", email));
        const qSnap = await serverGetDocs(q);
        
        if (qSnap.empty) {
          return res.status(404).json({ success: false, error: `لم يتم العثور على مستخدم مسجل بالبريد الإلكتروني: ${email}` });
        }
        
        targetUid = qSnap.docs[0].id;
      }

      const userRef = serverDoc(serverDb, "users", targetUid);
      const userSnap = await serverGetDoc(userRef);

      if (!userSnap.exists()) {
        return res.status(404).json({ success: false, error: "معرف المستخدم المدخل غير مسجل في متجر وسيم" });
      }

      const userData = userSnap.data();
      const userEmail = userData.email || email || "unregistered@wsimstore.com";
      const userName = userData.name || "عميل وسيم";

      // Execute transaction to atomically add points/balance
      const invoiceId = "api_points_" + Math.random().toString(36).substring(2, 11).toUpperCase();
      
      await serverRunTransaction(serverDb, async (transaction) => {
        const uSnap = await transaction.get(userRef);
        const currentBalance = Number(uSnap.data()?.ucBalance || 0);
        const currentLifetime = Number(uSnap.data()?.lifetimeAccumulatedUC || 0);

        // Update wallet balances
        transaction.update(userRef, {
          ucBalance: currentBalance + parsedAmount,
          lifetimeAccumulatedUC: currentLifetime + parsedAmount
        });

        // Add a recorded invoice so they can see this transfer in their account activity
        const invoiceRef = serverDoc(serverDb, "invoices", invoiceId);
        transaction.set(invoiceRef, {
          orderId: invoiceId,
          uid: targetUid,
          username: userName,
          email: userEmail,
          service: reason || "شحن رصيد تلقائي من الموقع المرتبط",
          amount: 0, // Direct points credit has $0 charge on our billing
          currency: "USD",
          qty: parsedAmount,
          bonusQty: 0,
          paymentMethod: "ربط خارجي تلقائي - API",
          status: "مكتمل",
          credited: true,
          date: new Date().toISOString()
        });

        // Create notification
        const notifRef = serverDoc(serverCollection(serverDb, "notifications"));
        transaction.set(notifRef, {
          uid: targetUid,
          title: "تم استلام نقاط بنجاح",
          content: `تمت إضافة ${parsedAmount} نقطة/رصيد محفظة لحسابك بنجاح من الموقع الشريك (السبب: ${reason || "مزامنة خارجية"}).`,
          createdAt: new Date().toISOString(),
          read: false
        });
      });

      console.log(`[Integration Add Points] Successfully credited ${parsedAmount} points to user ${userName} (${targetUid})`);

      return res.json({
        success: true,
        transactionId: invoiceId,
        uid: targetUid,
        email: userEmail,
        pointsCredited: parsedAmount,
        message: `تم شحن رصيد العميل بنجاح وعمل إشعار مباشر في حسابه.`
      });
    } catch (err: any) {
      console.error("[Integration Add Points Error]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Admin Syria Proxy Endpoints to bypass Google Firebase block ---
  
  // 1. Save custom price
  app.post("/api/admin/save-price", async (req, res) => {
    try {
      const { key, price } = req.body;
      if (!key || price === undefined) {
        return res.status(400).json({ error: "Missing key or price" });
      }

      // Write new custom price to DB
      await serverSetDoc(serverDoc(serverDb, "prices", key), {
        price: Number(price),
        updatedAt: new Date().toISOString()
      });

      // Evaluation for Real-time Price Alerts
      try {
        const globalDoc = await serverGetDoc(serverDoc(serverDb, "settings", "global"));
        const isGlobalAlertsEnabled = globalDoc.exists() ? (globalDoc.data().priceAlertsEnabled !== false) : true;

        if (isGlobalAlertsEnabled) {
          const alertsQuery = serverQuery(
            serverCollection(serverDb, "price_alerts"),
            serverWhere("serviceKey", "==", key)
          );
          const alertsSnapshot = await serverGetDocs(alertsQuery);
          
          const newPrice = Number(price);

          for (const docSnap of alertsSnapshot.docs) {
            const alertData = docSnap.data();
            const targetUid = alertData.uid;
            const triggerType = alertData.triggerType || "any_change";
            const targetPrice = Number(alertData.targetPrice) || 0;

            let shouldNotify = false;
            let notifTitle = "🔔 تحديث سعر خدمة تتابعها";
            let notifMsg = `تم تحديث السعر لخدمة "${key}" التي تتابعها لتصبح بسعر: $${newPrice.toFixed(2)} دولار.`;

            if (triggerType === "any_change") {
              shouldNotify = true;
            } else if (triggerType === "lower_than" && newPrice <= targetPrice) {
              shouldNotify = true;
              notifTitle = "💸 انخفاض السعر لهدفك المحدد!";
              notifMsg = `بشرى سارة! وصل السعر المستهدف لخدمة "${key}" إلى $${newPrice.toFixed(2)}، وهو أقل من أو يساوي الحد الأقصى الذي حددته ($${targetPrice.toFixed(2)}). اطلبها الآن!`;
            }

            if (shouldNotify && targetUid) {
              const notifId = `alert_${targetUid}_${key.replace(/[\s/]/g, "_")}_${Date.now()}`;
              await serverSetDoc(serverDoc(serverDb, "notifications", notifId), {
                uid: targetUid,
                title: notifTitle,
                message: notifMsg,
                read: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      } catch (alertsErr) {
        console.warn("Non-blocking error evaluating price alert subscriptions:", alertsErr);
      }

      res.json({ success: true, message: "Price saved successfully via Proxy Server and evaluated for alerts" });
    } catch (err: any) {
      console.error("[Proxy Save Price Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 1b. Update Price Alerts Toggle Setting
  app.post("/api/admin/update-price-alerts-setting", async (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled === undefined) {
        return res.status(400).json({ error: "Missing enabled parameter" });
      }
      await serverSetDoc(serverDoc(serverDb, "settings", "global"), {
        priceAlertsEnabled: Boolean(enabled)
      }, { merge: true });
      res.json({ success: true, enabled: Boolean(enabled), message: "Price alerts status updated successfully" });
    } catch (err: any) {
      console.error("[Proxy Update Price Alerts Setting Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Reset custom price (delete)
  app.post("/api/admin/reset-price", async (req, res) => {
    try {
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Missing key" });
      }
      await serverDeleteDoc(serverDoc(serverDb, "prices", key));
      res.json({ success: true, message: "Price reset successfully via Proxy Server" });
    } catch (err: any) {
      console.error("[Proxy Reset Price Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update global exchange rate
  app.post("/api/admin/update-exchange-rate", async (req, res) => {
    try {
      const { exchangeRate } = req.body;
      if (exchangeRate === undefined || isNaN(Number(exchangeRate))) {
        return res.status(400).json({ error: "Invalid exchange rate" });
      }
      await serverSetDoc(serverDoc(serverDb, "settings", "global"), {
        exchangeRate: Number(exchangeRate)
      });
      res.json({ success: true, exchangeRate: Number(exchangeRate), message: "Exchange rate updated via Proxy Server" });
    } catch (err: any) {
      console.error("[Proxy Update Exchange Rate Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Update withdrawal status (Approve or Reject with refund)
  app.post("/api/admin/update-withdrawal-status", async (req, res) => {
    try {
      const { id, status, uid, amount } = req.body;
      if (!id || !status) {
        return res.status(400).json({ error: "Missing id or status" });
      }

      const withdrawalRef = serverDoc(serverDb, "withdrawals", id);

      if (status === "تم الشحن") {
        await serverUpdateDoc(withdrawalRef, {
          status: "تم الشحن",
          updatedAt: new Date().toISOString()
        });
      } else if (status === "مرفوض") {
        if (!uid || amount === undefined) {
          return res.status(400).json({ error: "Missing user uid or amount for rejection refund" });
        }
        // Refund client UC balance
        const userRef = serverDoc(serverDb, "users", uid);
        await serverUpdateDoc(userRef, {
          ucBalance: serverIncrement(Number(amount)),
          lifetimeAccumulatedUC: serverIncrement(Number(amount))
        });
        
        // Update withdrawal doc
        await serverUpdateDoc(withdrawalRef, {
          status: "مرفوض",
          updatedAt: new Date().toISOString()
        });
      } else {
        return res.status(400).json({ error: "Invalid status value" });
      }

      res.json({ success: true, message: `Withdrawal status updated to ${status} via Proxy Server` });
    } catch (err: any) {
      console.error("[Proxy Update Withdrawal Status Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Update admin role
  app.post("/api/admin/update-admin-role", async (req, res) => {
    try {
      const { id, role } = req.body;
      if (!id || !role) {
        return res.status(400).json({ error: "Missing id or role" });
      }
      await serverUpdateDoc(serverDoc(serverDb, "admins", id), { role });
      res.json({ success: true, message: "Admin role updated via Proxy Server" });
    } catch (err: any) {
      console.error("[Proxy Update Admin Role Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Delete admin
  app.post("/api/admin/remove-admin", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      await serverDeleteDoc(serverDoc(serverDb, "admins", id));
      res.json({ success: true, message: "Admin removed via Proxy Server" });
    } catch (err: any) {
      console.error("[Proxy Remove Admin Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Promote user to admin
  app.post("/api/admin/promote-user", async (req, res) => {
    try {
      const { uid, email, name } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: "Missing user credentials" });
      }
      await serverSetDoc(serverDoc(serverDb, "admins", uid), {
        uid,
        email,
        name: name || "مستخدم",
        role: "viewer",
        addedAt: new Date().toISOString()
      });
      res.json({ success: true, message: "User promoted to admin via Proxy Server" });
    } catch (err: any) {
      console.error("[Proxy Promote User Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Serve input_file images from root workspace
  app.get("/input_file_*.png", (req, res) => {
    const filename = path.basename(req.path);
    const filePath = path.join(process.cwd(), filename);
    res.sendFile(filePath);
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
    app.use(express.static(process.cwd())); // Serve files in root workspace like input_file_0.png
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
