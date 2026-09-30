require("dotenv").config();

const mongoose = require("mongoose");
const Supplier = require("../models/supplierModel");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected 🚀"))
  .catch(err => console.log(err));

const seedSuppliers = async () => {
  try {

    // check if already seeded
    const count = await Supplier.countDocuments();

    if (count > 0) {
      console.log("Suppliers already exist");
      process.exit();
    }

    const suppliers = [
      {
        name: "Samsung Supplier",
        company: "Samsung Electronics",
        email: "contact@samsung.com",
        phone: "+82 10 1234 5678",
        address: "South Korea",
        status: "active"
      },
      {
        name: "Nike Supplier",
        company: "Nike Inc",
        email: "supplier@nike.com",
        phone: "+1 555 234 567",
        address: "USA",
        status: "active"
      },
      {
        name: "IKEA Wholesale",
        company: "IKEA",
        email: "contact@ikea.com",
        phone: "+46 123 456",
        address: "Sweden",
        status: "inactive"
      },
      {
        name: "Apple Supplier",
        company: "Apple Inc",
        email: "supply@apple.com",
        phone: "+1 800 275 2273",
        address: "USA",
        status: "active"
      }
    ];

    await Supplier.insertMany(suppliers);

    console.log("✅ Suppliers seeded successfully");

    process.exit();

  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

seedSuppliers();