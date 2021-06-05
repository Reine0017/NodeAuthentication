const { UserModel } = require("../models/user");

let authenticateToken = (req, res, next) => {
  let token = req.cookies.x_auth;

  UserModel.findByToken(token, (err, user) => {
    // if (err) throw err;
    if (err) return res.status(400).send({ auth: false, message: "There's an error - we're unable to authenticate you!" });
    if (!user) return res.status(400).send({ auth: false, message: "Wrong cookie!" });

    // return request with the token
    req.token = token;
    // user consists of user info, can change to user.email etc
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
