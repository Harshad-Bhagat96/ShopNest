const express = require("express");
const pageController = require("../controllers/pageController");

const router = express.Router();

router.get("/", pageController.home);
router.get("/index.html", (req, res) => res.redirect("/"));
router.get("/login.html", pageController.login);
router.get("/register.html", pageController.register);
router.get("/reset-password.html", pageController.resetPassword);
router.get("/product.html", pageController.product);
router.get("/cart.html", pageController.cart);
router.get("/orders.html", pageController.orders);
router.get("/profile.html", pageController.profile);
router.get("/admin.html", pageController.admin);

module.exports = router;
