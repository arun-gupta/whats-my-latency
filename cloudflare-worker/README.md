# Cloudflare Worker Setup for What's My Latency?

## Finding Your Cloudflare Account ID

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. At the top left, click on your account name (not a specific site/domain).
3. On the Account Home page, locate the three dots (•••) next to "Account Home".
4. Click the three dots and select **"Copy Account ID"** to copy your Account ID to the clipboard.
5. Paste this value into the `account_id` field in your `wrangler.toml` file.

---

## Finding Your Cloudflare Workers Subdomain

1. In the Cloudflare Dashboard, in the left sidebar, click on **Compute (Workers)** (may appear as **Workers & Pages**).
2. Look at the **right column, towards the end** of the page. Your workers.dev subdomain will be shown there, e.g., `your-subdomain.workers.dev`.
3. Use this subdomain in your Worker URL: `https://<worker-name>.<your-subdomain>.workers.dev`

---

## Deploying the Worker

1. Install dependencies:
   ```sh
   npm install
   ```
2. Add your `account_id` to `wrangler.toml` as described above.
3. Deploy the Worker:
   ```sh
   npx wrangler deploy
   ``` 