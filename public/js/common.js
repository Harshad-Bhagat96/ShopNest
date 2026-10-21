
/* =========================================
   AUTHENTICATION AND SESSION MANAGEMENT
========================================= */

// Retrieve the authentication token from localStorage
const token = () => {
    return localStorage.getItem("storeToken") || "";
};

// Retrieve the logged-in user's information
const user = () => {
    try {
        return JSON.parse(
            localStorage.getItem("storeUser") || "null"
        );
    } catch {
        return null;
    }
};

// Save the login session after successful authentication
const saveSession = d => {
    // Store the JWT token
    localStorage.setItem("storeToken", d.token);

    // Store user information as a JSON string
    localStorage.setItem(
        "storeUser",
        JSON.stringify(d.user)
    );

    // Update the user in Redux
    window.shopActions?.setUser(d.user);
};

// Log out the current user
const logout = () => {
    // Remove authentication information
    localStorage.removeItem("storeToken");
    localStorage.removeItem("storeUser");

    // Update Redux state
    window.shopActions?.logout();

    // Redirect to the login page
    location.href = "/login.html";
};


/* =========================================
   API REQUEST HELPER
========================================= */

// Send HTTP requests to the backend API
async function api(path, opts = {}) {

    // Copy any existing request headers
    const h = {
        ...(opts.headers || {})
    };

    // Convert JavaScript objects into JSON
    if (opts.body && typeof opts.body !== "string") {
        h["Content-Type"] = "application/json";
        opts.body = JSON.stringify(opts.body);
    }

    // Attach the authentication token when available
    if (token()) {
        h.Authorization = "Bearer " + token();
    }

    // Send the request to the backend
    const r = await fetch("/api" + path, {
        ...opts,
        headers: h
    });

    // Parse the response as JSON
    const d = await r.json().catch(() => ({}));

    // Throw an error for unsuccessful responses
    if (!r.ok) {
        throw Error(d.message || "Request failed");
    }

    // Return the parsed response
    return d;
}


/* =========================================
   HELPER FUNCTIONS
========================================= */

// Format a number as Indian Rupees
const money = n => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(n) || 0);
};

// Escape special HTML characters before inserting text into HTML
const esc = s => {
    return String(s ?? "").replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]
    );
};

// Generate HTML for a product image
function image(url, alt) {
    // Display a placeholder if no image URL exists
    if (!url) {
        return "<div class='empty'>No image</div>";
    }

    // Hide the image if it fails to load
    return `
        <img
            src="${esc(url)}"
            alt="${esc(alt)}"
            onerror="this.style.display='none'"
        >
    `;
}


/* =========================================
   HEADER MANAGEMENT
========================================= */

// Update authentication links and the cart count
function header() {

    // Get the current user and header elements
    const u = user();
    const a = document.getElementById("authLink");
    const l = document.getElementById("logout");

    // Show the user's first name instead of Login
    if (a && u) {
        a.textContent = u.name.split(" ")[0];
        a.href = "/profile.html";
    }

    // Show or hide the logout button
    if (l) {
        l.classList.toggle("hidden", !u);
        l.onclick = logout;
    }

    // Find the cart count element
    const c = document.getElementById("cartCount");

    // Fetch the cart count for a logged-in user
    if (c && u) {
        api("/cart")
            .then(d => {

                // Keep cart items whose products still exist
                const items = (d.cart.items || [])
                    .filter(i => i.product);

                // Synchronize the cart with Redux
                window.shopActions?.syncCart(items);

                // Calculate the total quantity of cart items
                c.textContent = items.reduce(
                    (n, i) => n + i.quantity,
                    0
                );
            })
            .catch(() => {
                // Display zero if the cart request fails
                c.textContent = "0";
            });
    }

    // Subscribe to Redux store updates only once
    if (
        window.shopStore &&
        !window.__shopHeaderSub
    ) {
        window.__shopHeaderSub = true;

        window.shopStore.subscribe(() => {

            // Find the cart count element again
            const el = document.getElementById("cartCount");

            // Update the displayed count from Redux
            if (el) {
                el.textContent =
                    window.shopStore.getState().cart.count;
            }
        });
    }
}


/* =========================================
   INITIALIZATION
========================================= */

// Run the header function when the HTML has loaded
document.addEventListener("DOMContentLoaded", header);
