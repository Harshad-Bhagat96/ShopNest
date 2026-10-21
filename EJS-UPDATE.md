# EJS update

- HTML pages were moved to `views/*.ejs`.
- Express now uses EJS and page routes call `res.render()`.
- Static assets remain under `public/css` and `public/js`.
- Existing API routes and browser scripts are preserved.
- Run `npm install`, configure `.env`, then `npm start`.

Note: EJS is used to render the page templates. The current project still fetches product/cart/account data through its existing API and browser JavaScript, so those functionalities are not rewritten into server-side EJS loops.
