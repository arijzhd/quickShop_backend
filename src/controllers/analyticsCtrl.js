// backend/controllers/analyticsCtrl.js  (remplace la version actuelle)
const service = require('../services/analyticsService')
const insights = require('../services/analyticsInsights')

const RANGES = ['12m', '6m', '30d']
const GROWTH_RANGES = ['12m', '6m']
const PERIODS = ['month', 'year', 'all']

// Entier borné entre 1 et 20 (défaut 5)
const toLimit = v => Math.min(Math.max(parseInt(v, 10) || 5, 1), 20)
// Décalage en semaines : 0 = semaine en cours, 1 = la précédente… (max 52)
const toOffset = v => Math.min(Math.max(parseInt(v, 10) || 0, 0), 52)

const handle = fn => async (req, res) => {
  try {
    res.json(await fn(req))
  } catch (err) {
    console.error('[analytics]', err)
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques' })
  }
}

// ── Dashboard ──
exports.kpis = handle(() => service.getKpis())

exports.revenue = handle(req => {
  const range = RANGES.includes(req.query.range) ? req.query.range : '12m'
  return service.getRevenue(range)
})

exports.salesByCategory = handle(req => {
  const period = PERIODS.includes(req.query.period) ? req.query.period : 'month'
  return service.getSalesByCategory(period)
})

exports.recentOrders = handle(req => service.getRecentOrders(toLimit(req.query.limit)))

exports.topProducts = handle(req => service.getTopProducts(toLimit(req.query.limit)))

// ── Page Analytics ──
exports.weekly = handle(req => insights.getWeekly(toOffset(req.query.offset)))

exports.customerGrowth = handle(req => {
  const range = GROWTH_RANGES.includes(req.query.range) ? req.query.range : '12m'
  return insights.getCustomerGrowth(range)
})