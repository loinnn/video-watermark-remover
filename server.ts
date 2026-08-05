import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 frame images
app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// AI Watermark Detection Endpoint
app.post("/api/detect-watermarks", async (req, res) => {
  try {
    const { frameImage } = req.body;
    if (!frameImage) {
      res.status(400).json({ error: "No frame image provided" });
      return;
    }

    const ai = getGeminiClient();
    let detectedWatermarks: any[] = [];

    if (ai) {
      // Clean up base64 prefix if present
      const base64Data = frameImage.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `Inspect this video frame and identify all text watermarks, platform logos, AI generation tags (specifically like "豆包AI生成", "抖音", "TikTok", "快手", "小红书"), channel signatures, or timestamps.
CRITICAL INSTRUCTION FOR BOUNDING BOXES:
- The bounding box MUST BE TIGHTLY CROPPED around ONLY the watermark text or logo characters.
- Do NOT include surrounding background artwork, drawing paper, or video scene content.
- Typical watermark text boxes are small: width should be between 12% and 26%, height between 4% and 8%.
- Bounding box coordinates MUST be normalized percentages relative to frame dimensions (0 to 100):
  x: top-left x %
  y: top-left y %
  width: width %
  height: height %
Provide a concise label (e.g., "豆包AI生成水印", "右下角水印", "角落 Logo") and a brief description.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Data,
              },
            },
            { text: prompt },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                watermarks: {
                  type: Type.ARRAY,
                  description: "List of detected watermark regions",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING, description: "Label or type of watermark" },
                      x: { type: Type.NUMBER, description: "Left position X in percentage (0-100)" },
                      y: { type: Type.NUMBER, description: "Top position Y in percentage (0-100)" },
                      width: { type: Type.NUMBER, description: "Width in percentage (0-100)" },
                      height: { type: Type.NUMBER, description: "Height in percentage (0-100)" },
                      confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
                    },
                    required: ["label", "x", "y", "width", "height"],
                  },
                },
              },
              required: ["watermarks"],
            },
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.watermarks && Array.isArray(parsed.watermarks)) {
            detectedWatermarks = parsed.watermarks;
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini API call warning, falling back to smart image analyzer:", geminiErr);
      }
    }

    res.json({ watermarks: detectedWatermarks });
  } catch (error: any) {
    console.error("Error detecting watermarks:", error);
    res.status(500).json({
      error: error.message || "AI 识别水印服务遇到异常",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
