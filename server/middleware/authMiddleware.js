
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. No token provided."
      });
    }

    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    const currentVersion = user.tokenVersion ?? 0;

    // Tokens issued before password changes are rejected.
    if (
      decoded.tokenVersion !== undefined &&
      decoded.tokenVersion !== currentVersion
    ) {
      return res.status(401).json({
        message: "Session expired. Please sign in again."
      });
    }

    // Backward compatibility with existing JWTs
    // that were issued before tokenVersion existed.
    if (
      decoded.tokenVersion === undefined &&
      currentVersion !== 0
    ) {
      return res.status(401).json({
        message: "Session expired. Please sign in again."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required"
    });
  }

  next();
};

module.exports = { protect, adminOnly };

