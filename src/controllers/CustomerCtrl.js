// backend/controllers/customerCtrl.js
const Customer = require("../models/userModel");

// Mêmes statuts que le dashboard : pending et cancelled ne comptent pas dans le total dépensé
const PAID_STATUSES = ["paid", "shipped", "delivered"];

const SORTS = {
  newest:      { createdAt: -1 },
  name_asc:    { name: 1 },
  spent_desc:  { totalSpent: -1 },
  orders_desc: { ordersCount: -1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/customers?search=&status=&sort=&page=&limit=
 */
const getCustomers = async (req, res) => {
  try {
    const { search, status, sort = "newest" } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    // Seulement les clients (pas les admins)
    const match = { role: "user" };
    if (["active", "inactive"].includes(status)) match.status = status;
    if (search?.trim()) {
      const rx = { $regex: escapeRegex(search.trim()), $options: "i" };
      match.$or = [{ name: rx }, { email: rx }];
    }

    const sortBy = { ...(SORTS[sort] || SORTS.newest), _id: 1 }; // _id = ordre stable entre pages

    const [result] = await Customer.aggregate([
      { $match: match },
      // Commandes de chaque client, agrégées directement en base
      {
        $lookup: {
          from: "orders",
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$uid"] }, status: { $ne: "cancelled" } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                spent: { $sum: { $cond: [{ $in: ["$status", PAID_STATUSES] }, "$totalPrice", 0] } },
              },
            },
          ],
          as: "o",
        },
      },
      {
        $addFields: {
          ordersCount: { $ifNull: [{ $arrayElemAt: ["$o.count", 0] }, 0] },
          totalSpent: { $ifNull: [{ $arrayElemAt: ["$o.spent", 0] }, 0] },
        },
      },
      { $project: { password: 0, o: 0, __v: 0 } }, // ⚠️ jamais le hash du mot de passe
      {
        $facet: {
          customers: [{ $sort: sortBy }, { $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "n" }],
        },
      },
    ]);

    const total = result.total[0]?.n || 0;
    res.json({
      success: true,
      customers: result.customers,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error("[customers]", err);
    res.status(500).json({ success: false, message: "Failed to load customers" });
  }
};

/**
 * GET /api/customers/stats
 */
const getCustomerStats = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const base = { role: "user" };

    const [total, active, inactive, newThisMonth] = await Promise.all([
      Customer.countDocuments(base),
      Customer.countDocuments({ ...base, status: "active" }),
      Customer.countDocuments({ ...base, status: "inactive" }),
      Customer.countDocuments({ ...base, createdAt: { $gte: monthStart } }),
    ]);

    res.json({ success: true, total, active, inactive, newThisMonth });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCustomers, getCustomerStats };

/* ── customerRoutes.js ──
const router = require("express").Router();
const ctrl = require("../controllers/customerCtrl");
// const { protect, adminOnly } = require("../middleware/auth");
// router.use(protect, adminOnly);   // ← à activer : ces données sont sensibles

router.get("/", ctrl.getCustomers);
router.get("/stats", ctrl.getCustomerStats);   // avant toute route "/:id"
module.exports = router;

   server.js :  app.use("/api/customers", require("./routes/customerRoutes"));

   Index conseillé dans Order :  orderSchema.index({ userId: 1, status: 1 });
*/