import express from "express";
import {
  getCoupons,
  validateCoupon,
  createCoupon,
  deleteCoupon
} from "../controllers/coupon.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getCoupons);
router.post("/validate", protectRoute, validateCoupon);
router.post("/", protectRoute, adminRoute, createCoupon);
router.delete("/:id", protectRoute, adminRoute, deleteCoupon);

export default router;