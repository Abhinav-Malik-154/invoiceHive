import Razorpay from "razorpay";

// Single shared Razorpay instance — reused across all controllers
// key_id and key_secret come from environment variables
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default razorpay;