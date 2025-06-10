import { v4 as uuidv4 } from 'uuid';
import { admin, db } from '../../lib/firebase-admin'; // Assicurati di avere questo file e export

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Crea utente Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    const userId = userRecord.uid;

    // Genera referralCode
    const referralCode = uuidv4().substring(0, 8);

    // Salva in Firestore i dati utente
    await db.collection('users').doc(userId).set({
      isPremium: false,
      trialStartDate: new Date(),
      referrals: 0,
      referralCode,
    });

    return res.status(201).json({ userId, referralCode });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore creazione utente' });
  }
}
