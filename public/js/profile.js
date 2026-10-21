
document.addEventListener("DOMContentLoaded", async () => {

    // Get references to the profile form and message element
    const f = document.getElementById("profile");
    const m = document.getElementById("message");

    // Check whether the user is logged in
    if (!token()) {
        m.textContent = "Please log in first.";
        return;
    }

    try {
        // Fetch the logged-in user's profile from the backend
        const d = await api("/profile");

        // Populate the form with the existing profile details
        f.elements.name.value = d.user.name;
        f.elements.email.value = d.user.email;
        f.elements.address.value = d.user.address || "";

    } catch (e) {
        // Display an error if the profile cannot be loaded
        m.textContent = e.message;
    }

    // Handle profile form submission
    f.onsubmit = async e => {

        // Prevent the browser from reloading the page
        e.preventDefault();

        try {
            // Send updated name and address to the backend
            const d = await api("/profile", {
                method: "PUT",
                body: {
                    name: f.elements.name.value,
                    address: f.elements.address.value
                }
            });

            // Update the saved user information in localStorage
            localStorage.setItem(
                "storeUser",
                JSON.stringify(d.user)
            );

            // Display a success message
            m.textContent = "Profile saved.";

        } catch (err) {
            // Display an error if saving fails
            m.textContent = err.message;
        }
    };
});
