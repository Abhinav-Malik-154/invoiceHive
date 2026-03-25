import Stripe from "stripe";

// Single shared Stripe instance — reused across all controllers
// apiVersion pinned so Stripe API changes don't silently break things
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: false,
});

export default stripe;