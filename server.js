require("dotenv").config();
const express = require("express");
const cors = require("cors");

const checkRoute = require("./routes/check");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/check", checkRoute);

app.listen(5000, () => console.log("Server running"));