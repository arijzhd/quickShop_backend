const express = require('express')
const router = express.Router()

const ordersCtrl = require('../controllers/ordersCtrl')
const auth = require('../middleware/authMiddleware') // adapte le chemin

// Client connecté : peut créer une commande
router.post("/create", auth, ordersCtrl.createOrder)

// Admin uniquement : voir toutes les commandes
router.get('/', auth, ordersCtrl.getOrders)

module.exports = router