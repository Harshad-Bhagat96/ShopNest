
document.addEventListener("DOMContentLoaded", () => {

    // Define the form IDs and their corresponding backend API routes
    for (let [id, route] of [
        ["login", "/auth/login"],
        ["register", "/auth/register"]
    ]) {

        // Find the login or registration form
        const f = document.getElementById(id);

        // Skip if the current page does not contain this form
        if (!f) continue;

        // Handle form submission
        f.onsubmit = async e => {
            // Prevent the browser's default form submission
            e.preventDefault();

            // Get the element used to display messages
            const msg = document.getElementById("message");

            try {
                // Send the form data to the backend API
                const d = await api(route, {
                    method: "POST",
                    body: Object.fromEntries(new FormData(f))
                });

                // Save the returned authentication session
                saveSession(d);

                // Redirect admins to the admin dashboard
                // Redirect other users to the home page
                location.href = d.user.role === "admin"
                    ? "/admin.html"
                    : "/";

            } catch (err) {
                // Display login or registration errors
                msg.textContent = err.message;
            }
        };
    }
});
