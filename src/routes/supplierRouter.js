const express = require("express");
const router = express.Router();

const suppliersCtrl = require("../controllers/suppliersCtrl");

// create supplier
router.post("/", suppliersCtrl.createSupplier);
// get suppliers
router.get("/", suppliersCtrl.getSuppliers);
// SEARCH
router.get("/search", suppliersCtrl.searchSuppliers);
// GET ONE
router.get("/:id", suppliersCtrl.getSupplierById);
// UPDATE
router.put("/:id", suppliersCtrl.updateSupplier);
// DELETE
router.delete("/:id", suppliersCtrl.deleteSupplier);

module.exports = router;
