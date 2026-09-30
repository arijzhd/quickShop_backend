const express = require('express')
const router = express.Router()

const   analytics = require('../controllers/analyticsCtrl')
const auth = require('../middleware/authMiddleware') // adapte le chemin

router.get('/kpis', analytics.kpis)
router.get('/revenue', analytics.revenue)
router.get('/sales-by-category', analytics.salesByCategory)
router.get('/recent-orders', analytics.recentOrders)
router.get('/top-products', analytics.topProducts)

router.get('/weekly', analytics.weekly)
router.get('/customer-growth', analytics.customerGrowth)

module.exports = router