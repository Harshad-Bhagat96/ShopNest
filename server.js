
/* =========================================
   1. IMPORT PACKAGES
========================================= */

require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");


/* =========================================
   2. INITIALIZE EXPRESS
========================================= */

const app = express();
const PORT = process.env.PORT || 3000;

// JWT_SECRET is required for signing and verifying tokens
if (!process.env.JWT_SECRET) {
    console.error("Set JWT_SECRET in .env");
    process.exit(1);
}

// Parse incoming JSON request bodies
app.use(express.json({ limit: "2mb" }));

// Configure EJS templates and serve only frontend assets (CSS/JS/images) statically.
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));


app.use("/", require("./routes/pageRoutes"));


/* =========================================
   3. DEFINE MONGOOSE MODELS
========================================= */

// User model
const User = mongoose.model(
    "User",
    new mongoose.Schema(
        {
            name: {
                type: String,
                required: true
            },

            email: {
                type: String,
                unique: true,
                lowercase: true,
                required: true
            },

            // Store a hashed password, never the plain password
            passwordHash: {
                type: String,
                required: true
            },

            // Users can be customers or admins
            role: {
                type: String,
                enum: ["customer", "admin"],
                default: "customer"
            },

            address: {
                type: String,
                default: ""
            },

            // Fields used for password reset
            resetTokenHash: String,
            resetTokenExpires: Date
        },
        {
            timestamps: true
        }
    )
);


// Product model
const Product = mongoose.model(
    "Product",
    new mongoose.Schema(
        {
            name: {
                type: String,
                required: true
            },

            description: String,

            category: {
                type: String,
                default: "General"
            },

            price: {
                type: Number,
                min: 0,
                required: true
            },

            stock: {
                type: Number,
                min: 0,
                default: 0
            },

            image: String,

            featured: {
                type: Boolean,
                default: false
            }
        },
        {
            timestamps: true
        }
    )
);


// Cart model
const Cart = mongoose.model(
    "Cart",
    new mongoose.Schema(
        {
            // Each cart belongs to one user
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                unique: true
            },

            // Products and their quantities
            items: [
                {
                    product: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Product"
                    },

                    quantity: {
                        type: Number,
                        min: 1
                    }
                }
            ]
        },
        {
            timestamps: true
        }
    )
);


// Order model
const Order = mongoose.model(
    "Order",
    new mongoose.Schema(
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },

            // Snapshot of purchased product details
            items: [
                {
                    name: String,
                    image: String,
                    price: Number,
                    quantity: Number
                }
            ],

            address: {
                type: String,
                required: true
            },

            total: Number,

            status: {
                type: String,
                enum: [
                    "Placed",
                    "Processing",
                    "Shipped",
                    "Delivered",
                    "Cancelled"
                ],
                default: "Placed"
            },

            paymentStatus: {
                type: String,
                enum: ["pending", "paid", "failed", "cod"],
                default: "pending"
            },

            paymentProvider: String,
            paymentOrderId: String,
            paymentId: String
        },
        {
            timestamps: true
        }
    )
);


/* =========================================
   4. PAYMENT, IMAGE UPLOAD, AND EMAIL SETUP
========================================= */

// Initialize Razorpay only when both keys are configured
const razorpay =
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
        ? new Razorpay({
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET
          })
        : null;


// Check whether Cloudinary credentials are configured
const cloudinaryReady = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);


// Configure Cloudinary when credentials are available
if (cloudinaryReady) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}


// Configure Multer for image uploads
const upload = multer({
    storage: multer.memoryStorage(),

    // Maximum file size: 5 MB
    limits: {
        fileSize: 5 * 1024 * 1024
    },

    // Allow only supported image MIME types
    fileFilter: (req, file, cb) => {
        cb(
            null,
            /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)
        );
    }
});


// Create an email transporter when SMTP is configured
function mailer() {
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
    ) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE) === "true",

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}


// Send an email using the configured SMTP service
async function sendMail(to, subject, text) {
    const m = mailer();

    // Skip sending when email is not configured
    if (!m) {
        console.log(`[email not configured] ${subject} -> ${to}`);
        return false;
    }

    await m.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
    });

    return true;
}


/* =========================================
   5. AUTHENTICATION HELPERS AND MIDDLEWARE
========================================= */

// Return safe user information without the password hash
const safeUser = u => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    address: u.address
});


// Generate a JWT that expires after seven days
const tokenFor = u => {
    return jwt.sign(
        {
            id: u._id.toString()
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
};


// Authenticate requests using a Bearer token
async function auth(req, res, next) {
    try {
        // Extract the token from the Authorization header
        const token = (req.headers.authorization || "")
            .replace(/^Bearer /, "");

        if (!token) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        // Verify the token
        const p = jwt.verify(token, process.env.JWT_SECRET);

        // Load the latest user data from MongoDB
        req.user = await User.findById(p.id)
            .select("-passwordHash");

        if (!req.user) {
            return res.status(401).json({
                message: "Account not found."
            });
        }

        next();

    } catch {
        res.status(401).json({
            message: "Please log in again."
        });
    }
}


// Allow only admin users to access protected admin routes
const admin = (req, res, next) => {
    return req.user.role === "admin"
        ? next()
        : res.status(403).json({
              message: "Admin access required."
          });
};


// Prepare product fields from the request body
const productInput = b => ({
    name: String(b.name || "").trim(),
    description: String(b.description || ""),
    category: String(b.category || "General"),
    price: Number(b.price),
    stock: Number(b.stock),
    image: String(b.image || ""),
    featured: !!b.featured
});


/* =========================================
   6. HEALTH CHECK
========================================= */

// Check whether the API is responding
app.get("/api/health", (req, res) => {
    res.json({
        ok: true
    });
});


/* =========================================
   7. REGISTRATION AND LOGIN
========================================= */

// Register a new customer
app.post("/api/auth/register", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(req.body.password || "");

        // Validate required registration fields
        if (!name || !email || password.length < 8) {
            return res.status(400).json({
                message:
                    "Enter name, email, and password (8+ characters)."
            });
        }

        // Prevent duplicate email registrations
        if (await User.findOne({ email })) {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        // Hash the password and create the user
        const u = await User.create({
            name,
            email,
            passwordHash: await bcrypt.hash(password, 12)
        });

        // Return a token and safe user information
        res.status(201).json({
            token: tokenFor(u),
            user: safeUser(u)
        });

    } catch {
        res.status(500).json({
            message: "Registration failed."
        });
    }
});


// Log in an existing user
app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password = String(req.body.password || "");

    const u = await User.findOne({ email });

    // Verify the password
    if (!u || !await bcrypt.compare(password, u.passwordHash)) {
        return res.status(401).json({
            message: "Email or password incorrect."
        });
    }

    // Return the token and safe user information
    res.json({
        token: tokenFor(u),
        user: safeUser(u)
    });
});


/* =========================================
   8. FORGOT PASSWORD AND RESET PASSWORD
========================================= */

// Request a password-reset link
app.post("/api/auth/forgot-password", async (req, res) => {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

    const u = await User.findOne({ email });

    /*
        Return the same message whether the account exists or not.
        This helps reduce account enumeration.
    */
    if (u) {
        // Generate a random reset token
        const raw = crypto.randomBytes(32).toString("hex");

        // Store only the token's hash in MongoDB
        u.resetTokenHash = crypto
            .createHash("sha256")
            .update(raw)
            .digest("hex");

        // Expire the reset token after 30 minutes
        u.resetTokenExpires = Date.now() + 30 * 60 * 1000;

        await u.save();

        // Build the password-reset URL
        const url =
            (process.env.APP_URL || `http://localhost:${PORT}`) +
            "/reset-password.html?token=" +
            raw;

        // Send the reset link by email
        await sendMail(
            u.email,
            "ShopNest password reset",
            `Use this link within 30 minutes to reset your password: ${url}`
        );

        // Log the link during development only
        if (process.env.NODE_ENV !== "production") {
            console.log("Password reset URL:", url);
        }
    }

    res.json({
        message:
            "If the email is registered, password reset instructions have been sent."
    });
});


// Reset the password using a valid reset token
app.post("/api/auth/reset-password", async (req, res) => {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");

    if (password.length < 8 || !token) {
        return res.status(400).json({
            message: "Token and password (8+ characters) are required."
        });
    }

    // Hash the supplied token to find its stored hash
    const hash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    // Find a matching, unexpired reset token
    const u = await User.findOne({
        resetTokenHash: hash,
        resetTokenExpires: {
            $gt: Date.now()
        }
    });

    if (!u) {
        return res.status(400).json({
            message: "Reset link is invalid or expired."
        });
    }

    // Hash and save the new password
    u.passwordHash = await bcrypt.hash(password, 12);

    // Invalidate the reset token after successful use
    u.resetTokenHash = undefined;
    u.resetTokenExpires = undefined;

    await u.save();

    res.json({
        message: "Password updated. Please log in."
    });
});


/* =========================================
   9. USER PROFILE
========================================= */

// Get the current user's profile
app.get("/api/profile", auth, (req, res) => {
    res.json({
        user: safeUser(req.user)
    });
});


// Update the current user's profile
app.put("/api/profile", auth, async (req, res) => {
    const name = String(req.body.name || "").trim();

    if (!name) {
        return res.status(400).json({
            message: "Name required."
        });
    }

    const u = await User.findByIdAndUpdate(
        req.user._id,
        {
            name,
            address: String(req.body.address || "")
        },
        {
            new: true
        }
    ).select("-passwordHash");

    res.json({
        user: safeUser(u)
    });
});


/* =========================================
   10. PRODUCT ROUTES
========================================= */

// Get products, optionally filtering by category, featured status, or search
app.get("/api/products", async (req, res) => {
    const f = {};

    if (req.query.category && req.query.category !== "All") {
        f.category = req.query.category;
    }

    if (req.query.featured === "true") {
        f.featured = true;
    }

    if (req.query.search) {
        const search = String(req.query.search).slice(0, 80);

        f.$or = [
            {
                name: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: search,
                    $options: "i"
                }
            }
        ];
    }

    res.json({
        products: await Product.find(f)
            .sort({ createdAt: -1 })
            .limit(100)
    });
});


// Get one product by its MongoDB ID
app.get("/api/products/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({
            message: "Product not found."
        });
    }

    res.json({ product });
});


/* =========================================
   11. CART ROUTES
========================================= */

// Get the current user's cart and populate product details
app.get("/api/cart", auth, async (req, res) => {
    res.json({
        cart: await Cart.findOne({
            user: req.user._id
        }).populate("items.product") || {
            items: []
        }
    });
});


// Add a product to the cart
app.post("/api/cart/items", auth, async (req, res) => {
    const p = await Product.findById(req.body.productId);

    // Restrict requested quantity to between 1 and 99
    const q = Math.max(
        1,
        Math.min(99, parseInt(req.body.quantity, 10) || 1)
    );

    if (!p) {
        return res.status(404).json({
            message: "Product not found."
        });
    }

    // Find or create the user's cart
    let c = await Cart.findOne({
        user: req.user._id
    });

    if (!c) {
        c = await Cart.create({
            user: req.user._id,
            items: []
        });
    }

    // Check whether the product is already in the cart
    const i = c.items.find(
        x => x.product.toString() === p._id.toString()
    );

    // Prevent the requested quantity from exceeding stock
    if ((i ? i.quantity : 0) + q > p.stock) {
        return res.status(400).json({
            message: "Not enough stock."
        });
    }

    // Increase existing quantity or add a new item
    if (i) {
        i.quantity += q;
    } else {
        c.items.push({
            product: p._id,
            quantity: q
        });
    }

    await c.save();

    res.json({
        message: "Added to cart."
    });
});


// Update the quantity of an existing cart item
app.patch("/api/cart/items/:id", auth, async (req, res) => {
    const q = Number(req.body.quantity);

    const p = await Product.findById(req.params.id);

    const c = await Cart.findOne({
        user: req.user._id
    });

    // Validate product, cart, quantity, and stock
    if (
        !p ||
        !c ||
        !Number.isInteger(q) ||
        q < 1 ||
        q > p.stock
    ) {
        return res.status(400).json({
            message: "Invalid quantity or stock."
        });
    }

    const i = c.items.find(
        x => x.product.toString() === req.params.id
    );

    if (!i) {
        return res.status(404).json({
            message: "Item not in cart."
        });
    }

    i.quantity = q;

    await c.save();

    res.json({
        message: "Cart updated."
    });
});


// Remove a product from the cart
app.delete("/api/cart/items/:id", auth, async (req, res) => {
    const c = await Cart.findOne({
        user: req.user._id
    });

    if (c) {
        c.items = c.items.filter(
            x => x.product.toString() !== req.params.id
        );

        await c.save();
    }

    res.json({
        message: "Removed from cart."
    });
});


/* =========================================
   12. CART SNAPSHOT FOR CHECKOUT
========================================= */

// Build a checkout snapshot using current database prices and stock
async function cartSnapshot(userId, address) {
    const c = await Cart.findOne({
        user: userId
    }).populate("items.product");

    if (!c || !c.items.length) {
        throw new Error("Cart is empty.");
    }

    const items = [];
    let total = 0;

    // Validate each cart item and calculate the total
    for (const i of c.items) {
        if (!i.product) continue;

        if (i.product.stock < i.quantity) {
            throw new Error(
                "Insufficient stock for " + i.product.name
            );
        }

        items.push({
            productId: i.product._id,
            name: i.product.name,
            image: i.product.image,
            price: i.product.price,
            quantity: i.quantity
        });

        total += i.product.price * i.quantity;
    }

    if (!items.length) {
        throw new Error("Cart is empty.");
    }

    return {
        cart: c,
        items,
        total,
        address
    };
}


/* =========================================
   13. RAZORPAY PAYMENT ROUTES
========================================= */

// Create a Razorpay payment order
app.post(
    "/api/payments/razorpay/order",
    auth,
    async (req, res) => {
        try {
            if (!razorpay) {
                return res.status(503).json({
                    message:
                        "Razorpay is not configured. Add test keys to .env."
                });
            }

            const address = String(
                req.body.address || req.user.address || ""
            ).trim();

            if (!address) {
                return res.status(400).json({
                    message: "Enter a delivery address."
                });
            }

            const snap = await cartSnapshot(
                req.user._id,
                address
            );

            // Create the Razorpay order using the server-calculated total
            const rp = await razorpay.orders.create({
                amount: Math.round(snap.total * 100),
                currency: "INR",
                receipt: "shopnest_" + Date.now(),
                notes: {
                    userId: String(req.user._id)
                }
            });

            res.json({
                keyId: process.env.RAZORPAY_KEY_ID,
                razorpayOrderId: rp.id,
                amount: rp.amount,
                currency: rp.currency,
                items: snap.items.length
            });

        } catch (e) {
            res.status(400).json({
                message: e.message || "Could not create payment."
            });
        }
    }
);


// Verify a Razorpay payment and create the order
app.post(
    "/api/payments/razorpay/verify",
    auth,
    async (req, res) => {
        try {
            if (!razorpay) {
                return res.status(503).json({
                    message: "Razorpay is not configured."
                });
            }

            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                address: bodyAddress
            } = req.body;

            if (
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature
            ) {
                return res.status(400).json({
                    message: "Missing payment verification fields."
                });
            }

            // Recreate the expected signature on the server
            const expected = crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    razorpay_order_id + "|" + razorpay_payment_id
                )
                .digest("hex");

            // Compare the expected and received signatures
            if (
                !crypto.timingSafeEqual(
                    Buffer.from(expected),
                    Buffer.from(String(razorpay_signature))
                )
            ) {
                return res.status(400).json({
                    message: "Payment signature verification failed."
                });
            }

            const address = String(
                bodyAddress || req.user.address || ""
            ).trim();

            if (!address) {
                return res.status(400).json({
                    message: "Delivery address required."
                });
            }

            const snap = await cartSnapshot(
                req.user._id,
                address
            );

            // Retrieve the payment order from Razorpay
            const rpOrder = await razorpay.orders.fetch(
                razorpay_order_id
            );

            // Ensure the payment order belongs to this user and total
            if (
                String(rpOrder.notes?.userId) !==
                    String(req.user._id) ||
                Number(rpOrder.amount) !==
                    Math.round(snap.total * 100)
            ) {
                return res.status(400).json({
                    message: "Payment order does not match this cart."
                });
            }

            // Create an order marked as paid
            const order = await Order.create({
                user: req.user._id,

                items: snap.items.map(
                    ({ name, image, price, quantity }) => ({
                        name,
                        image,
                        price,
                        quantity
                    })
                ),

                address,
                total: snap.total,
                status: "Placed",
                paymentStatus: "paid",
                paymentProvider: "razorpay",
                paymentOrderId: razorpay_order_id,
                paymentId: razorpay_payment_id
            });

            // Reduce product stock
            for (const i of snap.items) {
                const updated = await Product.updateOne(
                    {
                        _id: i.productId,
                        stock: { $gte: i.quantity }
                    },
                    {
                        $inc: {
                            stock: -i.quantity
                        }
                    }
                );

                if (!updated.modifiedCount) {
                    await Order.findByIdAndDelete(order._id);

                    return res.status(409).json({
                        message:
                            "Stock changed during checkout. Please refresh your cart."
                    });
                }
            }

            // Clear the cart after successful order placement
            snap.cart.items = [];
            await snap.cart.save();

            // Send an order confirmation email
            await sendMail(
                req.user.email,
                "ShopNest order confirmation",
                `Thank you ${req.user.name}! Order ${order._id} is placed. Total: INR ${order.total}. Payment: paid.`
            );

            res.status(201).json({
                message: "Payment verified and order placed.",
                order
            });

        } catch (e) {
            res.status(400).json({
                message: e.message || "Payment verification failed."
            });
        }
    }
);


/* =========================================
   14. CASH-ON-DELIVERY ORDERS
========================================= */

app.post("/api/orders", auth, async (req, res) => {
    try {
        const address = String(
            req.body.address || req.user.address || ""
        ).trim();

        if (!address) {
            return res.status(400).json({
                message: "Enter a delivery address."
            });
        }

        const snap = await cartSnapshot(
            req.user._id,
            address
        );

        // Create a cash-on-delivery order
        const order = await Order.create({
            user: req.user._id,

            items: snap.items.map(
                ({ name, image, price, quantity }) => ({
                    name,
                    image,
                    price,
                    quantity
                })
            ),

            address,
            total: snap.total,
            paymentStatus: "cod",
            paymentProvider: "cash-on-delivery"
        });

        // Reduce stock for the ordered products
        for (const i of snap.items) {
            const r = await Product.updateOne(
                {
                    _id: i.productId,
                    stock: { $gte: i.quantity }
                },
                {
                    $inc: {
                        stock: -i.quantity
                    }
                }
            );

            if (!r.modifiedCount) {
                return res.status(409).json({
                    message:
                        "Stock changed; please retry checkout."
                });
            }
        }

        // Clear the cart
        snap.cart.items = [];
        await snap.cart.save();

        // Send the order confirmation email
        await sendMail(
            req.user.email,
            "ShopNest order confirmation",
            `Thank you ${req.user.name}! Order ${order._id} is placed. Total: INR ${order.total}. Payment: cash on delivery.`
        );

        res.status(201).json({
            message: "Cash-on-delivery order placed.",
            order
        });

    } catch (e) {
        res.status(400).json({
            message: e.message || "Could not place order."
        });
    }
});


/* =========================================
   15. CUSTOMER ORDER HISTORY
========================================= */

// Return only the logged-in user's orders
app.get(
    "/api/orders/my-orders",
    auth,
    async (req, res) => {
        res.json({
            orders: await Order.find({
                user: req.user._id
            }).sort({
                createdAt: -1
            })
        });
    }
);


/* =========================================
   16. ADMIN PRODUCT ROUTES
========================================= */

// Get all products for the admin dashboard
app.get(
    "/api/admin/products",
    auth,
    admin,
    async (req, res) => {
        res.json({
            products: await Product.find().sort({
                createdAt: -1
            })
        });
    }
);


// Create a product
app.post(
    "/api/admin/products",
    auth,
    admin,
    async (req, res) => {
        try {
            res.status(201).json({
                product: await Product.create(
                    productInput(req.body)
                )
            });
        } catch (e) {
            res.status(400).json({
                message: e.message
            });
        }
    }
);


// Update a product
app.put(
    "/api/admin/products/:id",
    auth,
    admin,
    async (req, res) => {
        try {
            const p = await Product.findByIdAndUpdate(
                req.params.id,
                productInput(req.body),
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!p) {
                return res.status(404).json({
                    message: "Product not found."
                });
            }

            res.json({ product: p });

        } catch (e) {
            res.status(400).json({
                message: e.message
            });
        }
    }
);


// Delete a product
app.delete(
    "/api/admin/products/:id",
    auth,
    admin,
    async (req, res) => {
        await Product.findByIdAndDelete(req.params.id);

        res.json({
            message: "Deleted."
        });
    }
);


/* =========================================
   17. ADMIN ORDER AND OVERVIEW ROUTES
========================================= */

// Get recent orders, including each customer's name and email
app.get(
    "/api/admin/orders",
    auth,
    admin,
    async (req, res) => {
        res.json({
            orders: await Order.find()
                .populate("user", "name email")
                .sort({ createdAt: -1 })
                .limit(100)
        });
    }
);


// Get dashboard statistics
app.get(
    "/api/admin/overview",
    auth,
    admin,
    async (req, res) => {
        const [
            users,
            products,
            orders,
            paid,
            allOrders
        ] = await Promise.all([
            User.countDocuments({
                role: "customer"
            }),

            Product.countDocuments(),

            Order.countDocuments(),

            // Calculate revenue from paid orders
            Order.aggregate([
                {
                    $match: {
                        paymentStatus: "paid"
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: {
                            $sum: "$total"
                        }
                    }
                }
            ]),

            // Count orders grouped by their status
            Order.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: {
                            $sum: 1
                        }
                    }
                }
            ])
        ]);

        res.json({
            users,
            products,
            orders,
            revenue: paid[0]?.revenue || 0,
            orderStatuses: allOrders
        });
    }
);


// Get user information for the admin dashboard
app.get(
    "/api/admin/users",
    auth,
    admin,
    async (req, res) => {
        res.json({
            users: await User.find()
                .select("name email role createdAt address")
                .sort({ createdAt: -1 })
                .limit(200)
        });
    }
);


/* =========================================
   18. ADMIN USER ROLE MANAGEMENT
========================================= */

// Update a user's role
app.patch(
    "/api/admin/users/:id/role",
    auth,
    admin,
    async (req, res) => {
        // Allow only supported roles
        if (!["customer", "admin"].includes(req.body.role)) {
            return res.status(400).json({
                message: "Invalid role."
            });
        }

        // Prevent the current admin from removing their own role
        if (
            String(req.user._id) === req.params.id &&
            req.body.role !== "admin"
        ) {
            return res.status(400).json({
                message: "You cannot remove your own admin role."
            });
        }

        const u = await User.findByIdAndUpdate(
            req.params.id,
            {
                role: req.body.role
            },
            {
                new: true
            }
        ).select("name email role");

        if (!u) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json({ user: u });
    }
);


// Update an order's status
app.patch(
    "/api/admin/orders/:id/status",
    auth,
    admin,
    async (req, res) => {
        const allowed = [
            "Placed",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowed.includes(req.body.status)) {
            return res.status(400).json({
                message: "Invalid order status."
            });
        }

        // Read the current status first so we only send a delivery email
        // when the order actually changes to Delivered (not on every refresh).
        const previousOrder = await Order.findById(req.params.id).select("status");

        if (!previousOrder) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const statusChanged = previousOrder.status !== req.body.status;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status: req.body.status
            },
            {
                new: true
            }
        ).populate("user", "name email");

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        // Keep the existing status-update email behavior. When an order is
        // marked Delivered, send a clearer delivery-completed notification.
        // Email failures must not undo the already-saved order status.
        let emailSent = false;
        let emailMessage = "No email was sent because the order status did not change.";

        if (statusChanged && order.user?.email) {
            const isDelivered = order.status === "Delivered";
            const subject = isDelivered
                ? "Your ShopNest order has been delivered"
                : "ShopNest order update";
            const message = isDelivered
                ? `Hello ${order.user.name || "Customer"},\n\nGood news! Your ShopNest order ${order._id} has been marked as delivered.\n\nOrder total: INR ${Number(order.total || 0).toFixed(2)}\n\nThank you for shopping with ShopNest!`
                : `Hello ${order.user.name || "Customer"},\n\nYour ShopNest order ${order._id} status is now: ${order.status}.`;

            try {
                emailSent = await sendMail(order.user.email, subject, message);
                emailMessage = emailSent
                    ? `Email sent to ${order.user.email}.`
                    : "Order status saved, but email is not configured. Check SMTP settings in .env.";
            } catch (mailError) {
                console.error(
                    `Failed to send order-status email for order ${order._id} to ${order.user.email}:`,
                    mailError.message
                );
                emailMessage = "Order status saved, but the email could not be sent. Check SMTP settings and server logs.";
            }
        } else if (statusChanged && !order.user?.email) {
            emailMessage = "Order status saved, but this order has no customer email address.";
            console.warn(`Order ${order._id} has no customer email; status email skipped.`);
        }

        res.json({
            order,
            email: {
                sent: emailSent,
                message: emailMessage
            }
        });
    }
);


/* =========================================
   19. ADMIN IMAGE UPLOAD
========================================= */

// Upload a product image to Cloudinary
app.post(
    "/api/admin/upload",
    auth,
    admin,

    // Handle the multipart image upload
    (req, res, next) => {
        upload.single("image")(req, res, e => {
            if (e) {
                return res.status(400).json({
                    message: e.message
                });
            }

            next();
        });
    },

    async (req, res) => {
        try {
            if (!cloudinaryReady) {
                return res.status(503).json({
                    message:
                        "Cloudinary is not configured. You can still use an image URL."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message:
                        "Choose an image file (JPEG, PNG, WEBP or GIF, max 5 MB)."
                });
            }

            // Upload the image buffer to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "shopnest/products",
                        resource_type: "image"
                    },
                    (err, r) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(r);
                        }
                    }
                );

                stream.end(req.file.buffer);
            });

            res.status(201).json({
                url: result.secure_url,
                publicId: result.public_id
            });

        } catch (e) {
            res.status(400).json({
                message: e.message || "Upload failed."
            });
        }
    }
);


/* =========================================
   20. DEMO PRODUCT SEED ROUTE
========================================= */

// Add demo products when the database is empty
app.post("/api/demo/seed", async (req, res) => {

    // Prevent demo seeding in production
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
            message: "Disabled in production."
        });
    }

    // Do not duplicate products
    if (await Product.countDocuments()) {
        return res.json({
            message: "Products already exist."
        });
    }

    // Demo product data
    const products = [
        [
            "Wireless Headphones",
            "Comfortable everyday headphones.",
            "Electronics",
            2499,
            20,
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
            true
        ],
        [
            "Smart Watch",
            "A simple everyday smartwatch.",
            "Electronics",
            3299,
            18,
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",
            true
        ],
        [
            "Everyday Backpack",
            "A useful bag for work and travel.",
            "Fashion",
            1499,
            30,
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",
            false
        ],
        [
            "Desk Lamp",
            "A lamp for study and work.",
            "Home",
            899,
            12,
            "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80",
            false
        ],
        [
            "Bluetooth Speaker",
            "Portable speaker for music.",
            "Electronics",
            1799,
            20,
            "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80",
            true
        ],
        [
            "Classic T-Shirt",
            "An everyday casual T-shirt.",
            "Fashion",
            599,
            40,
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",
            false
        ]
    ].map(
        ([
            name,
            description,
            category,
            price,
            stock,
            image,
            featured
        ]) => ({
            name,
            description,
            category,
            price,
            stock,
            image,
            featured
        })
    );

    await Product.insertMany(products);

    res.status(201).json({
        message: "Sample products added."
    });
});


/* =========================================
   21. INITIAL ADMIN SETUP
========================================= */

// Create an admin from environment variables if the account is missing
async function setupAdmin() {
    const email = String(
        process.env.ADMIN_EMAIL || ""
    ).trim().toLowerCase();

    const password = String(
        process.env.ADMIN_PASSWORD || ""
    );

    // Require an email and a password of at least 12 characters
    if (!email || password.length < 12) {
        return;
    }

    // Do not recreate or promote an existing account
    if (!await User.findOne({ email })) {
        await User.create({
            name: "Store Admin",
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role: "admin"
        });
    }
}


/* =========================================
   22. CONNECT TO MONGODB AND START SERVER
========================================= */

mongoose.connect(process.env.MONGO_URI || "")
    .then(async () => {
        console.log("MongoDB connected");

        // Ensure the configured admin exists
        await setupAdmin();

        // Start listening for HTTP requests
        app.listen(PORT, () => {
            console.log("Open http://localhost:" + PORT);
        });
    })
    .catch(e => {
        console.error(
            "MongoDB connection failed:",
            e.message
        );

        process.exit(1);
    });
