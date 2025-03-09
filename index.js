const express = require("express");
const cors = require("cors");
const { inject } = require("@vercel/analytics");
const route = require("./src/router/route");

// Inject analytics
inject();

// Inisialisasi Express
const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Routes
app.use(route);

// Untuk development lokal
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 8000;
  app.listen(port, () => {
    try {
      console.log(`Running on localhost:${port}`);
    } catch (error) {
      throw error;
    }
  });
}

//Nih export buat Vercel ny (penting!)
module.exports = app;
