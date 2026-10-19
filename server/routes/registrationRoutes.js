
const express = require("express");
const router = express.Router();

const {
  registerForEvent,
  getMyRegistrations,
  getEventParticipants,
  cancelRegistration
} = require("../controllers/registrationController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

router.get("/my", protect, getMyRegistrations);

router.get(
  "/event/:eventId",
  protect,
  adminOnly,
  getEventParticipants
);

router.post(
  "/:eventId",
  protect,
  registerForEvent
);

router.delete(
  "/:eventId",
  protect,
  cancelRegistration
);

module.exports = router;
  