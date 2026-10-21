# ShopNest — Vanilla JavaScript e-commerce project

A learning-oriented full-stack store using **HTML, CSS, vanilla JavaScript, Node.js, Express, MongoDB/Mongoose**. It deliberately does not use React or Tailwind CSS. It uses Redux Core for a small amount of browser state management, without React or React-Redux.

## Features
- Register/login with bcrypt password hashing, JWT auth and protected API routes
- Forgot/reset password token flow; SMTP email delivery is optional
- Product listing, search, category filter, detail page, featured products and stock checks
- Authenticated cart with add/update/remove
- Checkout with Cash on Delivery or optional Razorpay order creation and server-side signature verification
- User profile and order history
- Admin dashboard with product CRUD, user role management, order status updates, paid revenue summary and recent orders
- Optional Cloudinary product image upload via Multer; image URL entry works without Cloudinary
- Optional SMTP order confirmation and status emails
- MongoDB/Mongoose schemas, sample seed script, Postman collection, Render deployment blueprint

## Run locally
1. Install Node.js LTS and run MongoDB locally or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`. Set `MONGO_URI`, a long random `JWT_SECRET`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` (12+ characters). Configure Gmail SMTP only if you want email notifications.
3. Run `npm install`.
4. Run `npm run seed` to add sample products and provision/promote the configured admin account.
5. Run `npm run dev` while developing (automatically restarts the server when watched files change), or `npm start` for a normal start.
6. Open http://localhost:3000.
6. Admin page: http://localhost:3000/admin.html. Sign in with the configured admin email/password.

## Optional integrations
### Razorpay
Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`. Start with Razorpay test credentials and test payments before using live keys. Server verifies the payment signature before creating a paid order. Never expose the secret in frontend code or commit `.env`.

### Cloudinary
Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Admin image upload accepts JPEG/PNG/WEBP/GIF up to 5 MB. Without credentials, use an existing public image URL instead.

### Email
Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and `APP_URL`. For Gmail, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false`. `SMTP_USER` is your Gmail address and `SMTP_PASS` must be a Google App Password (not your normal Gmail password). Create the App Password in your Google Account security settings after enabling 2-Step Verification. Keep `.env` private and never commit it.

When an admin changes an order status, ShopNest sends the existing status-update email. When the status changes to **Delivered**, it sends a delivery-completed email. The admin dashboard shows whether the delivery email was sent or whether SMTP configuration needs checking; server logs contain SMTP errors. If SMTP is not configured, the order status still saves, but no email is sent.

## Deployment to Render
Push this folder to a Git repository, create a Render Web Service from it, and set environment variables in Render. The included `render.yaml` is a starting blueprint. Use MongoDB Atlas for the database and set `APP_URL` to the deployed site URL. Add provider credentials only through the hosting dashboard.

## API testing
Import `ShopNest.postman_collection.json` into Postman. Set `baseUrl`; for protected endpoints, copy a JWT from the login response into `token`.

## Important limitations
This is an educational starter, not a certified production store. Configure provider credentials to enable external integrations. Before a public launch, add rate limiting, stronger request validation, security headers, CSRF protections if switching to cookies, logging/monitoring, tests, inventory transaction/locking, webhook reconciliation, refund handling, tax/shipping rules, and a proper email template. Payment success must be confirmed server-side and reconciled with Razorpay webhooks for production. Never use live keys during development.

## Redux with plain JavaScript (no React)

This version uses the official Redux core library in the browser, without React or Redux bindings for React. `public/js/redux-store.js` creates a Redux store and reducers for:

- `auth`: current user session display state (JWT stays in the existing token key)
- `cart`: cart items, item count, and subtotal, synced from the Express API
- `products`: catalogue data, loading state, search and category filters
- `ui`: latest user-facing message

The store persists safe UI/cart state to `localStorage` under `shopnestReduxState`. The backend remains authoritative: cart mutations, stock, orders, payments, and authentication are still validated by Express/MongoDB. Redux is client-side state management; it does not replace API calls or database storage. The Redux browser script loads from cdnjs, so an internet connection is needed to load that library on first page visit.


## EJS templating update

This version renders the existing pages with EJS templates stored in `views/`.
The page routes in `server.js` call `res.render(...)`. Existing CSS and browser-side
JavaScript are served from `public/`; the original `/api/...` endpoints and their
business logic are retained. Product data, cart operations, authentication, checkout,
orders, profile, and admin behavior continue to use the same API and client scripts.



## MVC organization

See `MVC-STRUCTURE.md`. Page routes and page rendering controllers are separated, while existing API and database code remains in `server.js` to reduce the risk of changing functionality.
