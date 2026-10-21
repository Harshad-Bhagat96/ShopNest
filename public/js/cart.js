
document.addEventListener("DOMContentLoaded", async () => {

    // Get references to cart page elements
    const items = document.getElementById("items");
    const sum = document.getElementById("summary");
    const msg = document.getElementById("message");

    // Require the user to log in before using the cart
    if (!token()) {
        msg.textContent = "Please log in to use your cart.";
        return;
    }

    // Load the cart from the backend
    async function load() {
        try {
            const d = await api("/cart");

            // Keep only cart items whose products still exist
            const a = (d.cart.items || [])
                .filter(i => i.product);

            // Synchronize cart items with Redux
            window.shopActions?.syncCart(a);

            // Display a message if the cart is empty
            if (!a.length) {
                items.innerHTML = `
                    <div class="empty">
                        Your cart is empty.
                        <a href="/">Browse products</a>
                    </div>
                `;

                sum.innerHTML = "";
                return;
            }

            // Display cart items with quantity and remove controls
            items.innerHTML = a.map(i => `
                <article class="cartrow">

                    <!-- Product image -->
                    ${image(i.product.image, i.product.name)}

                    <div>
                        <b>${esc(i.product.name)}</b>

                        <p>${money(i.product.price)} each</p>

                        <b>
                            ${money(i.product.price * i.quantity)}
                        </b>
                    </div>

                    <!-- Quantity and remove controls -->
                    <div class="controls">
                        <label>
                            Qty

                            <input
                                type="number"
                                min="1"
                                max="99"
                                value="${i.quantity}"
                                data-qty="${i.product._id}"
                            >
                        </label>

                        <button
                            class="secondary"
                            data-remove="${i.product._id}"
                        >
                            Remove
                        </button>
                    </div>

                </article>
            `).join("");

            // Calculate the cart subtotal
            const total = a.reduce(
                (n, i) => n + i.product.price * i.quantity,
                0
            );

            // Display checkout details and payment options
            sum.innerHTML = `
                <h2>Checkout</h2>

                <p>
                    Subtotal
                    <b style="float:right">${money(total)}</b>
                </p>

                <!-- Delivery address -->
                <label>
                    Delivery address

                    <textarea id="address" required>${esc(
                        user()?.address || ""
                    )}</textarea>
                </label>

                <!-- Payment methods -->
                <p>
                    <button id="pay">
                        Pay securely with Razorpay
                    </button>

                    <button id="cod" class="secondary">
                        Cash on delivery
                    </button>
                </p>

                <p class="muted">
                    Online payment requires Razorpay test/live keys
                    in .env. Use test keys while developing.
                </p>
            `;

            // Attach payment button event handlers
            document.getElementById("pay").onclick = pay;
            document.getElementById("cod").onclick = cod;

        } catch (e) {
            // Display cart loading errors
            msg.textContent = e.message;
        }
    }

    // Handle online payment using Razorpay
    async function pay() {

        // Read and validate the delivery address
        const address = document
            .getElementById("address")
            .value
            .trim();

        if (!address) {
            msg.textContent = "Enter delivery address.";
            return;
        }

        try {
            // Create a Razorpay order on the backend
            const o = await api("/payments/razorpay/order", {
                method: "POST",
                body: { address }
            });

            // Load Razorpay Checkout if it is not already available
            if (!window.Razorpay) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement("script");

                    s.src =
                        "https://checkout.razorpay.com/v1/checkout.js";

                    s.onload = resolve;
                    s.onerror = reject;

                    document.head.appendChild(s);
                });
            }

            // Configure the Razorpay checkout window
            const rzp = new Razorpay({
                key: o.keyId,
                amount: o.amount,
                currency: o.currency,
                name: "ShopNest",
                description: "Order payment",
                order_id: o.razorpayOrderId,

                // Prefill customer details
                prefill: {
                    name: user()?.name || "",
                    email: user()?.email || ""
                },

                // Verify payment after checkout succeeds
                handler: async response => {
                    try {
                        const result = await api(
                            "/payments/razorpay/verify",
                            {
                                method: "POST",
                                body: {
                                    ...response,
                                    address
                                }
                            }
                        );

                        // Display the backend response message
                        msg.textContent = result.message;

                        // Clear the cart in Redux
                        window.shopActions?.clearCart();

                        // Navigate to the orders page
                        location.href = "/orders.html";

                    } catch (e) {
                        // Payment may have succeeded but verification failed
                        msg.textContent =
                            "Payment was received but verification " +
                            "needs attention: " + e.message;
                    }
                },

                // Handle closing the checkout window
                modal: {
                    ondismiss: () => {
                        msg.textContent =
                            "Payment window closed. " +
                            "Your order has not been placed.";
                    }
                }
            });

            // Display Razorpay payment errors
            rzp.on("payment.failed", r => {
                msg.textContent =
                    r.error?.description || "Payment failed.";
            });

            // Open the Razorpay checkout window
            rzp.open();

        } catch (e) {
            // Display payment setup or API errors
            msg.textContent = e.message;
        }
    }

    // Handle cash-on-delivery orders
    async function cod() {

        // Read and validate the delivery address
        const address = document
            .getElementById("address")
            .value
            .trim();

        if (!address) {
            msg.textContent = "Enter delivery address.";
            return;
        }

        try {
            // Create an order using the backend orders endpoint
            const r = await api("/orders", {
                method: "POST",
                body: { address }
            });

            // Display the backend response message
            msg.textContent = r.message;

            // Clear the cart in Redux
            window.shopActions?.clearCart();

            // Navigate to the orders page
            location.href = "/orders.html";

        } catch (e) {
            // Display order creation errors
            msg.textContent = e.message;
        }
    }

    // Handle cart quantity changes
    items.onchange = async e => {
        const x = e.target.closest("[data-qty]");

        // Ignore changes outside quantity inputs
        if (!x) return;

        try {
            // Update the selected product quantity
            await api("/cart/items/" + x.dataset.qty, {
                method: "PATCH",
                body: {
                    quantity: Number(x.value)
                }
            });

            // Reload the cart and update the header
            await load();
            header();

        } catch (err) {
            msg.textContent = err.message;

            // Reload to restore the current server-side values
            await load();
        }
    };

    // Handle removing products from the cart
    items.onclick = async e => {
        const x = e.target.closest("[data-remove]");

        // Ignore clicks outside Remove buttons
        if (!x) return;

        try {
            // Remove the selected product from the cart
            await api("/cart/items/" + x.dataset.remove, {
                method: "DELETE"
            });

            // Reload the cart and update the header
            await load();
            header();

        } catch (err) {
            msg.textContent = err.message;
        }
    };

    // Load the cart when the page opens
    await load();
});
