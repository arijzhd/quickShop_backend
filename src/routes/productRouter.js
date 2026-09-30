const express = require('express')
const router = express.Router()

const productCtrl = require('../controllers/productCtrl')

// ── Routes fixes d'abord ──
router.get('/', productCtrl.getProducts)
router.post('/', productCtrl.createProduct)
router.get('/stats', productCtrl.getProductStats)
router.get('/search', productCtrl.searchProducts)
router.get('/categories', productCtrl.getCategories)
router.get('/category/:category', productCtrl.getProductsByCategory)
router.get('/detail/:id', productCtrl.getProductDetail)

// ── Routes dynamiques (/:id) en dernier ──
router.get('/:id', productCtrl.getProductById)
router.put('/:id', productCtrl.updateProduct)
router.delete('/:id', productCtrl.deleteProduct)

module.exports = router