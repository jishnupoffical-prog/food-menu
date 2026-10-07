import { useEffect, useMemo, useState } from "react";
import { getProducts, placeOrder, isError, money } from "./api.js";

function loadCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "{}"); }
  catch { return {}; }
}

function Img({ src, alt = "" }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <>🍽️</>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} />;
}

export default function Shop({ toast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState(loadCart); // { productId: qty }
  const [open, setOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // load products
  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // persist cart
  useEffect(() => {
    try { localStorage.setItem("cart", JSON.stringify(cart)); } catch {}
  }, [cart]);

  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category))],
    [products]
  );

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          p.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [products, cat, query]
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty }))
        .filter((l) => l.p),
    [cart, products]
  );
  const count = cartLines.reduce((s, l) => s + l.qty, 0);
  const total = cartLines.reduce((s, l) => s + l.p.price * l.qty, 0);

  function change(id, delta) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const next = (cart[id] || 0) + delta;
    if (next > p.stock) return toast(`Only ${p.stock} in stock`, "err");
    setCart((c) => {
      const n = { ...c };
      if (next <= 0) delete n[id];
      else n[id] = next;
      return n;
    });
    if (delta > 0 && !cart[id]) toast(p.name + " added");
  }

  async function checkout() {
    if (!cartLines.length) return;
    setOrdering(true);
    let ok = 0;
    const done = [];

    // one order per cart line (your API orders one item at a time)
    for (const { p, qty } of cartLines) {
      try {
        const res = await placeOrder(p.id, qty);
        if (isError(res)) toast(`${p.name}: ${res?.error || "failed"}`, "err");
        else { ok++; done.push(p.id); }
      } catch (e) {
        toast(`${p.name}: ${e.message}`, "err");
      }
    }

    setCart((c) => {
      const n = { ...c };
      done.forEach((id) => delete n[id]);
      return n;
    });
    if (ok) toast(`${ok} item${ok > 1 ? "s" : ""} ordered successfully`);

    // refresh stock from the sheet
    try { setProducts(await getProducts()); } catch {}
    setOrdering(false);
    if (ok === cartLines.length) setOpen(false);
  }

  return (
    <>
      <header className="topbar">
        <div className="container">
          <a href="#" className="brand">Tasty<span>Bites</span></a>
          <nav className="nav">
            <a href="#admin" className="btn small">Admin</a>
            <button className="btn cart-btn" onClick={() => setOpen(true)}>
              🛒 Cart <span className="cart-count">{count}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1>Fresh food, <em>fast</em> to your table.</h1>
          <p>Pick your favourites, add them to the cart and place your order in a few taps.</p>
        </section>

        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Search food…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips">
            {categories.map((c) => (
              <button
                key={c}
                className={"chip" + (c === cat ? " active" : "")}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <section className="grid">
          {loading && (<><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></>)}
          {!loading && error && (
            <div className="state-msg">Could not load products.<br />{error}</div>
          )}
          {!loading && !error && !visible.length && (
            <div className="state-msg">No items found.</div>
          )}
          {visible.map((p) => {
            const out = p.stock <= 0;
            const low = !out && p.stock <= 5;
            return (
              <article className="card" key={p.id}>
                <div className="img">
                  <Img src={p.image} alt={p.name} />
                  <span className={"badge" + (p.category === "vip" ? " vip" : "")}>
                    {p.category}
                  </span>
                </div>
                <div className="body">
                  <h3>{p.name}</h3>
                  <span className={"stock" + (out ? " out" : low ? " low" : "")}>
                    {out ? "Out of stock" : low ? `Only ${p.stock} left` : `${p.stock} in stock`}
                  </span>
                  <div className="foot">
                    <span className="price">{money(p.price)}</span>
                    <button className="btn primary small" disabled={out} onClick={() => change(p.id, 1)}>
                      Add
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {/* Cart drawer */}
      <div className={"overlay" + (open ? " open" : "")} onClick={() => setOpen(false)} />
      <aside className={"drawer" + (open ? " open" : "")} aria-label="Cart">
        <header>
          <h2>Your cart</h2>
          <button className="btn small" onClick={() => setOpen(false)}>Close</button>
        </header>
        <div className="items">
          {!cartLines.length && <div className="empty">Your cart is empty.</div>}
          {cartLines.map(({ p, qty }) => (
            <div className="line" key={p.id}>
              <div className="thumb"><Img src={p.image} /></div>
              <div className="info">
                <b>{p.name}</b>
                <small>{money(p.price)} each</small>
              </div>
              <div className="qty">
                <button onClick={() => change(p.id, -1)}>−</button>
                <b>{qty}</b>
                <button onClick={() => change(p.id, 1)}>+</button>
              </div>
              <b>{money(p.price * qty)}</b>
            </div>
          ))}
        </div>
        <footer>
          <div className="total-row"><span>Total</span><span>{money(total)}</span></div>
          <button
            className="btn primary"
            style={{ width: "100%" }}
            disabled={!cartLines.length || ordering}
            onClick={checkout}
          >
            {ordering ? "Placing order…" : "Place order"}
          </button>
        </footer>
      </aside>
    </>
  );
}
