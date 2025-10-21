const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required for token generation");
  }

  console.log("🔐 Generating token for user ID:", userId.toString());

  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

module.exports = generateToken;
