import { Product } from "../models/product.model.js";

export const getCartProducts = async (req, res) => {
  try {
    const products = await Product.find({ _id: { $in: req.user.cartItems.map(item => item.product) } });

    const cartItems = req.user.cartItems.map(cartItem => {
      const product = products.find(product => product._id.toString() === cartItem.product.toString());
      return { ...product.toJSON(), quantity: cartItem.quantity };
    });

    res.json(cartItems);
  } catch (error) {
    console.error("Get cart products error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find(item => item.product.toString() === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId });
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.error("Add to cart error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    if (!productId) {
      user.cartItems = [];
    } else {
      user.cartItems = user.cartItems.filter(item => item.product.toString() !== productId);
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.error("Remove from cart error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find(item => item.product.toString() === productId);

    if (existingItem) {
      if (quantity === 0) {
        user.cartItems = user.cartItems.filter(item => item.product.toString() !== productId);
      } else {
        existingItem.quantity = quantity;
      }

      await user.save();
      res.json(user.cartItems);
    } else {
      res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("Update quantity error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
