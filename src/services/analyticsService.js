// backend/services/analyticsService.js
const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const User = require('../models/userModel')

// Statuts comptés dans le chiffre d'affaires (pending et cancelled exclus)
const PAID_STATUSES = ['paid', 'shipped', 'delivered']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Mini cache mémoire (TTL en ms) ─────────────────────
const cache = new Map()
const TTL = 60 * 1000

async function cached(key, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  const data = await fn()
  cache.set(key, { at: Date.now(), data })
  return data
}

// ── Helpers ────────────────────────────────────────────
const pct = (cur, prev) =>
  prev === 0 ? (cur > 0 ? 100 : 0) : +(((cur - prev) / prev) * 100).toFixed(1)

const monthStart = (offset = 0) => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth() + offset, 1)
}

async function ordersStats(from, to) {
  const [r] = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: {
          $sum: { $cond: [{ $in: ['$status', PAID_STATUSES] }, '$totalPrice', 0] }
        }
      }
    }
  ])
  return { revenue: r?.revenue || 0, orders: r?.orders || 0 }
}

// ── 1. KPIs ────────────────────────────────────────────
exports.getKpis = () =>
  cached('kpis', async () => {
    const [thisStart, lastStart, nextStart] = [monthStart(0), monthStart(-1), monthStart(1)]

    const [cur, prev, totalCustomers, newCustNow, newCustPrev, totalProducts, newProdNow, newProdPrev] =
      await Promise.all([
        ordersStats(thisStart, nextStart),
        ordersStats(lastStart, thisStart),
        User.countDocuments({ role: 'user', status: 'active' }),
        User.countDocuments({ role: 'user', createdAt: { $gte: thisStart } }),
        User.countDocuments({ role: 'user', createdAt: { $gte: lastStart, $lt: thisStart } }),
        Product.countDocuments(),
        Product.countDocuments({ createdAt: { $gte: thisStart } }),
        Product.countDocuments({ createdAt: { $gte: lastStart, $lt: thisStart } })
      ])

    return {
      revenue: { value: cur.revenue, change: pct(cur.revenue, prev.revenue) },
      orders: { value: cur.orders, change: pct(cur.orders, prev.orders) },
      customers: { value: totalCustomers, change: pct(newCustNow, newCustPrev) },
      products: { value: totalProducts, change: pct(newProdNow, newProdPrev) }
    }
  })

// ── 2. Revenue over time ───────────────────────────────
const RANGES = {
  '12m': { unit: 'month', n: 12 },
  '6m': { unit: 'month', n: 6 },
  '30d': { unit: 'day', n: 30 }
}

exports.getRevenue = (range = '12m') =>
  cached(`revenue:${range}`, async () => {
    const { unit, n } = RANGES[range]
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const d = now.getUTCDate()

    // Buckets vides (pour afficher 0 quand il n'y a pas de vente)
    const buckets = []
    for (let i = n - 1; i >= 0; i--) {
      const date = unit === 'month' ? new Date(Date.UTC(y, m - i, 1)) : new Date(Date.UTC(y, m, d - i))
      buckets.push({
        date,
        key: date.toISOString().slice(0, unit === 'month' ? 7 : 10),
        label: unit === 'month' ? MONTHS[date.getUTCMonth()] : `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`,
        revenue: 0,
        orders: 0
      })
    }

    const rows = await Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: buckets[0].date } } },
      {
        $group: {
          _id: { $dateToString: { format: unit === 'month' ? '%Y-%m' : '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 }
        }
      }
    ])

    const byKey = new Map(rows.map(r => [r._id, r]))
    return buckets.map(b => ({
      month: b.label, // même clé que le dataKey du graphique actuel
      revenue: byKey.get(b.key)?.revenue || 0,
      orders: byKey.get(b.key)?.orders || 0
    }))
  })

// ── 3. Sales by category (%) ───────────────────────────
exports.getSalesByCategory = (period = 'month') =>
  cached(`categories:${period}`, async () => {
    const from = period === 'year' ? new Date(new Date().getFullYear(), 0, 1) : period === 'all' ? new Date(0) : monthStart(0)

    const rows = await Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES }, createdAt: { $gte: from } } },
      { $unwind: '$products' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'p'
        }
      },
      { $unwind: '$p' },
      {
        $group: {
          _id: '$p.category',
          total: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        }
      },
      { $sort: { total: -1 } }
    ])

    const sum = rows.reduce((s, r) => s + r.total, 0)
    return rows.map(r => ({
      name: r._id || 'Other',
      value: sum ? +((r.total / sum) * 100).toFixed(1) : 0
    }))
  })

// ── 4. Recent orders ───────────────────────────────────
exports.getRecentOrders = async (limit = 5) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name')
    .populate('products.productId', 'name')
    .lean()

  return orders.map(o => {
    const first = o.products?.[0]?.productId?.name || 'Deleted product'
    const extra = (o.products?.length || 0) - 1
    return {
      id: o.orderNumber || String(o._id),
      customer: o.userId?.name || 'Unknown',
      product: extra > 0 ? `${first} +${extra} more` : first,
      amount: o.totalPrice,
      status: o.status,
      createdAt: o.createdAt // ISO → formaté côté front
    }
  })
}

// ── 5. Top products ────────────────────────────────────
exports.getTopProducts = (limit = 5) =>
  cached(`top:${limit}`, () =>
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES } } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productId',
          sales: { $sum: '$products.quantity' },
          revenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $project: { _id: 0, name: '$p.name', sales: 1, revenue: 1, stock: '$p.stock' } }
    ])
  )