require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/userModel");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

const seedAdmin = async () => {
  try {

    // check if admin already exists
    const existingAdmin = await User.findOne({
      email: "admin@gmail.com"
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    // hash password
    const hashedPassword = await bcrypt.hash("Admin.135*", 10);

    // create admin
    await User.create({
      name: "Main Admin",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin created successfully 🚀");

    process.exit();

  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

seedAdmin();