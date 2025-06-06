const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/login", authController.postLogin);
router.post("/signup", authController.postSignup);

router.get("/logout", authController.getLogout);
router.get("/", authController.getHome);

module.exports = router;