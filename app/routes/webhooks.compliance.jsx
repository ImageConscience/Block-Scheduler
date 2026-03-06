/* eslint-env node */

import { authenticate } from "../shopify.server";
import { logger } from "../utils/logger.server";

const shouldLogWebhooks =
  process.env.DEBUG_WEBHOOKS === "true" || process.env.NODE_ENV !== "production";
const webhookLog = (...args) => {
  if (shouldLogWebhooks) {
    logger.info(...args);
  }
};

/**
 * Mandatory compliance webhooks (GDPR/CCPA).
 * authenticate.webhook verifies HMAC and returns 401 for invalid signatures.
 * Theme Stream does not store customer/order data; we acknowledge receipt per Shopify requirements.
 */
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const { topic, shop, payload } = await authenticate.webhook(request);

  webhookLog(`[compliance] Received ${topic} for ${shop || payload?.shop_domain || "unknown"}`);

  switch (topic) {
    case "customers/data_request":
    case "CUSTOMERS_DATA_REQUEST":
      // Theme Stream does not collect customer data; nothing to return
      webhookLog("[compliance] customers/data_request: no customer data stored");
      break;
    case "customers/redact":
    case "CUSTOMERS_REDACT":
      // Theme Stream does not store customer data; nothing to delete
      webhookLog("[compliance] customers/redact: no customer data to redact");
      break;
    case "shop/redact":
    case "SHOP_REDACT":
      // Session cleanup is handled by app/uninstalled; shop/redact fires 48h after uninstall
      // Any remaining shop-specific data would be purged here if we stored it
      webhookLog("[compliance] shop/redact: acknowledged");
      break;
    default:
      webhookLog("[compliance] Unhandled topic:", topic);
  }

  return new Response(null, { status: 200 });
};
