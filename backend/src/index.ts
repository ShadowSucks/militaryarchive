// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import mongoose, { Document, Schema } from "mongoose";
import path from "path";
import fs, { Dirent } from "fs";
import { verifyUser, createUser } from "./auth";
import cors from "cors";
import https from "https";
import multer from "multer";
import slugify from "slugify";
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
  fileType?: string;
  title: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
}

const MediaSchema = new Schema<IMedia>({
  imageUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: false },
  createdAt: { type: Date, required: true, default: () => new Date() },
  createdBy: { type: String, required: true },
});

const Media = mongoose.model<IMedia>("Media", MediaSchema);

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

      // Sanitize filename
      const originalExt = path.extname(req.file!.originalname);
      const baseName = path.basename(req.file!.originalname, originalExt);
      const safeName = slugify(baseName, { lower: true, strict: true });
      const finalName = `${safeName}-${Date.now()}${originalExt}`;
      const finalPath = path.join(path.dirname(req.file!.path), finalName);
      let fileType: "image" | "video" | "other" = "other";
      const mime = req.file!.mimetype;

      if (mime.startsWith("image/")) {
        fileType = "image";
      } else if (mime.startsWith("video/")) {
        fileType = "video";
      }
      // Rename file
      await fs.promises.rename(req.file!.path, finalPath);

      // Build image URL
      const relPath = path.relative(MEDIA_DIR, finalPath).replace(/\\/g, "/");
      const imageUrl = `https://m.bahushbot.ir:3002/media/${relPath}`;

      const { title, description, createdBy, createdAt } = req.body;
      const doc = new Media({
        imageUrl,
        fileType,
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
