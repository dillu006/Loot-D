# Loot Bhai Live

This version does NOT contain demo products.

## Run
1. Install Node.js
2. Set `PRODUCT_FEED_URL` to your authorised affiliate XML product feed URL.
3. Run: `node server.js`
4. Open http://localhost:3000

## Render / Railway
- Start command: `node server.js`
- Environment variable: `PRODUCT_FEED_URL`
- Value: your Admitad XML product feed URL

The server fetches the feed, parses products, calculates discount, and the UI shows live feed items.
Keep feed/API credentials server-side. Use only feeds/programmes you are authorised to publish.
