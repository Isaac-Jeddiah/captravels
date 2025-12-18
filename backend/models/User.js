const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dialCode: String,
  mobile: String,
  // store active refresh token for refresh flow invalidation
  refreshToken: String,
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (err) {
    // throw to propagate error to callers
    throw err;
  }
});

// helper methods for managing refresh token
userSchema.methods.setRefreshToken = function (token) {
  this.refreshToken = token;
  return this.save();
};

userSchema.methods.clearRefreshToken = function () {
  this.refreshToken = undefined;
  return this.save();
};

userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
