  require("dotenv").config();
  const mongoose = require("mongoose");
  const bcrypt = require("bcryptjs");

  // Models
  const User = require("../models/userModel");
  const Product = require("../models/productModel");
  const Order = require("../models/orderModel");

  const MONGO_URI = process.env.MONGO_URI;

  const USERS_COUNT = 20;
  const PRODUCTS_COUNT = 50;
  const ORDERS_COUNT = 80;

  const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const firstNames = [
    "Ahmed",
    "Mohamed",
    "Ali",
    "Yassine",
    "Omar",
    "Amine",
    "Karim",
    "Sami",
    "Hatem",
    "Walid",
    "Adam",
    "Mehdi",
    "Rayen",
    "Anis",
    "Nour",
  ];

  const lastNames = [
    "Ben Ali",
    "Trabelsi",
    "Mansour",
    "Hammami",
    "Jaziri",
    "Ayari",
    "Gharbi",
    "Khalfallah",
    "Bouzid",
    "Chaabane",
  ];

  const productNames = [
    "iPhone",
    "MacBook",
    "AirPods",
    "Keyboard",
    "Monitor",
    "Mouse",
    "Chair",
    "Desk",
    "Camera",
    "Speaker",
  ];

  const categories = [
    "Electronics",
    "Clothing",
    "Home & Garden",
    "Sports",
    "Other",
  ];

  // =========================
  // CONNECT DATABASE
  // =========================

  async function connectDB() {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  }

  // =========================
  // CLEAR DATABASE
  // =========================

  async function clearDB() {
    await Promise.all([
      User.deleteMany(),
      Product.deleteMany(),
      Order.deleteMany(),
    ]);

    console.log("🗑 Database cleared");
  }

  // =========================
  // SEED USERS
  // =========================

  async function seedUsers() {
    const users = [];

    const hashedPassword = await bcrypt.hash("123456", 10);

    for (let i = 1; i <= USERS_COUNT; i++) {
      const firstName = random(firstNames);
      const lastName = random(lastNames);

      users.push({
        name: `${firstName} ${lastName}`,
        email: `user${i}@test.com`,
        password: hashedPassword,

        role: i === 1 ? "admin" : "user",

        // Customer status
        status: i % 5 === 0 ? "inactive" : "active",

        // Nombre de commandes
        ordersCount: Math.floor(Math.random() * 20),

        // Montant total dépensé
        totalSpent: Math.floor(Math.random() * 10000),
      });
    }

    const created = await User.insertMany(users);

    console.log(`✅ ${created.length} users created`);

    return created;
  }

  // =========================
  // SEED PRODUCTS
  // =========================

  // =========================
  // SEED PRODUCTS
  // =========================

  async function seedProducts() {
    const products = [];

    const descriptions = [
      "Produit de haute qualité, idéal pour un usage quotidien.",
      "Conçu avec des matériaux durables et une finition soignée.",
      "Un excellent rapport qualité-prix, plébiscité par nos clients.",
      "Parfait pour un usage professionnel comme personnel.",
      "Livré avec une garantie satisfaction et un support réactif.",
    ];

    for (let i = 1; i <= PRODUCTS_COUNT; i++) {
      const productName = random(productNames);

      products.push({
        name: `${productName} ${i}`,
        description: `${random(descriptions)} (${productName})`,
        price: Math.floor(Math.random() * 1000) + 50,
        stock: Math.floor(Math.random() * 100),
        category: random(categories),
        image: "https://via.placeholder.com/300",
      });
    }

    const created = await Product.insertMany(products);

    console.log(`✅ ${created.length} products created`);

    return created;
  }

  // =========================
  // SEED ORDERS
  // =========================

async function seedOrders(users, products) {
  const orders = [];

  for (let i = 0; i < ORDERS_COUNT; i++) {
    const user = random(users);
    const itemsCount = Math.floor(Math.random() * 4) + 1;

    const orderProducts = [];
    let total = 0;

    for (let j = 0; j < itemsCount; j++) {
      const product = random(products);
      const quantity = Math.floor(Math.random() * 3) + 1;
      total += product.price * quantity;

      orderProducts.push({
        productId: product._id,
        quantity,
        price: product.price,
      });
    }

    orders.push({
      orderNumber: `CMD-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}`,
      userId: user._id,
      products: orderProducts,
      totalPrice: total,
      status: random(["pending", "paid", "shipped", "cancelled", "delivered"]),
    });
  }

  const created = await Order.insertMany(orders);
  console.log(`✅ ${created.length} orders created`);
  return created;
}

  // =========================
  // SEED ALL
  // =========================

  async function seedAll() {
    try {
      await connectDB();

      await clearDB();

      const users = await seedUsers();

      const products = await seedProducts();

      await seedOrders(users, products);

      console.log("🎉 Seeding completed successfully");

      process.exit(0);
    } catch (err) {
      console.error("❌ Seed error:", err);

      process.exit(1);
    }
  }

  seedAll();  