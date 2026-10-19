
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Folder for uploaded event images
const uploadDir = path.join(__dirname, "../uploads");

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store uploaded images locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `event-${crypto.randomUUID()}${extension}`;

    cb(null, uniqueName);
  }
});

// Initial check of allowed file types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  const extension = path.extname(file.originalname).toLowerCase();

  if (
    allowedExtensions.includes(extension) &&
    allowedMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, PNG, and WebP images are allowed."
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

module.exports = upload;
