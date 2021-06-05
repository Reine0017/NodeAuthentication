const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const config = require("./config/config").get(process.env.NODE_ENV);

const app = express();

const user = require("./routes/userService");

const connect = mongoose.connect(config.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

//MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/users", user);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Backend httpServer running at ${port}/`);
});