// pages/api/get-user-referral.js

import { db } from "../../lib/firebase-admin";

export default async function handler(req, res) {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "UID mancante" });

  try {
    const docRef = db.collection("users").doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    const userData = docSnap.data();
    res.status(200).json({
      referralCode: userData.referralCode || "",
      referrals: userData.referrals || 0, // AGGIUNTO
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore durante il recupero del codice referral" });
  }
}
