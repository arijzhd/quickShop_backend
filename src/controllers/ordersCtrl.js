const mongoose = require("mongoose");
const Orders = require("../models/orderModel");
const Product = require("../models/productModel");

/**
 * CREATE ORDER — vérifie le stock, décrémente le stock, incrémente "sold"
 * (sans transaction MongoDB — nécessite un rollback manuel en cas d'échec partiel)
 */
const createOrder = async (req, res) => {
  const { products, totalPrice } = req.body;
  const userId = req.user?.id || req.user?._id;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ success: false, message: "Panier vide" });
  }

  const decremented = []; // garde la trace de ce qui a été décrémenté, pour rollback si besoin

  try {
    // 1. Vérifier le stock ET décrémenter atomiquement, produit par produit
    for (const item of products) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, sold: item.quantity } },
        { new: true }
      );

      if (!updated) {
        const product = await Product.findById(item.productId);
        const msg = product
          ? `Stock insuffisant pour "${product.name}" (disponible: ${product.stock})`
          : "6uvable";
        throw new Error(msg);
      }

      decremented.push({ productId: item.productId, quantity: item.quantity });
    }

    // 2. Créer la commande
    const order = await Orders.create({
      userId,
      products,
      totalPrice,
      status: "pending",
    });

    const populatedOrder = await Orders.findById(order._id)
      .populate("userId", "name email")
      .populate("products.productId", "name price category images");

    return res.status(201).json({ success: true, order: populatedOrder });
  } catch (err) {
    // Rollback manuel : restaurer le stock déjà décrémenté avant l'échec
    if (decremented.length > 0) {
      await Promise.all(
        decremented.map((d) =>
          Product.findByIdAndUpdate(d.productId, {
            $inc: { stock: d.quantity, sold: -d.quantity },
          })
        )
      );
    }

    console.error("Create order error:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Orders.find()
      .populate("userId", "name email")
      .populate("products.productId", "name price category images")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {  
  getOrders,
  createOrder,
};