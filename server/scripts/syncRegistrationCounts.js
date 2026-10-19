
require("dotenv").config();

const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

async function syncRegistrationCounts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const events = await Event.find();

    for (const event of events) {
      const count = await Registration.countDocuments({
        event: event._id
      });

      await Event.updateOne(
        { _id: event._id },
        { $set: { registeredCount: count } }
      );

      console.log(
        `${event.title}: ${count} registrations`
      );
    }

    console.log("Registration counts synchronized.");
  } catch (error) {
    console.error("Synchronization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

syncRegistrationCounts();
