/**
 * Privacy Policy – publicly accessible, no auth required.
 * Required for App Store and Built for Shopify. Link from Partner Dashboard listing.
 */

import { Meta, useLoaderData } from "react-router";

export const loader = () => {
  return {
    supportEmail: process.env.SUPPORT_EMAIL || "support@imageconscience.com",
    appUrl: process.env.SHOPIFY_APP_URL || "",
  };
};

export default function PrivacyPolicy() {
  const { supportEmail, appUrl } = useLoaderData();

  return (
    <>
      <Meta title="Privacy Policy | Theme Stream" />
      <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem", lineHeight: 1.6, color: "#333" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Theme Stream Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>Last updated: March 2025</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>1. Introduction</h2>
        <p>
          Theme Stream (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) is a Shopify app that enables merchants to schedule and display promotional content on their online stores. This privacy policy explains how we collect, use, store, and protect information when you use our app. We are committed to transparency and compliance with applicable privacy laws, including the General Data Protection Regulation (GDPR) and the California Privacy Rights Act (CPRA).
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>2. Information We Collect</h2>

        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>2.1 From Merchants (App Users)</h3>
        <ul style={{ marginLeft: "1.25rem", marginBottom: "1rem" }}>
          <li><strong>Shop and account data:</strong> Shop domain, OAuth session tokens, and Shopify user details (name, email) provided by Shopify during installation.</li>
          <li><strong>App usage data:</strong> Content you create (scheduled banners, positions, block configurations), uploaded images and videos, and preferences you set within the app.</li>
          <li><strong>Technical logs:</strong> Server logs for debugging and security (e.g., request timestamps, error logs). We do not log merchant storefront visitor behavior.</li>
        </ul>

        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>2.2 From Store Visitors (Your Customers)</h3>
        <p>
          Theme Stream does <strong>not</strong> collect personal data from your store visitors. The theme block renders scheduled content on your storefront. We do not drop cookies, use tracking technologies, or log how customers navigate your store. Content is served from Shopify&apos;s infrastructure; we do not receive or process visitor IP addresses, device identifiers, or browsing behavior.
        </p>

        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>2.3 Data via Shopify APIs</h3>
        <p>
          We access content (metaobjects, files), theme configuration, and shop settings through Shopify&apos;s APIs solely to provide app functionality. We do not access customer, order, or checkout data.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>3. How We Use Information</h2>
        <p>
          We use the information we collect only to operate the app: storing your scheduled content, syncing positions and metaobjects, serving content to your storefront, and managing your subscription. We do not use your data for advertising, profiling, or purposes unrelated to the app.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>4. Data Storage and Location</h2>
        <p>
          Data is stored in a PostgreSQL database hosted by our infrastructure provider (e.g., Railway). Servers may be located in the United States or other regions. If you are established in the European Economic Area (EEA) and have questions about data transfers, please contact us.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>5. Data Retention</h2>
        <ul style={{ marginLeft: "1.25rem" }}>
          <li><strong>Sessions:</strong> OAuth sessions are retained until you uninstall the app or they expire.</li>
          <li><strong>App data:</strong> Scheduled content and positions are retained until you delete them or uninstall the app.</li>
          <li><strong>After uninstall:</strong> We respond to Shopify&apos;s <code>app/uninstalled</code> and <code>shop/redact</code> webhooks. Session data is deleted promptly; shop-related data is purged within 48 hours of uninstall as required by Shopify.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>6. Data Rights (GDPR, CPRA, and Similar Laws)</h2>
        <p>
          You may have rights to access, correct, delete, or restrict processing of your personal data. We respond to data subject requests via Shopify&apos;s mandatory compliance webhooks (<code>customers/data_request</code>, <code>customers/redact</code>, <code>shop/redact</code>). Because we do not store customer or order data, customer data requests typically require no action from us. For merchant data requests, contact us at the email below.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>7. Security</h2>
        <p>
          We use industry-standard security practices: encrypted connections (TLS), secure OAuth flows, and HMAC verification for webhooks. Access to data is restricted to what is necessary to operate the app.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>8. Third Parties</h2>
        <p>
          We rely on Shopify for authentication and API access, and on our hosting provider for infrastructure. We do not sell or share your data with third parties for marketing or advertising.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>9. Contact</h2>
        <p>
          For privacy questions, data requests, or support, contact us at{" "}
          <a href={`mailto:${supportEmail}`} style={{ color: "#0066cc" }}>{supportEmail}</a>
          {" "}or visit our <a href="/support" style={{ color: "#0066cc" }}>Support page</a>.
        </p>
        <p>
          Theme Stream is built by Image Conscience (e-Com Experts). If your jurisdiction requires a physical address, please include it in your Partner Dashboard app listing or contact us for details.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>10. Changes</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at the top reflects the most recent version. Continued use of the app after changes constitutes acceptance.
        </p>
      </section>

      <p style={{ marginTop: "2rem", color: "#666", fontSize: "0.9rem" }}>
        <a href={appUrl ? `${appUrl.replace(/\/$/, "")}/app/theme-stream` : "/app/theme-stream"} style={{ color: "#0066cc" }}>← Back to Theme Stream</a>
      </p>
    </div>
    </>
  );
}
