// Page controller: render the EJS template for each browser page.
exports.home = (req, res) => res.render("index");
exports.login = (req, res) => res.render("login");
exports.register = (req, res) => res.render("register");
exports.resetPassword = (req, res) => res.render("reset-password");
exports.product = (req, res) => res.render("product");
exports.cart = (req, res) => res.render("cart");
exports.orders = (req, res) => res.render("orders");
exports.profile = (req, res) => res.render("profile");
exports.admin = (req, res) => res.render("admin");
