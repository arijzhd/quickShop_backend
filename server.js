require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected 🚀");

    console.log("Data inserted → DB created");
  })
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const authRouter = require("./src/routes/authRouter");
const supplierRouter = require("./src/routes/supplierRouter");
const productRouter = require("./src/routes/productRouter");
const customerRouter = require("./src/routes/customerRouter");
const ordersRouter = require("./src/routes/ordersRouter");
const analyticsRouter = require("./src/routes/analyticsRoutes");
app.use("/api/orders", ordersRouter);
app.use("/api/customers", customerRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/products", productRouter);
app.use("/api/auth", authRouter);
app.use('/api/analytics', analyticsRouter)