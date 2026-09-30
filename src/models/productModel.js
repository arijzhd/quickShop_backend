const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },

  price: {
    type: Number,
    required: true
  },

  stock: {
    type: Number,
    default: 0
  },

  category: {
    type: String,
    enum: [
      "Electronics",
      "Clothing",
      "Home & Garden",
      "Sports",
      "Other"
    ],
    default: "Other"
  },

  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  },

  sold: {
    type: Number,
    default: 0
  },

  images: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);