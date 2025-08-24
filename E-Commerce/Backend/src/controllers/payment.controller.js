import { Coupon } from "../models/coupon.model.js";

// Create checkout session without Stripe
export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }

    // Calculate total amount
    let totalAmount = 0;
    products.forEach(product => {
      totalAmount += product.price * (product.quantity || 1);
    });

    // Check for coupon
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expirationDate: { $gt: new Date() }
      });

      if (coupon && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
        totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
      } else {
        coupon = null; // invalid coupon
      }
    }

    // If order total exceeds threshold, generate new coupon
    if (totalAmount >= 200) {  // (200 = $200 if you treat amount in normal units)
      await createNewCoupon();
    }

    // Simulate sessionId (since no Stripe)
    const fakeSessionId = "session_" + Math.random().toString(36).substring(2, 12);

    res.status(200).json({
      id: fakeSessionId,
      totalAmount,
      appliedCoupon: coupon ? coupon.code : null
    });
  } catch (error) {
    console.error("Create checkout session error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Fake checkout success endpoint
export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId, couponCode } = req.body;

    // Just simulate payment success (since no Stripe)
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }

    // Clear user cart
    req.user.cartItems = [];
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Payment successful (simulated), order created, and coupon usage updated if applicable."
    });
  } catch (error) {
    console.error("Checkout success error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Create new coupon if threshold met
const createNewCoupon = async () => {
  try {
    const newCoupon = new Coupon({
      code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      discountPercentage: 10,
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      usageLimit: 1,
      isActive: true
    });

    await newCoupon.save();
    console.log("New coupon created:", newCoupon.code);
    return newCoupon;
  } catch (error) {
    console.error("Error creating new coupon:", error);
  }
};
