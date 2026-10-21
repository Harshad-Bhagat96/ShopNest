
document.addEventListener("DOMContentLoaded", async () => {

    // Get references to HTML elements
    const box = document.getElementById("orders");
    const m = document.getElementById("message");

    // Check whether the user is logged in
    if (!token()) {
        m.textContent = "Please log in first.";
        return;
    }

    try {
        // Fetch the logged-in user's orders from the backend
        const d = await api("/orders/my-orders");

        // Display the orders if any exist
        box.innerHTML = d.orders.length
            ? d.orders.map(o => `
                <article class="order">

                    <!-- Order ID -->
                    <b>Order ${esc(o._id)}</b>

                    <!-- Order date, status, and payment status -->
                    <p>
                        ${new Date(o.createdAt).toLocaleString()}
                        · ${esc(o.status)}
                        · ${esc(o.paymentStatus)}
                    </p>

                    <!-- List of products included in the order -->
                    <ul>
                        ${o.items.map(i => `
                            <li>
                                ${esc(i.name)}
                                × ${i.quantity}
                                — ${money(i.price * i.quantity)}
                            </li>
                        `).join("")}
                    </ul>

                    <!-- Total order amount -->
                    <b>Total: ${money(o.total)}</b>

                    <!-- Delivery address -->
                    <p>${esc(o.address)}</p>

                </article>
            `).join("")

            // Display this message when the user has no orders
            : "<div class='empty'>No orders yet.</div>";

    } catch (e) {
        // Display an error if the request fails
        m.textContent = e.message;
    }
});
