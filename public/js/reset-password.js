
document.addEventListener("DOMContentLoaded", () => {

    // Find the password reset form
    document.getElementById("resetForm").onsubmit =
        async e => {

            // Prevent the browser's default form submission
            e.preventDefault();

            // Get the element used to display messages
            const msg = document.getElementById("message");

            try {
                // Send the reset token and new password to the backend
                const d = await api("/auth/reset-password", {
                    method: "POST",
                    body: {
                        // Read the reset token from the URL
                        token: new URLSearchParams(
                            location.search
                        ).get("token"),

                        // Read the new password from the input
                        password: document.getElementById("password").value
                    }
                });

                // Display the backend's response message
                msg.textContent = d.message;

                // Redirect to the login page after 1.2 seconds
                setTimeout(() => {
                    location.href = "/login.html";
                }, 1200);

            } catch (err) {
                // Display an error if the reset request fails
                msg.textContent = err.message;
            }
        };
});
