// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import mongoose, { Document, Schema } from "mongoose";
import path from "path";
import fs, { Dirent } from "fs";
import { readdir } from "fs/promises";
import { verifyUser, createUser } from "./auth";
import cors from "cors";
import https from "https";
import multer from "multer";

// ----- Config -----
const MONGO_URI = process.env.MONGO_URI!;
const PORT = process.env.PORT!;
const MEDIA_DIR = path.join(__dirname, "media");

const SSL_OPTIONS = {
  key: fs.readFileSync(path.join(__dirname, "SSL", "privkey.pem")),
  cert: fs.readFileSync(path.join(__dirname, "SSL", "fullchain.pem")),
};

// ----- Mongoose Setup -----
interface IMedia extends Document {
  imageUrl: string;
  title: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
}

const MediaSchema = new Schema<IMedia>({
  imageUrl: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: false },
  createdAt: { type: Date, required: true, default: () => new Date() },
  createdBy: { type: String, required: true },
});

const Media = mongoose.model<IMedia>("Media", MediaSchema);

// This is the shape every endpoint item will have:
type MediaResult = {
  filename: string;
  url: string;
  title?: string;
  description?: string;
};
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MEDIA_DIR);
  },
  filename: (_req, file, cb) => {
    // e.g. add timestamp prefix to avoid collisions
    const name = `${Date.now()}-${file.originalname}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// ----- Express App -----
const app = express();
app.use(cors({ origin: "*" }));

app.use(express.json());
// POST /api/add
// expects multipart/form-data with fields:
//   file: the image file
//   title, description, createdBy, createdAt (ISO string or timestamp)
app.post(
  "/api/add",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
      }

      // build the URL under /media
      const relPath = path
        .relative(MEDIA_DIR, req.file!.path)
        .replace(/\\/g, "/");
      const imageUrl = `${req.protocol}://${req.get("host")}/media/${relPath}`;

      // pull other fields
      const { title, description, createdBy, createdAt } = req.body;

      const doc = new Media({
        imageUrl,
        title,
        description: description || undefined,
        createdBy,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      });

      await doc.save();
      res.json({ success: true, item: doc });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);
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
    const titleFilter = (req.query.title as string)?.trim();
    const descFilter = (req.query.description as string)?.trim();

    // Build a Mongo filter with case‑insensitive regex for both fields
    const filter: Record<string, any> = {};
    if (titleFilter) {
      filter.title = { $regex: titleFilter, $options: "i" };
    }
    if (descFilter) {
      filter.description = { $regex: descFilter, $options: "i" };
    }

    // Total count for pagination
    const total = await Media.countDocuments(filter);

    // Fetch and page
    const data = await Media.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ page, limit, total, data });
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

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    https.createServer(SSL_OPTIONS, app).listen(PORT, () => {
      console.log(`HTTPS server listening on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
