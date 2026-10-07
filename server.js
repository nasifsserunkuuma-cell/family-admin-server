import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { extractEntitiesAndRelationships } from "./extraction.js";
import { generateAnswer } from "./answering.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.post("/api/extract", async (req, res) => {
  try {
    const { rawText } = req.body ?? {};
    if (typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ success: false, error: "rawText is required" });
    }
    const data = await extractEntitiesAndRelationships(rawText);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Extraction error details:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to extract entities" });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ONE Server running on port ${PORT}`);
});
