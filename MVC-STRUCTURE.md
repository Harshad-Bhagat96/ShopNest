# ShopNest MVC organization

- `server.js` — existing server, database connection, Mongoose schemas, middleware,
  and API handlers. Existing backend logic remains in place to minimize behavior changes.
- `routes/pageRoutes.js` — page URL definitions.
- `controllers/pageController.js` — page rendering logic (`res.render()`).
- `views/` — EJS templates.
- `public/css/` and `public/js/` — existing CSS and browser-side JavaScript.
- `seed.js` — original seed script.
- `ShopNest.postman_collection.json` — original Postman collection.

## Request flow for pages

Browser URL → `routes/pageRoutes.js` → `controllers/pageController.js` → `views/*.ejs`

API endpoints are kept in their original locations in `server.js`, preserving their
paths, middleware, validation, and response formats. The Mongoose schemas are not yet
extracted to separate files; this is a conservative MVC step focused on page rendering.

## Run

1. Run `npm install`.
2. Configure `.env` with the same values as the original project.
3. Run `npm start`.
4. Open `http://localhost:3000`.
