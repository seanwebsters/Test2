// Pricing and plan definitions. The prototype's checkout is a clearly labelled
// demo that flips the local plan; swap `subscribe` in the store for a real
// payment provider (e.g. Stripe Checkout / App Store / Play Billing) later.

export const PRICES = {
  monthly: { amount: 7.99, label: "£7.99/mo" },
  yearly: { amount: 59.99, label: "£59.99/yr" },
} as const;
