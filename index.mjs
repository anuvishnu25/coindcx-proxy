// index.mjs
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const app = express();
app.use(express.json());

function generateSignature(timestamp, method, endpoint, body, secret) {
  const stableBody = body
    ? JSON.stringify({
        market: body.market,
        side: body.side,
        order_type: body.order_type,
        quantity: body.quantity
      })
    : '';

  const payload = timestamp + method + endpoint + stableBody;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

app.post('/place-order', async (req, res) => {
  const { market, side, order_type, quantity, headers } = req.body;
  const endpoint = '/exchange/v1/orders/create';
  const url = `https://api.coindcx.com${endpoint}`;
  const timestamp = Date.now().toString();

  const body = { market, side, order_type, quantity };
  const signature = generateSignature(timestamp, 'POST', endpoint, body, headers.apiSecret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-AUTH-APIKEY': headers.apiKey,
        'X-AUTH-SIGNATURE': signature,
        'X-AUTH-TIMESTAMP': timestamp,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy order error', details: err.message });
  }
});

app.post('/get-balance', async (req, res) => {
  const { symbol, headers } = req.body;
  const endpoint = '/exchange/v1/users/balances';
  const url = `https://api.coindcx.com${endpoint}`;
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, 'GET', endpoint, null, headers.apiSecret);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-AUTH-APIKEY': headers.apiKey,
        'X-AUTH-SIGNATURE': signature,
        'X-AUTH-TIMESTAMP': timestamp
      }
    });

    const data = await response.json();
    const coin = symbol.replace('INR', '');
    const asset = data.find(a => a.currency === coin);
    res.json({ qty: asset ? asset.available_balance : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Proxy balance error', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('✅ CoinDCX Proxy is Running');
});

app.listen(3000, () => console.log('Server running on port 3000'));
