# ShopNest — Start Here

This project uses plain HTML, CSS, and browser JavaScript, with Node.js, Express, MongoDB/Mongoose, and EJS templates. It does **not** use React or Tailwind CSS. Redux Core is used without React.

## 1. Install prerequisites

- Install a current Node.js LTS version.
- Start a local MongoDB service, or create a MongoDB Atlas database.

## 2. Configure the project

1. Copy `.env.example` and name the copy `.env`.
2. Set `MONGO_URI` to your database connection string.
3. Set `JWT_SECRET` to a long random secret.
4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`; use a strong password with at least 12 characters.
5. For Gmail notifications, enable 2-Step Verification and create a Google App Password. Put the Gmail address in `SMTP_USER`, the App Password in `SMTP_PASS`, and keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false`.
6. Keep `.env` private. Never share it or commit it to Git.

## 3. Install and run

Open a terminal in this folder and run:

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:3000`. Use `npm start` for a normal server start without watch mode. Stop the server with `Ctrl+C`.

## 4. Important pages

- Store: `http://localhost:3000/`
- Login: `http://localhost:3000/login.html`
- Register: `http://localhost:3000/register.html`
- Cart: `http://localhost:3000/cart.html`
- Orders: `http://localhost:3000/orders.html`
- Admin: `http://localhost:3000/admin.html`

## 5. Test delivery email

1. Make sure the customer's account has a valid email address.
2. Confirm the SMTP variables in `.env` are correct. Gmail requires an App Password, not your normal Gmail password.
3. Start/restart the server after editing `.env`.
4. Log in as admin and change an order status to **Delivered**.
5. Read the admin dashboard message and the server terminal if email fails. Also check Spam/Junk.

Changing an order status saves the order even if the email provider fails. The dashboard and server log should help identify the SMTP issue. Email delivery cannot be guaranteed until the real SMTP credentials are configured and tested.

## 6. Optional integrations

- **Razorpay:** configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Use test keys during development. Never put the secret in frontend JavaScript.
- **Cloudinary:** configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. You can use a public image URL without Cloudinary.

## 7. Project map

- `server.js` — Express API, database models, authentication, orders, payments, and email sending.
- `seed.js` — sample data and configured admin setup.
- `views/` — EJS page templates.
- `public/css/` — stylesheets.
- `public/js/` — browser-side features (store, auth, cart, orders, profile, admin, Redux Core store).
- `routes/` and `controllers/` — page routing and rendering.
- `.env.example` — names of supported environment variables; it contains placeholders, not secrets.

## Notes

This is a learning project, not a production-certified store. Do not use real payment credentials until you have reviewed security, payment webhooks, validation, and deployment settings.
