# Partner Dashboard Checklist (Built for Shopify)

Before submitting for App Store review or Built for Shopify, complete these in the [Shopify Partner Dashboard](https://partners.shopify.com).

## App Listing

| Item | Where | Notes |
|------|-------|------|
| **Privacy Policy URL** | App setup → App listing | `https://YOUR_DOMAIN/privacy` (e.g. `https://theme-stream-production.up.railway.app/privacy`) |
| **Support URL or email** | App setup → App listing | Use `https://YOUR_DOMAIN/support` or `mailto:SUPPORT_EMAIL` |
| **App icon** | App setup | 1200×1200 px (JPEG or PNG) |
| **Screenshots** | App listing | Match current app behavior |
| **Description** | App listing | Clear, accurate feature description |

## App Configuration

| Item | Where | Notes |
|------|-------|------|
| **Emergency contact** | App setup | Email + phone for Shopify to reach you |
| **Application URL** | App setup | Must match `SHOPIFY_APP_URL` (e.g. `https://theme-stream-production.up.railway.app/app/theme-stream`) |
| **Allowed redirection URLs** | App setup | `/auth`, `/auth/callback` on your domain |

## Environment Variables (Railway / Production)

Ensure these are set in production:

- `SUPPORT_EMAIL` – Used in privacy policy and support page (default: `support@imageconscience.com`)
- `SHOPIFY_APP_URL` – Base URL for your app
- All billing and database vars from `.env.example`

## Built for Shopify Notes

- **Immediate redirect after auth**: `application_url` points to `/app/theme-stream`; no extra steps.
- **Compliance webhooks**: Subscribed in `shopify.app.toml`; HMAC verified.
- **Support accessible**: Footer links to Privacy and Support in the app.
- **Theme extension**: Uses theme app extension (no Asset API).
