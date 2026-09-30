const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      quantity: Number,
      price: Number
    }
  ],

  totalPrice: Number,

  status: {
    type: String,
    enum: ["pending", "paid", "shipped", "cancelled", "delivered"],
    default: "pending"
  }
}, {
  timestamps: true
});

// Hook AVANT la compilation du modèle
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments()
    this.orderNumber = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`
  }
  next()
})
// const weeklyStats = await Order.aggregate([
//   { $match: { createdAt: { $gte: startOfWeek } } },
//   { $group: {
//       _id: { $dayOfWeek: "$createdAt" },
//       revenue: { $sum: "$totalPrice" },
//       orders: { $sum: 1 }
//   }},
//   { $sort: { _id: 1 } }
// ])

module.exports = mongoose.model("Order", orderSchema);