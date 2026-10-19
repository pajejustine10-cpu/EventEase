
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

const Event = require("../models/Event");
const Registration = require("../models/Registration");

// =====================================
// HELPER FUNCTIONS
// =====================================

const isValidText = (value) => {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
};

const parseCapacity = (value) => {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  if (String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 1) {
    return null;
  }

  return number;
};

const parseFutureDate = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime()) ||
    date <= new Date()
  ) {
    return null;
  }

  return date;
};

const getImagePath = (file) => {
  if (!file) return "";

  return `/uploads/${file.filename}`;
};

// Only delete files inside our uploads folder.
const removeImage = async (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") {
    return;
  }

  const filename = path.basename(imagePath);

  // Never remove files outside the uploads directory.
  if (
    !imagePath.startsWith("/uploads/") ||
    filename !== imagePath.slice("/uploads/".length)
  ) {
    return;
  }

  const fullPath = path.join(
    __dirname,
    "../uploads",
    filename
  );

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Image cleanup error:", error);
    }
  }
};

// Validate the actual file signature.
// Extensions and browser MIME types alone are insufficient.
const isRealImage = async (file) => {
  if (!file) return true;

  const buffer = await fs.readFile(file.path);
  const type = file.mimetype;

  if (type === "image/jpeg") {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (type === "image/png") {
    const signature = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10
    ]);

    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(signature)
    );
  }

  if (type === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
};

const handleServerError = (res, error, action) => {
  console.error(`${action} error:`, error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: error.message
    });
  }

  return res.status(500).json({
    message: "Server error"
  });
};

// =====================================
// CREATE EVENT - ADMIN
// =====================================

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      capacity
    } = req.body;

    const parsedCapacity = parseCapacity(capacity);

    if (
      !isValidText(title) ||
      !isValidText(description) ||
      !isValidText(location) ||
      parsedCapacity === null
    ) {
      await removeImage(getImagePath(req.file));

      return res.status(400).json({
        message: "Please provide valid event details"
      });
    }

    if (title.trim().length > 150) {
      await removeImage(getImagePath(req.file));

      return res.status(400).json({
        message: "Title must not exceed 150 characters"
      });
    }

    const eventDate = parseFutureDate(date);

    if (!eventDate) {
      await removeImage(getImagePath(req.file));

      return res.status(400).json({
        message: "Event date must be in the future"
      });
    }

    if (req.file && !(await isRealImage(req.file))) {
      await removeImage(getImagePath(req.file));

      return res.status(400).json({
        message: "Invalid image file"
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date: eventDate,
      location: location.trim(),
      capacity: parsedCapacity,
      registeredCount: 0,
      image: getImagePath(req.file),
      createdBy: req.user._id
    });

    return res.status(201).json({
      message: "Event created successfully",
      event
    });

  } catch (error) {
    await removeImage(getImagePath(req.file));

    return handleServerError(res, error, "Create event");
  }
};

// =====================================
// GET ALL EVENTS
// =====================================

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ date: 1 })
      .populate("createdBy", "name");

    return res.status(200).json(events);

  } catch (error) {
    return handleServerError(res, error, "Get events");
  }
};

// =====================================
// GET SINGLE EVENT
// =====================================

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid event ID"
      });
    }

    const event = await Event.findById(id)
      .populate("createdBy", "name");

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    return res.status(200).json(event);

  } catch (error) {
    return handleServerError(res, error, "Get event");
  }
};

// =====================================
// UPDATE EVENT - ADMIN
// =====================================

exports.updateEvent = async (req, res) => {
  const newImage = getImagePath(req.file);

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      await removeImage(newImage);

      return res.status(400).json({
        message: "Invalid event ID"
      });
    }

    const allowedFields = [
      "title",
      "description",
      "date",
      "location",
      "capacity"
    ];

    const fields = Object.keys(req.body);

    if (
      (fields.length === 0 && !req.file) ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      await removeImage(newImage);

      return res.status(400).json({
        message: "Invalid update fields"
      });
    }

    const updates = {};

    for (const field of fields) {
      const value = req.body[field];

      if (field === "capacity") {
        const parsedCapacity = parseCapacity(value);

        if (parsedCapacity === null) {
          await removeImage(newImage);

          return res.status(400).json({
            message: "Capacity must be a positive integer"
          });
        }

        updates.capacity = parsedCapacity;

      } else if (field === "date") {
        const parsedDate = parseFutureDate(value);

        if (!parsedDate) {
          await removeImage(newImage);

          return res.status(400).json({
            message: "Event date must be in the future"
          });
        }

        updates.date = parsedDate;

      } else {
        if (!isValidText(value)) {
          await removeImage(newImage);

          return res.status(400).json({
            message: `${field} cannot be empty`
          });
        }

        if (
          field === "title" &&
          value.trim().length > 150
        ) {
          await removeImage(newImage);

          return res.status(400).json({
            message: "Title must not exceed 150 characters"
          });
        }

        updates[field] = value.trim();
      }
    }

    if (req.file) {
      if (!(await isRealImage(req.file))) {
        await removeImage(newImage);

        return res.status(400).json({
          message: "Invalid image file"
        });
      }

      updates.image = newImage;
    }

    const filter = { _id: id };

    if (updates.capacity !== undefined) {
      filter.registeredCount = {
        $lte: updates.capacity
      };
    }

    // Find existing image so it can be removed
    // after a successful replacement.
    const existingEvent = await Event.findById(id);

    if (!existingEvent) {
      await removeImage(newImage);

      return res.status(404).json({
        message: "Event not found"
      });
    }

    const previousImage = existingEvent.image;

    const event = await Event.findOneAndUpdate(
      filter,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!event) {
      await removeImage(newImage);

      return res.status(400).json({
        message:
          "Capacity cannot be lower than the number of registered participants"
      });
    }

    if (newImage && previousImage) {
      await removeImage(previousImage);
    }

    return res.status(200).json({
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    await removeImage(newImage);

    return handleServerError(res, error, "Update event");
  }
};

// =====================================
// DELETE EVENT - ADMIN
// =====================================

exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid event ID"
    });
  }

  try {
    let deletedRegistrations = 0;
    let eventImage = "";

    // Keep event deletion and registration cleanup atomic.
    await mongoose.connection.transaction(async (session) => {
      const event = await Event.findOneAndDelete(
        { _id: id },
        { session }
      );

      if (!event) {
        const error = new Error("Event not found");
        error.status = 404;
        throw error;
      }

      eventImage = event.image;

      const result = await Registration.deleteMany(
        { event: id },
        { session }
      );

      deletedRegistrations = result.deletedCount;
    });

    // Only remove the image after the database
    // transaction has committed successfully.
    if (eventImage) {
      await removeImage(eventImage);
    }

    return res.status(200).json({
      message: "Event deleted successfully",
      deletedRegistrations
    });

  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({
        message: error.message
      });
    }

    return handleServerError(res, error, "Delete event");
  }
};


