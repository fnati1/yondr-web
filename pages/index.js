// pages/index.js

import { useState, useEffect } from "react";
import { auth } from "../lib/firebaseClient";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState("");
  const [referrals, setReferrals] = useState(0); // AGGIUNTO

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`/api/get-user-referral?uid=${firebaseUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUserReferralCode(data.referralCode || "");
        setReferrals(data.referrals || 0); // AGGIUNTO
      }
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      alert("Errore login: " + e.message);
    }
    setLoading(false);
  };

  const signup = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const res = await fetch("/api/create-user-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, referralCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio Firestore");
    } catch (e) {
      alert("Errore registrazione: " + e.message);
    }
    setLoading(false);
  };

  const startCheckout = async () => {
    if (!user) {
      alert("Devi essere loggato per abbonarti");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Errore nel checkout");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userReferralCode);
    alert("Codice copiato negli appunti!");
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto" }}>
      {!user ? (
        <>
          <h2>Login / Registrati</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="text"
            placeholder="Codice Referral (opzionale)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
          <button onClick={login} disabled={loading}>Login</button>
          <button onClick={signup} disabled={loading}>Registrati</button>
        </>
      ) : (
        <>
          <h2>Ciao, {user.email}</h2>

          {userReferralCode && (
            <div style={{ marginBottom: "1rem" }}>
              <p>
                Il tuo codice referral: <strong>{userReferralCode}</strong>
              </p>
              <p>
                Link da condividere: <br />
                <code>{`https://iltuosito.com/?ref=${userReferralCode}`}</code>
              </p>
              <p>Inviti effettuati: {referrals}/3</p> {/* AGGIUNTO */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://iltuosito.com/?ref=${userReferralCode}`);
                  alert("Link copiato negli appunti!");
                }}
              >
                Copia link
              </button>
            </div>
          )}

          <p>Abbonamento mensile 5,99€</p>
          <button onClick={startCheckout} disabled={loading}>Abbonati</button>
        </>
      )}
    </div>
  );
}
