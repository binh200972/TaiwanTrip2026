import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataFilePath = path.join(rootDir, "data", "itinerary.json");
const distDirPath = path.join(rootDir, "dist");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/itinerary", async (_req, res) => {
  try {
    const raw = await fs.readFile(dataFilePath, "utf-8");
    const data = JSON.parse(raw);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Cannot read itinerary data.", detail: error.message });
  }
});

app.post("/api/itinerary", async (req, res) => {
  try {
    const incomingData = req.body;

    if (!Array.isArray(incomingData)) {
      return res.status(400).json({ message: "Invalid data format. Expected an array." });
    }

    await fs.writeFile(dataFilePath, `${JSON.stringify(incomingData, null, 2)}\n`, "utf-8");
    res.json({ message: "Saved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Cannot save itinerary data.", detail: error.message });
  }
});

app.use(express.static(distDirPath));

app.get("*", async (_req, res) => {
  try {
    await fs.access(path.join(distDirPath, "index.html"));
    return res.sendFile(path.join(distDirPath, "index.html"));
  } catch {
    return res.status(404).send("Build not found. Run `npm run build` first.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
