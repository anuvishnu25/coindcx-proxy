// index.mjs
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const app = express();
app.use(express.json());

function generateSignature(timestamp, method, endpoint, body, secret) {
  const payload = timestamp + method + endpoint + (body ? JSON.stringify(body) : "");
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

app.post('/place-order', async (req, res) => {
  try {
    const { market, side, order_type, quantity, headers } = req.body;
    const endpoint = "/exchange/v1/orders/create";
    const url = "https://api.coindcx.com" + endpoint;
    const timestamp = Date.now().toString();

    const orderBody = { market, side, order_type, quantity };

    const signature = generateSignature(
      timestamp,
      "POST",
      endpoint,
      orderBody,
      headers.apiSecret
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-AUTH-APIKEY": headers.apiKey,
        "X-AUTH-SIGNATURE": signature,
        "X-AUTH-TIMESTAMP": timestamp,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderBody)
    });

    const data = await response.text(); // <-- Use text to log full response
    console.log("📦 Response from CoinDCX:", data);
    res.type('json').send(data);
  } catch (err) {
    console.error("❌ Proxy error:", err.message);
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

app.post('/get-balance', async (req, res) => {
  try {
    const { symbol, headers } = req.body;
    const endpoint = "/exchange/v1/users/balances";
    const url = "https://api.coindcx.com" + endpoint;
    const timestamp = Date.now().toString();

    const signature = generateSignature(
      timestamp,
      "GET",
      endpoint,
      null,
      headers.apiSecret
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-AUTH-APIKEY": headers.apiKey,
        "X-AUTH-SIGNATURE": signature,
        "X-AUTH-TIMESTAMP": timestamp
      }
    });

    const data = await response.json();
    const coin = symbol.replace("INR", "");
    const asset = data.find(a => a.currency === coin);
    res.json({ qty: asset ? asset.available_balance : 0 });
  } catch (err) {
    console.error("❌ Proxy balance error:", err.message);
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ CoinDCX Proxy is Running");
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
