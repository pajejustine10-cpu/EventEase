
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing from .env");
  process.exit(1);
}

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32
) {
  console.error(
    "JWT_SECRET must contain at least 32 characters."
  );
  process.exit(1);
}

// ==========================================
// CORS
// ==========================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(
    process.env.CLIENT_URL.replace(/\/$/, "")
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
      );
    }
  })
);

// ==========================================
// REQUEST BODY PARSERS
// ==========================================

app.use(express.json({ limit: "100kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb"
  })
);

// ==========================================
// SECURITY HEADERS
// ==========================================

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// ==========================================
// SERVE UPLOADED EVENT IMAGES
// ==========================================

// Event images uploaded through Multer are
// saved in server/uploads.
//
// Example database image path:
// /uploads/event-123.jpg
//
// Public URL:
// http://localhost:5000/uploads/event-123.jpg

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    index: false,
    dotfiles: "deny",
    setHeaders(res) {
      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );
    }
  })
);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

app.use("/api/events", eventRoutes);

app.use("/api/registrations", registrationRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "EventEase API is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// ==========================================
// NOT FOUND HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found"
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  // Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Image must be smaller than 5 MB."
      });
    }

    return res.status(400).json({
      message: err.message
    });
  }

  // File format errors
  if (
    err.message ===
    "Only JPG, PNG, and WebP images are allowed."
  ) {
    return res.status(400).json({
      message: err.message
    });
  }

  // CORS errors
  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      message: "Request origin not allowed."
    });
  }

  console.error("Server error:", err);

  return res.status(500).json({
    message: "Internal server error"
  });
});

// ==========================================
// DATABASE CONNECTION AND SERVER STARTUP
// ==========================================

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log(
      "MongoDB connected successfully"
    );

    app.listen(PORT, () => {
      console.log(
        `EventEase server running on port ${PORT}`
      );

      console.log(
        `API: http://localhost:${PORT}/api`
      );

      console.log(
        `Uploads: http://localhost:${PORT}/uploads`
      );
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
} 

startServer();


