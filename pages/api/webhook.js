// pages/api/webhook.js

import { buffer } from 'micro';
import Stripe from 'stripe';
import { admin, firestore } from '@/lib/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // ✅ Quando la sessione di checkout è completata
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const uid = session.metadata.uid;

    const now = new Date();
    const premiumExpires = new Date(now.setMonth(now.getMonth() + 1));

    await admin.firestore().collection('users').doc(uid).update({
      isPremium: true,
      premiumExpires,
    });
  }

  // ✅ Quando Stripe rinnova l'abbonamento (evento mensile)
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;

    // UID salvato in metadata del subscription
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const uid = subscription.metadata?.uid;

    if (!uid) {
      console.warn('UID mancante nei metadata della subscription');
      return res.status(200).end();
    }

    try {
      // Controlla i referral
      const userDoc = await firestore.collection('users').doc(uid).get();
      const data = userDoc.data();
      const referrals = data?.referrals || 0;

      // Determina il nuovo prezzo
      const newPriceId =
        referrals >= 3
          ? process.env.STRIPE_DISCOUNT_PRICE_ID
          : process.env.STRIPE_FULL_PRICE_ID;

      // Crea nuova subscription
      await stripe.subscriptions.create({
        customer: invoice.customer,
        items: [{ price: newPriceId }],
        metadata: { uid },
        cancel_at_period_end: true,
      });

      // Annulla la subscription attuale alla fine del periodo
      await stripe.subscriptions.update(invoice.subscription, {
        cancel_at_period_end: true,
      });

      console.log(`🔁 Creato nuovo abbonamento per ${uid} con prezzo ${newPriceId}`);
    } catch (err) {
      console.error('Errore nel rinnovo dinamico:', err);
    }
  }

  res.status(200).end();
}
