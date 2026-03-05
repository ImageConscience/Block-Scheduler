/* eslint-env node */

import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

const shouldLogEntry = process.env.DEBUG_ENTRY_LOGS === "true";
const entryError = (...args) => {
  if (shouldLogEntry) {
    console.error(...args);
  }
};

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
) {
  // Check if this is a fetcher request (from useFetcher) that expects JSON
  const acceptHeader = request.headers.get("accept") || "";
  const isFetcherRequest = acceptHeader.includes("*/*") || 
                          acceptHeader.includes("application/json") || 
                          (!acceptHeader.includes("text/html") && request.method !== "GET");
  
  // React Router v7: Check if the context already has a Response to return
  // Actions returning Response objects should bypass HTML rendering
  // Check multiple possible locations where Response might be stored
  if (reactRouterContext) {
    // Check actionData - React Router might serialize Response data here
    if (reactRouterContext.actionData) {
      for (const [, actionData] of Object.entries(reactRouterContext.actionData)) {
        if (actionData instanceof Response) {
          const contentType = actionData.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            return actionData;
          }
        } else if (isFetcherRequest && typeof actionData === "object" && actionData !== null) {
          return new Response(JSON.stringify(actionData), {
            status: responseStatusCode || 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
          });
        }
      }
    }
    
    // Check if there's a response object directly
    if (reactRouterContext.response && reactRouterContext.response instanceof Response) {
      const contentType = reactRouterContext.response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return reactRouterContext.response;
      }
    }
    
    // Check routeData
    if (reactRouterContext.routeData) {
      for (const [, routeData] of Object.entries(reactRouterContext.routeData)) {
        if (routeData instanceof Response) {
          const contentType = routeData.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            return routeData;
          }
        }
      }
    }
  }
  
  // CRITICAL: If this is a fetcher POST request and headers already indicate JSON,
  // React Router v7 has already processed the action response.
  // We MUST bypass HTML rendering and return JSON directly.
  if (isFetcherRequest && request.method === "POST") {
    const existingContentType = responseHeaders.get("content-type");
    // If headers indicate JSON, React Router has already processed the action response
    // We need to get the actual response body from the context
    if (existingContentType && existingContentType.includes("application/json")) {
      // Try to find the action response in the context
      // React Router v7 might store it differently
      let actionResponseData = null;
      
      // Log entire context structure to find where data is stored
      if (reactRouterContext?.actionData) {
        for (const [, data] of Object.entries(reactRouterContext.actionData)) {
          if (data && typeof data === "object" && !(data instanceof Response)) {
            actionResponseData = data;
            break;
          }
        }
      }
      if (!actionResponseData && reactRouterContext?.staticHandlerContext) {
        const staticContext = reactRouterContext.staticHandlerContext;
          
        if (staticContext?.actionData) {
          for (const [, data] of Object.entries(staticContext.actionData)) {
            if (data && typeof data === "object" && !(data instanceof Response)) {
              actionResponseData = data;
              break;
            }
          }
        }
        if (!actionResponseData && staticContext?.response instanceof Response) {
          try {
            const clonedResponse = staticContext.response.clone();
            const responseText = await clonedResponse.text();
            actionResponseData = JSON.parse(responseText);
          } catch {
            /* ignore */
          }
        }
        if (!actionResponseData && staticContext?.loaderData) {
          for (const [, data] of Object.entries(staticContext.loaderData)) {
            if (data && typeof data === "object" && (data.success !== undefined || data.error !== undefined)) {
              actionResponseData = data;
              break;
            }
          }
        }
      }
      
      // Also check if there's a response body stored elsewhere in the context
      // React Router might serialize it differently
      if (!actionResponseData && reactRouterContext) {
        for (const [, value] of Object.entries(reactRouterContext)) {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            if (value.success !== undefined || value.error !== undefined || value.file !== undefined) {
              actionResponseData = value;
              break;
            }
          }
        }
      }
      
      // If we didn't find the data but headers indicate JSON,
      // React Router has already processed the action and set JSON headers
      // The response body should be in the context, but if we can't find it,
      // we need to check if React Router stored it in matches/routeData
      if (!actionResponseData && reactRouterContext?.matches) {
        for (const match of reactRouterContext.matches) {
          if (match.route?.module?.action && match.routeData) {
            for (const [, value] of Object.entries(match.routeData)) {
              if (value && typeof value === "object" && (value.success !== undefined || value.error !== undefined)) {
                actionResponseData = value;
                break;
              }
            }
          }
        }
      }

      if (actionResponseData) {
        return new Response(JSON.stringify(actionResponseData), {
          status: responseStatusCode || 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      }
      
      // If we STILL didn't find the data, but headers are JSON,
      // React Router v7 has already processed the action response.
      // The response body should be available, but React Router may have already streamed it.
      // We need to reconstruct it from what we know - but since we can't access it,
      // we should check if React Router stored the response somewhere else.
      if (!actionResponseData) {
        // React Router v7 should have already sent the response body.
        // The fact that we're here means entry.server.jsx is being called AFTER the response was processed.
        // We should NOT render HTML - but we also can't access the original response body.
        // The best we can do is abort rendering by throwing or returning early.
        // However, if we throw, React Router might show an error page.
        // Instead, let's try to read from the response stream if available, or skip rendering.
        
        // Since we can't access the original response, and React Router should have already sent it,
        // we need to prevent HTML rendering without overriding the response.
        // The safest approach is to NOT render HTML at all - return early without calling renderToPipeableStream.
        // But entry.server.jsx is designed to always render, so we can't just return undefined.
        
        // ACTUALLY: If React Router has already set JSON headers and processed the response,
        // it means the response has already been sent to the client. entry.server.jsx
        // shouldn't even be called in this case. But if it is, we need to not render HTML.
        // The best approach: return a minimal response that won't break the client,
        // but log that something is wrong.
        
        if (shouldLogEntry) console.warn("[ENTRY] JSON headers but no actionData; returning 500.");
        return new Response(
          JSON.stringify({ success: false, error: "Request processing error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          },
        );
      }
    }
  }
  
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
        entryError(error);
        },
      },
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
