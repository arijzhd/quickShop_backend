const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String
  },

  phone: {
    type: String
  },

  company: {
    type: String
  },

  address: {
    type: String
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Supplier", supplierSchema);