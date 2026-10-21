
/* =========================================
   1. IMPORT REQUIRED PACKAGES
========================================= */

// Load environment variables from the .env file
require("dotenv").config();

// Import Mongoose for MongoDB operations
const mongoose = require("mongoose");

// Import bcrypt for password hashing
const bcrypt = require("bcryptjs");


/* =========================================
   2. DEFINE PRODUCT MODEL
========================================= */

const Product = mongoose.model(
    "Product",
    new mongoose.Schema(
        {
            // Product name is required
            name: {
                type: String,
                required: true
            },

            // Product description
            description: String,

            // Product category
            category: {
                type: String,
                default: "General"
            },

            // Product price must be non-negative
            price: {
                type: Number,
                min: 0,
                required: true
            },

            // Available stock quantity
            stock: {
                type: Number,
                min: 0,
                default: 0
            },

            // Product image URL
            image: String,

            // Indicates whether the product is featured
            featured: {
                type: Boolean,
                default: false
            }
        },
        {
            // Automatically add createdAt and updatedAt
            timestamps: true
        }
    )
);


/* =========================================
   3. DEFINE USER MODEL
========================================= */

const User = mongoose.model(
    "User",
    new mongoose.Schema(
        {
            // User's name
            name: String,

            // Email must be unique and stored in lowercase
            email: {
                type: String,
                unique: true,
                lowercase: true
            },

            // Stores the hashed password, not the plain password
            passwordHash: String,

            // User role defaults to customer
            role: {
                type: String,
                default: "customer"
            },

            // User's delivery address
            address: String
        },
        {
            // Automatically add createdAt and updatedAt
            timestamps: true
        }
    )
);


/* =========================================
   4. MAIN SEED FUNCTION
========================================= */

async function main() {

    // Check whether MongoDB connection string is configured
    if (!process.env.MONGO_URI) {
        throw Error("Set MONGO_URI in .env");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);


    /* =========================================
       5. INSERT DEMO PRODUCTS
    ========================================= */

    // Insert sample products only if no products exist
    if (!await Product.countDocuments()) {

        await Product.insertMany([

            // Product 1: Wireless Headphones
            {
                name: "Wireless Headphones",
                description: "Comfortable everyday headphones.",
                category: "Electronics",
                price: 2499,
                stock: 20,
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
                featured: true
            },

            // Product 2: Smart Watch
            {
                name: "Smart Watch",
                description: "A simple everyday smartwatch.",
                category: "Electronics",
                price: 3299,
                stock: 18,
                image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",
                featured: true
            },

            // Product 3: Everyday Backpack
            {
                name: "Everyday Backpack",
                description: "A useful bag for work and travel.",
                category: "Fashion",
                price: 1499,
                stock: 30,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80"
            },

            // Product 4: Desk Lamp
            {
                name: "Desk Lamp",
                description: "A lamp for study and work.",
                category: "Home",
                price: 899,
                stock: 12,
                image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80"
            },

            // Product 5: Bluetooth Speaker
            {
                name: "Bluetooth Speaker",
                description: "Portable speaker for music.",
                category: "Electronics",
                price: 1799,
                stock: 20,
                image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80",
                featured: true
            }

        ]);
    }


    /* =========================================
       6. CREATE ADMIN USER
    ========================================= */

    // Read admin credentials from environment variables
    const email = String(
        process.env.ADMIN_EMAIL || ""
    ).toLowerCase();

    const password = String(
        process.env.ADMIN_PASSWORD || ""
    );

    /*
        Create an admin only when:
        1. An email is configured.
        2. The password has at least 12 characters.
        3. A user with that email does not already exist.
    */
    if (
        email &&
        password.length >= 12 &&
        !await User.findOne({ email })
    ) {
        await User.create({
            name: "Store Admin",
            email,

            // Hash the password before saving it
            passwordHash: await bcrypt.hash(password, 12),

            // Assign the admin role
            role: "admin"
        });
    }


    /* =========================================
       7. FINISH DATABASE SEEDING
    ========================================= */

    console.log("Seed complete.");

    // Close the MongoDB connection
    await mongoose.disconnect();
}


/* =========================================
   8. RUN THE SCRIPT
========================================= */

// Execute main() and handle any errors
main().catch(e => {
    console.error(e);
    process.exit(1);
});
