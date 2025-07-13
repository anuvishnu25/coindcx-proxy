import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// 🔐 Generate HMAC Signature
function generateSignature(timestamp, method, endpoint, body, secret) {
  const payload = timestamp + method + endpoint + (body ? JSON.stringify(body) : '');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// 📦 POST /place-order
app.post('/place-order', async (req, res) => {
  const { body, apiKey, apiSecret } = req.body;

  if (!apiKey || !apiSecret || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const endpoint = "/exchange/v1/orders/create";
  const url = `https://api.coindcx.com${endpoint}`;
  const timestamp = Date.now().toString();

  const signature = generateSignature(timestamp, "POST", endpoint, body, apiSecret);

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
    res.status(response.status).json(result);
  } catch (err) {
    res.status(500).json({ error: "Proxy order error", details: err.message });
  }
});

// 📊 POST /get-balance
app.post('/get-balance', async (req, res) => {
  const { symbol, apiKey, apiSecret } = req.body;

  if (!apiKey || !apiSecret || !symbol) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const endpoint = "/exchange/v1/users/balances";
  const url = `https://api.coindcx.com${endpoint}`;
  const timestamp = Date.now().toString();

  const signature = generateSignature(timestamp, "GET", endpoint, null, apiSecret);

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
    const match = data.find(a => a.currency === coin);
    res.json({ qty: match ? match.available_balance : 0 });
  } catch (err) {
    res.status(500).json({ error: "Proxy balance error", details: err.message });
  }
});

// ✅ Health check
app.get('/', (req, res) => {
  res.send('✅ CoinDCX Proxy is Running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
