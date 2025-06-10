// pages/api/register.js

import { v4 as uuidv4 } from "uuid";
import { admin, db } from "../../lib/firebaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e password richieste" });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    const userId = userRecord.uid;
    const referralCode = uuidv4().substring(0, 8);

    await db.collection("users").doc(userId).set({
      isPremium: false,
      trialStartDate: new Date(),
      referrals: 0,
      referralCode,
    });

    return res.status(201).json({ userId, referralCode });
  } catch (error) {
    console.error("Errore creazione utente:", error);
    return res.status(500).json({ error: "Errore creazione utente" });
  }
}
