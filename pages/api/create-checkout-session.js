// pages/api/create-checkout-session.js

import Stripe from 'stripe';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'UID mancante' });
  }

  try {
    // Recupera referrals da Firestore
    const userSnap = await getDoc(doc(firestore, 'users', uid));
    const referrals = userSnap.exists() ? userSnap.data().referrals || 0 : 0;

    // Scegli il prezzo in base ai referrals
    const priceId = referrals >= 3
      ? process.env.STRIPE_DISCOUNT_PRICE_ID // es: 3,99 €
      : process.env.STRIPE_FULL_PRICE_ID;    // es: 5,99 €

    // Crea la sessione di checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        cancel_at_period_end: true,  // termina dopo un ciclo
        metadata: { uid },           // utile nel webhook per creare nuovo abbonamento
      },
      success_url: 'https://www.yondr-site.com/success',
      cancel_url: 'https://www.yondr-site.com/cancel',
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Errore create checkout:', error);
    res.status(500).json({ error: 'Errore nella creazione della sessione' });
  }
}
