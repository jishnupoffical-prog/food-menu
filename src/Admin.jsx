import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_PASSWORD, getProducts, getOrders, addProduct, isError, money,
} from "./api.js";

const emptyForm = { id: "", name: "", image: "", stock: 10, price: "", category: "regular" };

function Login({ onOk, toast }) {
  const [pw, setPw] = useState("");
  return (
    <div className="login-wrap">
      <form
        className="panel login-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (pw === ADMIN_PASSWORD) onOk();
          else toast("Wrong password", "err");
        }}
      >
        <h1>Admin login</h1>
        <p>Enter the admin password to manage products and orders.</p>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password"
            value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        <button className="btn primary" style={{ width: "100%" }} type="submit">Sign in</button>
        <p style={{ marginTop: 14 }}>
          <a href="#" style={{ color: "var(--accent)" }}>← Back to shop</a>
        </p>
      </form>
    </div>
  );
}

function Dashboard({ toast, onLogout }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("orders");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([getProducts(), getOrders()]);
      setProducts(p);
      setOrders(o);
    } catch (e) {
      toast("Load failed: " + e.message, "err");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const units = orders.reduce((s, o) => s + o.quantity, 0);
    const lowStock = products.filter((p) => p.stock <= 5).length;
    const byItem = {};
    orders.forEach((o) => (byItem[o.itemId] = (byItem[o.itemId] || 0) + o.quantity));
    const topId = Object.keys(byItem).sort((a, b) => byItem[b] - byItem[a])[0];
    const top = products.find((p) => p.id === topId);
    return [
      ["Revenue", money(revenue)],
      ["Orders", orders.length],
      ["Items sold", units],
      ["Products", products.length],
      ["Low / out of stock", lowStock],
      ["Best seller", top ? top.name : "—"],
    ];
  }, [orders, products]);

  const statuses = useMemo(() => [...new Set(orders.map((o) => o.status))], [orders]);

  const shownOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders
      .filter((o) => statusFilter === "all" || o.status === statusFilter)
      .filter((o) => {
        const p = products.find((x) => x.id === o.itemId);
        return `${o.id} ${o.itemId} ${p ? p.name : ""}`.toLowerCase().includes(q);
      })
      .slice()
      .reverse(); // newest first
  }, [orders, products, statusFilter, orderQuery]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const id = form.id.trim();
    if (products.some((x) => x.id === id)) return toast(`ID "${id}" already exists`, "err");
    setSaving(true);
    try {
      const res = await addProduct({ ...form, id });
      if (isError(res)) throw new Error(res?.error || "Failed");
      toast("Product added");
      setForm(emptyForm);
      await loadAll();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="container">
          <a href="#" className="brand">
            Tasty<span>Bites</span>{" "}
            <small style={{ color: "var(--muted)", fontWeight: 600 }}>Admin</small>
          </a>
          <nav className="nav">
            <button className="btn small" onClick={loadAll} disabled={loading}>↻ Refresh</button>
            <a href="#" className="btn small">View shop</a>
            <button className="btn small danger" onClick={onLogout}>Log out</button>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="stats">
          {stats.map(([k, v]) => (
            <div className="stat" key={k}><small>{k}</small><b>{v}</b></div>
          ))}
        </section>

        <div className="tabs">
          {["orders", "products"].map((t) => (
            <button key={t} className={"tab" + (tab === t ? " active" : "")}
              onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <section className="panel">
            <div className="row-actions">
              <select className="search" style={{ flex: "0 0 200px" }}
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="search" type="search" placeholder="Search order id or item…"
                value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Order</th><th>Item</th><th>Qty</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {!shownOrders.length && (
                    <tr><td colSpan={5} className="state-msg">No orders found.</td></tr>
                  )}
                  {shownOrders.map((o, i) => {
                    const p = products.find((x) => x.id === o.itemId);
                    return (
                      <tr key={o.id + "-" + i}>
                        <td><b>{o.id}</b></td>
                        <td>
                          {p ? p.name : o.itemId}{" "}
                          <small style={{ color: "var(--muted)" }}>({o.itemId})</small>
                        </td>
                        <td>{o.quantity}</td>
                        <td>{money(o.total)}</td>
                        <td><span className={"pill " + o.status}>{o.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "products" && (
          <section className="two-col">
            <div className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th></th><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th></tr>
                  </thead>
                  <tbody>
                    {!products.length && (
                      <tr><td colSpan={6} className="state-msg">No products yet.</td></tr>
                    )}
                    {products.map((p) => {
                      const cls = p.stock <= 0 ? "out" : p.stock <= 5 ? "low" : "ok";
                      return (
                        <tr key={p.id}>
                          <td>
                            {p.image
                              ? <img className="mini" src={p.image} alt=""
                                  onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                              : <div className="mini" />}
                          </td>
                          <td>{p.id}</td>
                          <td><b>{p.name}</b></td>
                          <td>{money(p.price)}</td>
                          <td><span className={"pill " + cls}>{p.stock}</span></td>
                          <td>{p.category}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <form className="panel" onSubmit={submit}>
              <h3 style={{ marginBottom: 14 }}>Add product</h3>
              <div className="field"><label>ID (e.g. a4)</label>
                <input value={form.id} onChange={setField("id")} required /></div>
              <div className="field"><label>Name</label>
                <input value={form.name} onChange={setField("name")} required /></div>
              <div className="field"><label>Image URL</label>
                <input type="url" placeholder="https://…" value={form.image} onChange={setField("image")} /></div>
              <div className="field"><label>Stock</label>
                <input type="number" min="0" value={form.stock} onChange={setField("stock")} required /></div>
              <div className="field"><label>Price</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={setField("price")} required /></div>
              <div className="field"><label>Category</label>
                <select value={form.category} onChange={setField("category")}>
                  <option value="regular">regular</option>
                  <option value="vip">vip</option>
                  <option value="vvip">vvip</option>
                </select>
              </div>
              <button className="btn primary" style={{ width: "100%" }} type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add product"}
              </button>
            </form>
          </section>
        )}
      </main>
    </>
  );
}

export default function Admin({ toast }) {
  const [authed, setAuthed] = useState(sessionStorage.getItem("admin") === "1");

  if (!authed) {
    return (
      <Login
        toast={toast}
        onOk={() => { sessionStorage.setItem("admin", "1"); setAuthed(true); }}
      />
    );
  }
  return (
    <Dashboard
      toast={toast}
      onLogout={() => { sessionStorage.removeItem("admin"); location.hash = ""; setAuthed(false); }}
    />
  );
}
