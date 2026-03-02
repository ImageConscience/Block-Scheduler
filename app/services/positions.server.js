import prisma from "../db.server";

/** Convert name to Shopify-style handle: lowercase, spaces to hyphens, alphanumeric + hyphens only */
function handleize(name) {
  if (!name || typeof name !== "string") return "position";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "position";
}

/** Get unique handle for a new position; if base exists, append -2, -3, etc. */
async function getUniqueHandle(shop, baseHandle) {
  let handle = baseHandle;
  let n = 1;
  while (true) {
    const existing = await prisma.blockPosition.findFirst({
      where: { shop, handle },
    });
    if (!existing) return handle;
    n += 1;
    handle = `${baseHandle}-${n}`;
  }
}

/** Ensure default position exists for shop. Call on load. */
export async function ensureDefaultPosition(shop) {
  const existing = await prisma.blockPosition.findFirst({
    where: { shop, handle: "homepage_banner" },
  });
  if (existing) {
    if (existing.name === "Homepage Banner") {
      return prisma.blockPosition.update({
        where: { id: existing.id },
        data: { name: "Uncategorized", description: "Default position for scheduled content" },
      });
    }
    return existing;
  }
  return prisma.blockPosition.create({
    data: {
      shop,
      name: "Uncategorized",
      description: "Default position for scheduled content",
      handle: "homepage_banner",
    },
  });
}

/** List all positions for a shop */
export async function listPositions(shop) {
  await ensureDefaultPosition(shop);
  return prisma.blockPosition.findMany({
    where: { shop },
    orderBy: { name: "asc" },
  });
}

/** Get position by handle for a shop */
export async function getPositionByHandle(shop, handle) {
  return prisma.blockPosition.findFirst({
    where: { shop, handle },
  });
}

/** Create a new position. Handle is handleized from name (e.g. "Homepage Banner" -> "homepage-banner"). */
export async function createPosition(shop, { name, description }) {
  const baseHandle = handleize(name || "Position");
  const handle = await getUniqueHandle(shop, baseHandle);
  return prisma.blockPosition.create({
    data: { shop, name: (name || "Position").trim(), description: description || null, handle },
  });
}

/** Update a position */
export async function updatePosition(shop, id, { name, description }) {
  const existing = await prisma.blockPosition.findFirst({ where: { id, shop } });
  if (!existing) return null;
  return prisma.blockPosition.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(description !== undefined && { description }),
    },
  });
}

/** Delete a position */
export async function deletePosition(shop, id) {
  const existing = await prisma.blockPosition.findFirst({ where: { id, shop } });
  if (!existing) return null;
  return prisma.blockPosition.delete({ where: { id } });
}
