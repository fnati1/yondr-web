// pages/api/create-user-doc.js

import { admin, db } from "../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { uid, referralCode } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "UID mancante" });
  }

  try {
    const { v4: uuidv4 } = await import("uuid");
    const generatedReferralCode = uuidv4().substring(0, 8);

    // Crea documento utente in Firestore
    await db.collection("users").doc(uid).set({
      isPremium: false,
      trialStartDate: new Date(),
      referrals: 0,
      referralCode: generatedReferralCode,
    });

    // Se è stato usato un referralCode, aggiorna il conteggio del referente
    if (referralCode) {
      const refSnapshot = await db
        .collection("users")
        .where("referralCode", "==", referralCode)
        .limit(1)
        .get();

      if (!refSnapshot.empty) {
        const referrerDoc = refSnapshot.docs[0];
        const referrerId = referrerDoc.id;

        await db.collection("users").doc(referrerId).update({
          referrals: admin.firestore.FieldValue.increment(1),
        });
      }
    }

    res.status(200).json({ message: "Utente salvato con successo" });
  } catch (error) {
    console.error("Errore Firestore:", error);
    res.status(500).json({ error: "Errore durante il salvataggio su Firestore" });
  }
}
