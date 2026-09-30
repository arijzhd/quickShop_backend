const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authCtrl = {

  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied (not admin)" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        message: "Admin logged in successfully",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address,
          phone: user.phone,
          gouvernorat: user.gouvernorat,
          codePostal: user.codePostal,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

    registerUser: async (req, res) => {
      try {
        const { name, email, password, address, phone, gouvernorat, codePostal } = req.body;
  console.log("Registering user with data:", { name, email, password, address, phone, gouvernorat, codePostal });
        const existing = await User.findOne({ email });
        if (existing) {
          return res.status(400).json({ message: "Email déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
          name,
          email,
          password: hashedPassword,
          role: "user",
          address,
          phone,
          gouvernorat,
          codePostal,
        });

        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.status(201).json({
          message: "Compte créé avec succès",
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            address: user.address,
            phone: user.phone,
            gouvernorat: user.gouvernorat,
            codePostal: user.codePostal,
          },
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Mot de passe incorrect" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Connecté avec succès",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address,
          phone: user.phone,
          gouvernorat: user.gouvernorat,
          codePostal: user.codePostal,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = authCtrl;