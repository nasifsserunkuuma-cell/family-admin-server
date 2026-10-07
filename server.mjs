import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = "gemini-3.8-flash";

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ status: "healthy" }));

const RULES =
  'Return only JSON: {"summary":string,"events":[{"title":string,"date":"YYYY-MM-DD","time":string|null,"location":string|null}],"deadlines":[{"title":string,"date":"YYYY-MM-DD"}],"tasks":[string],"costs":[{"item":string,"amount":number}],"formsToSign":[string]}. Use empty arrays if none. Never invent dates.';

app.post("/api/parse-document", async (req, res) => {
  try {
    const { text, imageBase64 } = req.body ?? {};
    if (!text && !imageBase64) {
      return res.status(400).json({ success: false, error: "text or imageBase64 is required" });
    }
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

    const parts = [{ text: "Today is " + new Date().toISOString().slice(0, 10) + ". Extract from this family/school document." }];
    if (text) parts.push({ text });
    if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: RULES }] },
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error?.message || "Gemini error " + r.status);

    const out = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || "").join("");
    return res.json({ success: true, data: JSON.parse(out) });
  } catch (error) {
    console.error("parse-document error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed" });
  }
});

app.use((req, res) => res.status(404).json({ success: false, error: "Route not found" }));

app.listen(PORT, "0.0.0.0", () => console.log("Server running on port " + PORT));