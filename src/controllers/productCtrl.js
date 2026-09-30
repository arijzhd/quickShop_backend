  const Product = require("../models/productModel");
  const LOW_STOCK = 20
  const CATEGORIES = Product.schema.path('category').enumValues
  const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const SORTS = {
    newest:     { createdAt: -1 },
    price_asc:  { price: 1 },
    price_desc: { price: -1 },
    stock_asc:  { stock: 1 },
    sold_desc:  { sold: -1 },
    name_asc:   { name: 1 }
  }
  /**
   * CREATE
   */
  const createProduct = async (req, res) => {
    try {
      const product = await Product.create(req.body);

      res.status(201).json({
        success: true,
        product,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  /**
   * GET ALL
   */
  const getProducts = async (req, res) => {
    try {
      const { search, category, stockStatus, sort = 'newest' } = req.query
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100)
  
      const filter = {}
      if (search?.trim()) filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' }
      if (CATEGORIES.includes(category)) filter.category = category
  
      if (stockStatus === 'out') filter.stock = 0
      else if (stockStatus === 'low') filter.stock = { $gt: 0, $lt: LOW_STOCK }
      else if (stockStatus === 'active') filter.stock = { $gte: LOW_STOCK }
  
      // _id en critère secondaire : ordre stable entre les pages
      const sortBy = { ...(SORTS[sort] || SORTS.newest), _id: 1 }
  
      const [products, total] = await Promise.all([
        Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
        Product.countDocuments(filter)
      ])
  
      res.json({ products, total, page, pages: Math.max(Math.ceil(total / limit), 1) })
    } catch (err) {
      console.error('[products]', err)
      res.status(500).json({ message: 'Erreur lors du chargement des produits' })
    }
  }
  

  /**
   * UPDATE PRODUCT
   */
  const updateProduct = async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        product,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  /**
   * DELETE PRODUCT
   */
  const deleteProduct = async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        message: "Product deleted",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  /**
   * SEARCH PRODUCT GLOBAL
   */
  const searchProducts = async (req, res) => {
    try {
      const { keyword } = req.query;

      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: "Please enter a search keyword",
        });
      }
      const products = await Product.aggregate([
        {
          $lookup: {
            from: "suppliers",
            localField: "supplier",
            foreignField: "_id",
            as: "supplier",
          },
        },

        {
          $unwind: {
            path: "$supplier",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $match: {
            $or: [
              {
                name: {
                  $regex: keyword,
                  $options: "i",
                },
              },

              {
                category: {
                  $regex: keyword,
                  $options: "i",
                },
              },

              {
                "supplier.name": {
                  $regex: keyword,
                  $options: "i",
                },
              },
            ],
          },
        },
      ]);

      res.json({
        success: true,
        count: products.length,
        products,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
  const getProductsByCategory = async (req, res) => {
    try {
      const { category } = req.params;

      const filter = category && category !== "all" ? { category } : {};

      const products = await Product.find(filter).populate("supplier");

      res.json({
        success: true,
        count: products.length,
        products,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };
  const getCategories = async (req, res) => {
    try {
      const categories = await Product.distinct("category");
      res.json({ success: true, categories });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
  const getProductById = async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).populate("supplier");
      if (!product) {
        return res.status(404).json({ success: false, message: "Produit introuvable" });
      }
      res.json({ success: true, product });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
  /**
   * GET PRODUCT DETAIL
   */
  const getProductDetail = async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).populate("supplier");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produit introuvable",
        });
      }

      res.json({
        success: true,
        product,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  const getProductStats = async (req, res) => {
    try {
      const [total, out, low] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ stock: 0 }),
        Product.countDocuments({ stock: { $gt: 0, $lt: LOW_STOCK } })
      ])
      res.json({ total, out, low })
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors du calcul des statistiques' })
    }
  }
  module.exports = {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductsByCategory,
    getCategories,
    getProductById,
    getProductDetail,
    getProductStats
  };

