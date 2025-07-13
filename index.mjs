// ✅ index.mjs — CoinDCX Proxy (Updated for Official Docs)
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
app.use(express.json());

function signRequest({ timestamp, method, endpoint, body, secret }) {
  const payload = timestamp + method + endpoint + (body ? JSON.stringify(body) : "");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// 🔁 POST /place-order
app.post("/place-order", async (req, res) => {
  const { market, side, order_type, quantity, apiKey, apiSecret } = req.body;
  const endpoint = "/exchange/v1/orders/create";
  const url = `https://api.coindcx.com${endpoint}`;
  const timestamp = Date.now().toString();
  const body = { market, side, order_type, quantity };
  const signature = signRequest({ timestamp, method: "POST", endpoint, body, secret: apiSecret });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-AUTH-APIKEY": apiKey,
        "X-AUTH-SIGNATURE": signature,
        "X-AUTH-TIMESTAMP": timestamp,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Proxy order error", details: err.message });
  }
});

// 🔁 POST /get-balance
app.post("/get-balance", async (req, res) => {
  const { apiKey, apiSecret, symbol } = req.body;
  const endpoint = "/exchange/v1/users/balances";
  const url = `https://api.coindcx.com${endpoint}`;
  const timestamp = Date.now().toString();
  const signature = signRequest({ timestamp, method: "GET", endpoint, body: null, secret: apiSecret });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-AUTH-APIKEY": apiKey,
        "X-AUTH-SIGNATURE": signature,
        "X-AUTH-TIMESTAMP": timestamp
      }
    });
    const data = await response.json();
    const coin = symbol.replace("INR", "");
    const asset = data.find(a => a.currency === coin);
    res.json({ qty: asset ? asset.available_balance : 0 });
  } catch (err) {
    res.status(500).json({ error: "Proxy balance error", details: err.message });
  }
});

// Health Check
app.get("/", (req, res) => res.send("✅ CoinDCX Proxy is Running"));

app.listen(3000, () => console.log("🚀 Proxy listening on port 3000"));
