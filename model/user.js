const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/config").get(process.env.NODE_DEV);
const SALT_I = 10;

const UserSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    unique: 1,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  resetLinkToken: {
    data: String,
    default: '',
  },
  username: {
    type: String,
    maxlength: 50,
    required: true,
    unique: 1,
  },
  token: {
    type: String,
  },
});

UserSchema.pre("save", function (next) {
  var user = this;

  if (user.isModified("password")) {
    bcrypt.genSalt(SALT_I, function (err, salt) {
      if (err) return next(err);
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

//cb just stands for callback function - can replace with other names
UserSchema.methods.comparePasswords = function (candidatePassword, cb) {
  var user = this;
  bcrypt.compare(candidatePassword, user.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

UserSchema.methods.generateToken = function (cb) {
  var user = this;
  //dont have to use _id for encode and decode, can choose smth else
  var token = jwt.sign(user._id.toHexString(), config.PERSIST_LOGIN_SECRET);

  user.token = token;
  user.save(function (err, user) {
    if (err) return cb(err);
    cb(null, user);
  });
};

UserSchema.statics.findByToken = function (token, cb) {
  var user = this;

  jwt.verify(token, config.PERSIST_LOGIN_SECRET, function (err, decode) {
    //dont have to use _id for encode and decode, can choose smth else
    user.findOne({ _id: decode, token: token }, function (err, user) {
      if (err) return cb(err);
      //null means send no error
      cb(null, user);
    });
  });
};

UserSchema.methods.deleteToken = function (token, cb) {
  var user = this;

  user.updateOne({ $unset: { token: 1 } }, function (err, user) {
    if (err) return cb(err);
    cb(null, user);
  });
};

module.exports.UserModel = mongoose.model("UserModel", UserSchema);
