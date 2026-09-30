const express = require("express");
const router = express.Router();

const CustomerCtrl = require("../controllers/CustomerCtrl");

router.get("/", CustomerCtrl.getCustomers);
router.get("/stats", CustomerCtrl.getCustomerStats);

module.exports = router;
