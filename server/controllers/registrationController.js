
const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Event = require("../models/Event");

// Create an API error
const apiError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Handle errors consistently
const sendError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      message: "You are already registered for this event"
    });
  }

  if (error.status) {
    return res.status(error.status).json({
      message: error.message
    });
  }

  console.error("Registration controller error:", error);

  return res.status(500).json({
    message: "Registration operation failed"
  });
};

// ======================================
// REGISTER FOR EVENT
// ======================================
exports.registerForEvent = async (req, res) => {
  console.log("REGISTER CONTROLLER EXECUTED");
  console.log("Event ID:", req.params.eventId);

  const { eventId } = req.params;

  if (!mongoose.isValidObjectId(eventId)) {
    return res.status(400).json({
      message: "Invalid event ID"
    });
  }

  try {
    let registration;

    await mongoose.connection.transaction(async (session) => {
      // Check existing registration
      const existing = await Registration.findOne({
        user: req.user._id,
        event: eventId
      }).session(session);

      if (existing) {
        throw apiError(
          "You are already registered for this event",
          409
        );
      }

      // Atomically reserve one available slot
      const event = await Event.findOneAndUpdate(
        {
          _id: eventId,
          date: { $gt: new Date() },
          registeredCount: { $gte: 0 },
          $expr: {
            $lt: ["$registeredCount", "$capacity"]
          }
        },
        {
          $inc: { registeredCount: 1 }
        },
        {
          new: true,
          session
        }
      );

      if (!event) {
        const found = await Event.findById(eventId)
          .session(session);

        if (!found) {
          throw apiError("Event not found", 404);
        }

        if (found.date <= new Date()) {
          throw apiError(
            "Registration is closed for this event",
            400
          );
        }

        if (typeof found.registeredCount !== "number") {
          throw apiError(
            "Event registration count is not initialized",
            409
          );
        }

        throw apiError(
          "This event is full or temporarily unavailable",
          409
        );
      }

      // Create registration in the same transaction
      const created = await Registration.create(
        [{
          user: req.user._id,
          event: eventId
        }],
        { session }
      );

      registration = created[0];

      console.log(
        "Registered count after reservation:",
        event.registeredCount
      );
    });

    console.log("TRANSACTION COMMITTED");

    return res.status(201).json({
      message: "Event registration successful",
      registration
    });

  } catch (error) {
    return sendError(res, error);
  }
};

// ======================================
// GET MY REGISTRATIONS
// ======================================
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id
    })
      .populate(
        "event",
        "title description date location capacity registeredCount"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json(registrations);

  } catch (error) {
    return sendError(res, error);
  }
};

// ======================================
// GET EVENT PARTICIPANTS (ADMIN)
// ======================================
exports.getEventParticipants = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.isValidObjectId(eventId)) {
    return res.status(400).json({
      message: "Invalid event ID"
    });
  }

  try {
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    const registrations = await Registration.find({
      event: eventId
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(registrations);

  } catch (error) {
    return sendError(res, error);
  }
};

// ======================================
// CANCEL REGISTRATION
// ======================================
exports.cancelRegistration = async (req, res) => {
  console.log("CANCEL CONTROLLER EXECUTED");

  const { eventId } = req.params;

  if (!mongoose.isValidObjectId(eventId)) {
    return res.status(400).json({
      message: "Invalid event ID"
    });
  }

  try {
    await mongoose.connection.transaction(async (session) => {
      // Remove registration
      const registration = await Registration.findOneAndDelete(
        {
          user: req.user._id,
          event: eventId
        },
        { session }
      );

      if (!registration) {
        throw apiError("Registration not found", 404);
      }

      // Atomically decrease event count
      const updated = await Event.findOneAndUpdate(
        {
          _id: eventId,
          registeredCount: { $gt: 0 }
        },
        {
          $inc: { registeredCount: -1 }
        },
        {
          new: true,
          session
        }
      );

      if (!updated) {
        throw apiError(
          "Unable to update registration count",
          409
        );
      }

      console.log(
        "Registered count after cancellation:",
        updated.registeredCount
      );
    });

    console.log("CANCELLATION COMMITTED");

    return res.status(200).json({
      message: "Registration cancelled successfully"
    });

  } catch (error) {
    return sendError(res, error);
  }
};
