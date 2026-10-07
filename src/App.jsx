import { useCallback, useEffect, useState } from "react";
import Shop from "./Shop.jsx";
import Admin from "./Admin.jsx";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(location.hash === "#admin");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onHash = () => {
      setIsAdmin(location.hash === "#admin");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = isAdmin ? "Admin – Tasty Bites" : "Tasty Bites – Order Online";
  }, [isAdmin]);

  const toast = useCallback((msg, type = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <>
      {isAdmin ? <Admin toast={toast} /> : <Shop toast={toast} />}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.type}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}
