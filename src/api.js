/* ============================================================
   CONFIG – change these values only
   ============================================================ */
export const API_URL =
  "https://script.google.com/macros/s/AKfycbyuqQgLayOVDagAxVcDUBDE9ug-ZAYFszUMXujcx4PEIriQuFz9bAOj07drJdvtsW-C/exec";

// Front-end password for the admin page (NOT real security)
export const ADMIN_PASSWORD = "admin123";

export const CURRENCY = "₹";

/* ============================================================
   Helpers
   ============================================================ */
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

function pick(obj, names, fallback = "") {
  const map = {};
  Object.keys(obj || {}).forEach((k) => (map[norm(k)] = obj[k]));
  for (const n of names) {
    const v = map[norm(n)];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function toArray(res, key) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res[key])) return res[key];
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}

export const money = (n) => CURRENCY + Number(n || 0).toLocaleString("en-IN");

/* ============================================================
   API calls
   ============================================================ */
async function apiGet(action) {
  const r = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
  if (!r.ok) throw new Error("Network error " + r.status);
  return r.json();
}

// text/plain avoids the CORS preflight that Apps Script cannot answer
async function apiPost(body) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Network error " + r.status);
  return r.json();
}

function normProduct(p) {
  return {
    id: String(pick(p, ["id"])),
    name: String(pick(p, ["name"], "Unnamed")),
    image: String(pick(p, ["image", "img", "photo"])),
    stock: Number(pick(p, ["stock", "qty"], 0)),
    price: Number(pick(p, ["prize", "price"], 0)),
    category: String(pick(p, ["category", "catogary", "type"], "regular")).toLowerCase(),
  };
}

function normOrder(o) {
  return {
    id: String(pick(o, ["id", "orderid"])),
    itemId: String(pick(o, ["itemid", "item id", "item"])),
    quantity: Number(pick(o, ["quntity", "quantity", "qty"], 0)),
    total: Number(pick(o, ["totalamount", "total amount", "total"], 0)),
    status: String(pick(o, ["stutus", "status"], "pending")).toLowerCase(),
  };
}

export async function getProducts() {
  return toArray(await apiGet("products"), "products").map(normProduct);
}

export async function getOrders() {
  return toArray(await apiGet("orders"), "orders").map(normOrder);
}

export const placeOrder = (itemId, quantity) =>
  apiPost({ action: "order", itemId, quantity });

export const addProduct = (p) =>
  apiPost({
    action: "product",
    id: p.id,
    name: p.name,
    image: p.image,
    stock: Number(p.stock),
    prize: Number(p.price), // your script uses "prize"
    category: p.category,
  });

export const isError = (res) => !res || res.success === false || !!res.error;
