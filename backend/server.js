import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import connectDB from "./config/db.js";
import articleRoutes from "./routes/articleRoutes.js";
import enhancementRoutes from "./routes/enhancementRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

// console.log("\n=== Starting Server ===");
// console.log("Environment:", process.env.NODE_ENV || "development");
// console.log("Node Version:", process.version);

const requiredEnvVars = ["MONGODB_URI"];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}

console.log("Environment variables loaded successfully");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const defaultOrigins = ["http://localhost:3000", "https://article-scraper-viewer-beyond-chats.vercel.app"];
const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0);
const corsOptions = {
  origin: [...defaultOrigins, ...envOrigins],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/articles", articleRoutes);
app.use("/api/enhance", enhancementRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    services: {
      database: "connected",
      openai: process.env.OPENAI_API_KEY ? "configured" : "missing",
      google:
        process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID
          ? "configured"
          : "missing",
    },
  });
});
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `\n Server running in ${process.env.NODE_ENV || "development"} mode`
      );
      console.log(
        `API Base URL: ${
          process.env.API_BASE_URL || `http://localhost:${PORT}`
        }`
      );
      console.log(`CORS Allowed Origins: ${corsOptions.origin.join(", ")}`);
      console.log(`Server ready at http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error("Server error:", error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});
