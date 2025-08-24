import { Coupon } from "../models/coupon.model.js";

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gt: new Date() }
    });

    res.json(coupons);
  } catch (error) {
    console.error("Get coupons error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expirationDate: { $gt: new Date() }
    });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found or expired" });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    res.json({
      message: "Coupon is valid",
      coupon: {
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        minimumAmount: coupon.minimumAmount,
        maxDiscount: coupon.maxDiscount
      }
    });
  } catch (error) {
    console.error("Validate coupon error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountPercentage,
      minimumAmount,
      maxDiscount,
      expirationDate,
      usageLimit
    } = req.body;

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercentage,
      minimumAmount,
      maxDiscount,
      expirationDate,
      usageLimit
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error("Create coupon error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Delete coupon error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
