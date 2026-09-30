// backend/services/analyticsInsights.js
const Order = require('../models/orderModel')

const PAID = ['paid', 'shipped', 'delivered']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86400000

// Les jours/mois sont calculés dans TON fuseau (sinon une commande à 00h30 heure de Tunis
// tomberait sur la veille en UTC)
const TZ = process.env.ANALYTICS_TZ || 'Africa/Tunis'

const cache = new Map()
const TTL = 60 * 1000
async function cached(key, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  const data = await fn()
  cache.set(key, { at: Date.now(), data })
  return data
}

const round = (n, d = 0) => +Number(n || 0).toFixed(d)

// Minuit (en ms, repère UTC) de la date du jour dans le fuseau TZ
function localToday() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
    .format(new Date())
    .split('-')
    .map(Number)
  return Date.UTC(y, m - 1, d)
}

// ── Semaine : revenu/commandes par jour + synthèse vs semaine précédente ──
exports.getWeekly = (offset = 0) =>
  cached(`weekly:${offset}`, async () => {
    const today = localToday()
    const dow = (new Date(today).getUTCDay() + 6) % 7 // 0 = lundi
    const start = today - dow * DAY_MS - offset * 7 * DAY_MS
    const prevStart = start - 7 * DAY_MS
    const end = start + 7 * DAY_MS

    // Fenêtre élargie d'un jour de chaque côté : seules les 14 dates utiles sont lues ensuite
    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(prevStart - DAY_MS), $lt: new Date(end + DAY_MS) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: { $cond: [{ $in: ['$status', PAID] }, '$totalPrice', 0] } },
          paidOrders: { $sum: { $cond: [{ $in: ['$status', PAID] }, 1, 0] } },
          orders: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ])
    const byDate = new Map(rows.map(r => [r._id, r]))

    const buildWeek = from =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(from + i * DAY_MS).toISOString().slice(0, 10)
        const r = byDate.get(date)
        return {
          day: DAYS[i],
          date,
          revenue: r?.revenue || 0,
          orders: r?.orders || 0,
          paidOrders: r?.paidOrders || 0,
          cancelled: r?.cancelled || 0
        }
      })

    const days = buildWeek(start)
    const prevDays = buildWeek(prevStart)

    const totals = week =>
      week.reduce(
        (t, d) => ({
          revenue: t.revenue + d.revenue,
          orders: t.orders + d.orders,
          paidOrders: t.paidOrders + d.paidOrders,
          cancelled: t.cancelled + d.cancelled
        }),
        { revenue: 0, orders: 0, paidOrders: 0, cancelled: 0 }
      )
    const cur = totals(days)
    const prev = totals(prevDays)

    const aov = t => (t.paidOrders ? round(t.revenue / t.paidOrders, 2) : 0)
    const cancelRate = t => {
      const all = t.orders + t.cancelled
      return all ? round((t.cancelled / all) * 100, 1) : 0
    }
    // Semaine en cours : on divise par les jours écoulés, pas par 7 (sinon la moyenne est sous-estimée)
    const elapsed = offset === 0 ? dow + 1 : 7
    const best = days.reduce((b, d) => (d.revenue > b.revenue ? d : b), days[0])

    return {
      weekStart: days[0].date,
      weekEnd: days[6].date,
      days: days.map(({ day, date, revenue, orders }) => ({ day, date, revenue, orders })),
      summary: {
        revenue: cur.revenue,
        prevRevenue: prev.revenue,
        orders: cur.orders,
        prevOrders: prev.orders,
        bestDay: best.revenue > 0 ? { day: best.day, date: best.date, revenue: best.revenue } : null,
        avgDaily: {
          revenue: round(cur.revenue / elapsed),
          orders: round(cur.orders / elapsed, 1),
          prevRevenue: round(prev.revenue / 7)
        },
        aov: { value: aov(cur), prev: aov(prev) },
        cancelRate: { value: cancelRate(cur), prev: cancelRate(prev) }
      }
    }
  })

// ── Croissance clients : nouveaux vs fidèles par mois ──
// Nouveau  = le mois de sa 1re commande (non annulée)
// Fidèle   = a commandé ce mois-ci, mais sa 1re commande est antérieure
exports.getCustomerGrowth = (range = '12m') =>
  cached(`growth:${range}`, async () => {
    const n = range === '6m' ? 6 : 12
    const t = new Date(localToday())
    const y = t.getUTCFullYear()
    const m = t.getUTCMonth()

    const buckets = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1))
      buckets.push({ key: d.toISOString().slice(0, 7), month: MONTHS[d.getUTCMonth()] })
    }
    const fromKey = buckets[0].key
    const fmt = { format: '%Y-%m', timezone: TZ }

    const rows = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' }, userId: { $ne: null } } },
      {
        $group: {
          _id: '$userId',
          first: { $min: '$createdAt' },
          months: { $addToSet: { $dateToString: { ...fmt, date: '$createdAt' } } }
        }
      },
      { $match: { months: { $gte: fromKey } } }, // clients actifs dans la fenêtre seulement
      { $addFields: { firstMonth: { $dateToString: { ...fmt, date: '$first' } } } },
      { $unwind: '$months' },
      { $match: { months: { $gte: fromKey } } },
      {
        $group: {
          _id: '$months',
          newCustomers: { $sum: { $cond: [{ $eq: ['$months', '$firstMonth'] }, 1, 0] } },
          returningCustomers: { $sum: { $cond: [{ $eq: ['$months', '$firstMonth'] }, 0, 1] } }
        }
      }
    ])
    const byKey = new Map(rows.map(r => [r._id, r]))

    const data = buckets.map(b => ({
      month: b.month,
      newCustomers: byKey.get(b.key)?.newCustomers || 0,
      returningCustomers: byKey.get(b.key)?.returningCustomers || 0
    }))

    const newTotal = data.reduce((s, d) => s + d.newCustomers, 0)
    const returningTotal = data.reduce((s, d) => s + d.returningCustomers, 0)
    const all = newTotal + returningTotal

    return {
      data,
      summary: {
        newTotal,
        returningTotal,
        returningRate: all ? round((returningTotal / all) * 100, 1) : 0
      }
    }
  })