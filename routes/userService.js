const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const config = require("../config/config").get(process.env.NODE_DEV);
const sgMail = require("@sendgrid/mail");
const _ = require("lodash");

const jwt = require("jsonwebtoken");

//MODELS
const { UserModel } = require("../models/user");

const EMAIL_SENT_FROM = "smth@<yourDOMAIN>.com"

//First time registration
router.post("/register", (req, res) => {
  UserModel.findOne(
    {
      $or: [{ email: req.body.email.toLowerCase() }, { username: req.body.username }],
    },
    (err, existingUser) => {
      if (existingUser) {
        if (existingUser.username === req.body.username) {
          return res.status(400).json({
            message: "This username has already been registered",
          });
        } else {
          return res.status(400).json({
            message: "This email has already been registered",
          });
        }
      } else {
        const email = req.body.email.toLowerCase();
        const password = req.body.password;
        const username = req.body.username;

        var activationToken = jwt.sign(
          { email, password, username },
          config.ACTIVATION_SECRET,
          { expiresIn: "20m" }
        );

        sgMail.setApiKey(config.SENDGRID_API_KEY);
        const msg = {
          to: req.body.email.toLowerCase(),
          from: EMAIL_SENT_FROM,
          subject: "Click link to activate account",
          html: `<h2>Here's your activation link!</h2>
          <a href="${config.CLIENT_URL}/login?activate=${activationToken}">${config.CLIENT_URL}/login?activate=${activationToken}</a>
          <p>Thank you for creating an account with <your app name> 😄 For security reasons, this link will expire within 20 mins! </p>`,
        };
        sgMail.send(msg, (err, result) => {
          if (err) {
            return res.status(400).send({
              message: "Something went wrong, check your email again",
            });
          }
          res.status(200).send({
            message:
              "Activation Email Successfully Sent (link will expire in 20 mins)!",
          });
        });
      }
    }
  );
});

router.post("/activateUser", (req, res) => {
  const activationToken = req.body.activationToken;
  if (activationToken) {
    jwt.verify(activationToken, config.ACTIVATION_SECRET, function (
      err,
      decodedToken
    ) {
      if (err)
        return res
          .status(400)
          .json({ message: "Incorrect/Expired Link, try signing up again" });
      const { email, password, username } = decodedToken;

      UserModel.findOne(
        {
          $or: [{ email: email }, { username: username }],
        },
        (err, existingUser) => {
          if (err) {
            return res.status(400).json({
              message: "Something went wrong, please wait 20 mins then try again"
            })
          } else {
            if (existingUser.username === username) {
              return res.status(400).json({
                message: "This username has already been registered",
              });
            } else if (existingUser.email === email) {
              return res.status(400).json({
                message: "This email has already been registered",
              });
            } else {
              const user = new UserModel({
                email,
                password,
                username,
              });
              user.save((err, doc) => {
                if (err) return res.status(400).json({ message: "Something went wrong with activation" });
                res.status(200).json({
                  message: "Account Activation Success! Please Sign In",
                  registeredUser: {
                    id: doc._id,
                    name: doc.username,
                    email: doc.email,
                  },
                });
              });
            }
          }
        }
      );
    });
  } else {
    return res.status(400).json({ message: "Incorrect/Expired Link, try signing up again" });
  }
});

// For frontend - when logging in (after email activation), just log in with email and password (not username)
router.post("/signin", (req, res) => {
  UserModel.findOne({ email: req.body.email.toLowerCase() }, (err, user) => {
    if (!user)
      return res.status(401).json({
        message: "Auth failed, wrong email",
        userData: {},
      });

    user.comparePasswords(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.status(401).json({
          message: "Auth failed, wrong password",
          userData: {},
        });

      user.generateToken((err, user) => {
        if (err)
          return res
            .status(401)
            .json({ 
              message: "failed sign in!", 
              err 
            });

        res.cookie("x_auth", user.token).status(200).json({
          message: "Successful Sign In!",
          userData: {
            id: user._id,
            name: user.username,
            email: user.email,
          },
        });
      });
    });
  });
});

router.get("/auth", authenticateToken, (req, res) => {
  res.status(200).json({
    userData: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    },
  });
});

//authenticateToken middleware is used here because we need to know which user's token to remove
router.get("/logout", authenticateToken, (req, res) => {
  req.user.deleteToken(req.token, (err, user) => {
    if (err) return res.status(400).send({ message: "Error deleting token, cannot log you out" });
    res.status(200).send({ message: "Logging out user" });
  });
});

router.put("/forgotPassword", (req, res) => {
  const email = req.body.resetEmail.toLowerCase()

  UserModel.findOne({email}, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        message: "Auth failed, email not found",
      });
    } else {
        var passwordResetToken = jwt.sign(
          { _id: user._id },
          config.RESET_PASSWORD_KEY,
          { expiresIn: "20m" }
        );

        sgMail.setApiKey(config.SENDGRID_API_KEY);
        const msg = {
          to: email,
          from: EMAIL_SENT_FROM,
          subject: "Click link to reset your password",
          html: `<h2>Here's your password-reset link!</h2>
          <a href="${config.CLIENT_URL}/forgotPassword?token=${passwordResetToken}">${config.CLIENT_URL}/forgotPassword?token=${passwordResetToken}</a>
          <p>For security reasons, this link will expire within 20 mins! </p>`,
        };

        return user.updateOne({resetLinkToken: passwordResetToken}, (err,success) => {
          if (err) {
            return res.status(400).json({
              message: "Reset password link error",
            });
          } else {
            //send email for password reset
            sgMail.send(msg, (err, result) => {
              if (err) {
                return res.status(400).send({
                  message: "Something went wrong, check your email again",
                });
              }
              res.status(200).send({
                message:
                  "Password Reset Email Successfully Sent (link will expire in 20 mins)!",
              });
            });
          }
        })
    }
      
  })
});

router.put("/resetPassword", (req,res) => {
  const { resetLinkToken, newPassword } = req.body;
  if (resetLinkToken) {
    // reset the password
    jwt.verify(resetLinkToken, config.RESET_PASSWORD_KEY, (err, decodedData) => {
      if (err) {
        return res.status(401).send({
          message: "Incorrect or Expired Reset Password Link, please resend forgot password email from Login page.",
        }); 
      } 

      UserModel.findOne({resetLinkToken}, (err, user) => {
        if (err || !user) {
          return res.status(400).json({message: "User or Token does not exist!"})
        }

        user = _.extend(user, {
          password: newPassword,
          resetLinkToken: ""
        })
        user.save((err, result) => {
          if (err) {
            return res.status(400).json({message: "User or Token does not exist!"})
          } else {
            return res.status(200).json({message: "Your new password has been saved. Please go to login page to sign in again"})
          }
        })
      })
    })
  } else {
    return res.status(401).send({
      message: "Something went wrong with the reset link.",
    });
  }
})


module.exports = router;