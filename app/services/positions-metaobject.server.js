/**
 * Sync BlockPosition records to theme_stream_position metaobject entries.
 * Uses a position_handle field (not Shopify system handle) to reliably
 * match positions, avoiding issues with Shopify auto-suffixing handles.
 */
import { logger } from "../utils/logger.server";

const METAOBJECT_TYPE = "$app:theme_stream_position";

/**
 * Ensure theme_stream_position metaobject definition exists with correct
 * fields (name, description, position_handle) and displayNameKey = "name".
 */
export async function ensureSchedulerPositionDefinition(admin) {
  try {
    const checkRes = await admin.graphql(
      `#graphql
      query($type: String!) {
        metaobjectDefinitionByType(type: $type) {
          id type name displayNameKey
          fieldDefinitions { key name type { name } }
        }
      }`,
      { variables: { type: METAOBJECT_TYPE } },
    );
    const checkJson = await checkRes.json();
    const def = checkJson?.data?.metaobjectDefinitionByType;

    if (def?.id) {
      logger.info("[position_def] exists: type=%s id=%s", def.type, def.id);
      const updates = [];
      if (def.displayNameKey !== "name") updates.push("displayNameKey");
      const existingKeys = (def.fieldDefinitions || []).map((f) => f.key);
      const fieldUpdates = [];
      if (!existingKeys.includes("position_handle")) {
        fieldUpdates.push({
          create: { key: "position_handle", name: "Position Handle", type: "single_line_text_field" },
        });
      }
      if (updates.length || fieldUpdates.length) {
        try {
          const defInput = {};
          if (updates.includes("displayNameKey")) defInput.displayNameKey = "name";
          if (fieldUpdates.length) defInput.fieldDefinitions = fieldUpdates;
          await admin.graphql(
            `#graphql
            mutation($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
              metaobjectDefinitionUpdate(id: $id, definition: $definition) {
                metaobjectDefinition { id displayNameKey }
                userErrors { field message }
              }
            }`,
            { variables: { id: def.id, definition: defInput } },
          );
          logger.info("[position_def] Updated definition: %s", updates.concat(fieldUpdates.map((f) => f.create?.key)).join(", "));
        } catch (e) {
          logger.warn("[position_def] Could not update definition:", e);
        }
      }
      return { ok: true };
    }

    logger.info("[position_def] Creating theme_stream_position definition");
    const createRes = await admin.graphql(
      `#graphql
      mutation($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition { id type name }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          definition: {
            type: METAOBJECT_TYPE,
            name: "Theme Stream Position",
            displayNameKey: "name",
            fieldDefinitions: [
              { key: "name", name: "Name", type: "single_line_text_field" },
              { key: "description", name: "Description", type: "multi_line_text_field" },
              { key: "position_handle", name: "Position Handle", type: "single_line_text_field" },
            ],
            access: { admin: "MERCHANT_READ_WRITE", storefront: "PUBLIC_READ" },
          },
        },
      },
    );
    const createJson = await createRes.json();
    const errs = createJson?.data?.metaobjectDefinitionCreate?.userErrors;
    if (errs?.length) {
      const msg = errs.map((e) => e.message).join(", ");
      if (msg.includes("taken") || msg.includes("TAKEN") || msg.includes("already exists")) {
        return { ok: true };
      }
      logger.warn("[position_def] create errors:", errs);
      return { ok: false, error: msg };
    }
    logger.info("[position_def] Created successfully");
    return { ok: true };
  } catch (e) {
    logger.error("[position_def] error:", e);
    return { ok: false, error: e.message };
  }
}

/** Fetch all existing position metaobjects with pagination */
async function fetchAllPositionMetaobjects(admin) {
  const all = [];
  let after = null;
  do {
    const res = await admin.graphql(
      `#graphql
      query($type: String!, $first: Int!, $after: String) {
        metaobjects(type: $type, first: $first, after: $after) {
          nodes { id handle fields { key value } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { variables: { type: METAOBJECT_TYPE, first: 50, after } },
    );
    const json = await res.json();
    const data = json?.data?.metaobjects;
    if (!data) break;
    all.push(...(data.nodes ?? []));
    if (!data.pageInfo?.hasNextPage) break;
    after = data.pageInfo.endCursor;
  } while (true);
  return all;
}

function getField(mo, key) {
  return (mo.fields || []).find((f) => f.key === key)?.value || "";
}

/**
 * Sync all DB positions to metaobjects.
 *
 * Strategy: match existing metaobjects to positions by the position_handle
 * field (falling back to name match). This avoids the Shopify handle-suffixing
 * problem. We never delete-and-recreate — instead we reuse existing metaobjects
 * and update their fields. Only truly orphaned metaobjects (matching no position
 * by handle or name) are deleted.
 */
export async function syncAllPositionsToMetaobjects(admin, positions) {
  let existing;
  try {
    existing = await fetchAllPositionMetaobjects(admin);
  } catch (e) {
    logger.warn("[sync] Failed to fetch existing metaobjects:", e);
    return;
  }

  logger.info("[sync] Found %d existing position metaobject(s)", existing.length);
  for (const mo of existing) {
    logger.info("[sync]   sysHandle=%s name=%s posHandle=%s id=%s",
      mo.handle, getField(mo, "name"), getField(mo, "position_handle"), mo.id);
  }

  const positionsByHandle = new Map((positions || []).map((p) => [p.handle, p]));

  // Phase 1: Match each position to an existing metaobject.
  // Priority: position_handle field match > name match.
  const matched = new Map();
  const usedMoIds = new Set();

  for (const p of positions || []) {
    let best = null;
    for (const mo of existing) {
      if (usedMoIds.has(mo.id)) continue;
      if (getField(mo, "position_handle") === p.handle) { best = mo; break; }
    }
    if (!best) {
      for (const mo of existing) {
        if (usedMoIds.has(mo.id)) continue;
        if (getField(mo, "name") === p.name) { best = mo; break; }
      }
    }
    if (best) {
      matched.set(p.handle, best);
      usedMoIds.add(best.id);
    }
  }

  // Phase 2: Delete unmatched (orphan) metaobjects
  for (const mo of existing) {
    if (usedMoIds.has(mo.id)) continue;
    try {
      await admin.graphql(
        `#graphql
        mutation($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { field message } } }`,
        { variables: { id: mo.id } },
      );
      logger.info("[sync] Deleted orphan: sysHandle=%s name=%s", mo.handle, getField(mo, "name"));
    } catch (e) {
      logger.warn("[sync] Failed to delete orphan:", mo.handle, e);
    }
  }

  // Phase 3: Update matched or create new metaobjects
  for (const p of positions || []) {
    const fields = [
      { key: "name", value: p.name },
      { key: "position_handle", value: p.handle },
      ...(p.description != null ? [{ key: "description", value: p.description || "" }] : []),
    ];

    const mo = matched.get(p.handle);
    if (mo) {
      try {
        await admin.graphql(
          `#graphql
          mutation($id: ID!, $metaobject: MetaobjectUpdateInput!) {
            metaobjectUpdate(id: $id, metaobject: $metaobject) {
              metaobject { id }
              userErrors { field message }
            }
          }`,
          { variables: { id: mo.id, metaobject: { fields } } },
        );
        logger.info("[sync] Updated: %s (sysHandle=%s)", p.handle, mo.handle);
      } catch (e) {
        logger.warn("[sync] Failed to update:", p.handle, e);
      }
    } else {
      try {
        const res = await admin.graphql(
          `#graphql
          mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
            metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
              metaobject { id handle }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              handle: { type: METAOBJECT_TYPE, handle: p.handle },
              metaobject: { fields },
            },
          },
        );
        const json = await res.json();
        const errs = json?.data?.metaobjectUpsert?.userErrors;
        if (errs?.length) {
          logger.warn("[sync] Upsert errors for %s: %s", p.handle, JSON.stringify(errs));
        } else {
          const created = json?.data?.metaobjectUpsert?.metaobject;
          logger.info("[sync] Upserted: %s (sysHandle=%s)", p.handle, created?.handle);
        }
      } catch (e) {
        logger.warn("[sync] Failed to upsert:", p.handle, e);
      }
    }
  }
}

/** Delete metaobject entry by handle */
export async function deletePositionMetaobject(admin, handle) {
  try {
    const listRes = await admin.graphql(
      `#graphql
      query($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) { id }
      }`,
      { variables: { handle: { type: METAOBJECT_TYPE, handle } } },
    );
    const listJson = await listRes.json();
    const node = listJson?.data?.metaobjectByHandle;
    if (!node) return true;

    const delRes = await admin.graphql(
      `#graphql
      mutation($id: ID!) {
        metaobjectDelete(id: $id) { deletedId userErrors { field message } }
      }`,
      { variables: { id: node.id } },
    );
    const delJson = await delRes.json();
    const errs = delJson?.data?.metaobjectDelete?.userErrors;
    if (errs?.length) {
      logger.warn("[sync] deletePositionMetaobject errors:", errs);
      return false;
    }
    return true;
  } catch (e) {
    logger.warn("[sync] deletePositionMetaobject error:", e);
    return false;
  }
}
