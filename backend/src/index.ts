// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import mongoose, { Document, Schema } from "mongoose";
import path from "path";
import { Dirent } from "fs";
import { readdir } from "fs/promises";
import { verifyUser, createUser } from "./auth";

// ----- Config -----
const MONGO_URI = process.env.MONGO_URI!;
const PORT = process.env.PORT!;
const MEDIA_DIR = path.join(__dirname, "media");

// ----- Mongoose Setup -----
interface IMedia extends Document {
  filename: string;
  title: string;
  description?: string;
}

const MediaSchema = new Schema<IMedia>({
  filename: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: false },
});

const Media = mongoose.model<IMedia>("Media", MediaSchema);

// This is the shape every endpoint item will have:
type MediaResult = {
  filename: string;
  url: string;
  title?: string;
  description?: string;
};

// ----- Express App -----
const app = express();
app.use(express.json());

// Recursively walk a directory
async function walkDir(dir: string): Promise<string[]> {
  let files: string[] = [];
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      files = files.concat(await walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

// GET /api/media
app.get("/api/media", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const titleFilter = (req.query.title as string)?.toLowerCase();
    const descFilter = (req.query.description as string)?.toLowerCase();

    const filePaths = await walkDir(MEDIA_DIR);
    const baseUrl = `${req.protocol}://${req.get("host")}/media`;

    // Build a properly typed list:
    let items: MediaResult[] = await Promise.all(
      filePaths.map(async (fullPath) => {
        const rel = path.relative(MEDIA_DIR, fullPath).replace(/\\/g, "/");
        const filename = path.basename(fullPath);
        const url = `${baseUrl}/${rel}`;
        const dbItem = await Media.findOne({ filename }).lean();

        if (dbItem) {
          return {
            filename,
            url,
            title: dbItem.title,
            description: dbItem.description,
          };
        }
        return { filename, url };
      })
    );

    // Filtering
    if (titleFilter) {
      items = items.filter((i) => i.title?.toLowerCase().includes(titleFilter));
    }
    if (descFilter) {
      items = items.filter((i) =>
        i.description?.toLowerCase().includes(descFilter)
      );
    }

    // Pagination
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);

    res.json({ page, limit, total: items.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Auth endpoints ----

// Create a user (call once, or behind a flag)
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    await createUser(username, password);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Simple login check
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const ok = await verifyUser(username, password);
  if (ok) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Serve static files
app.use("/media", express.static(MEDIA_DIR));

// Mongo + start
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Listening on ${PORT}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
