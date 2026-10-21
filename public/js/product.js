
document.addEventListener("DOMContentLoaded", async () => {

    // Get references to HTML elements
    const root = document.getElementById("product");
    const msg = document.getElementById("message");

    // Get the product ID from the URL query parameter
    // Example: /product.html?id=123
    const id = new URLSearchParams(location.search).get("id");

    // Stop if the product ID is missing
    if (!id) {
        root.textContent = "Product ID is missing.";
        return;
    }

    try {
        // Fetch the selected product from the backend
        const d = await api(
            "/products/" + encodeURIComponent(id)
        );

        // Extract product information from the response
        const p = d.product;

        // Display the product details
        root.innerHTML = `
            <!-- Product image -->
            <div class="detail-image">
                ${image(p.image, p.name)}
            </div>

            <!-- Product information -->
            <div>
                <span class="tag">
                    ${esc(p.category)}
                </span>

                <h1>${esc(p.name)}</h1>

                <p>${esc(p.description || "")}</p>

                <h2 class="price">
                    ${money(p.price)}
                </h2>

                <!-- Display stock availability -->
                <p>
                    ${
                        p.stock > 0
                            ? `${p.stock} in stock`
                            : "Out of stock"
                    }
                </p>

                <!-- Quantity selection -->
                <label>
                    Quantity

                    <input
                        id="qty"
                        type="number"
                        min="1"
                        max="${Math.max(1, p.stock)}"
                        value="1"
                    >
                </label>

                <!-- Add-to-cart button -->
                <p>
                    <button
                        id="add"
                        ${p.stock < 1 ? "disabled" : ""}
                    >
                        Add to cart
                    </button>
                </p>
            </div>
        `;

        // Handle Add to cart button clicks
        document.getElementById("add").onclick = async () => {

            // Redirect users who are not logged in
            if (!token()) {
                location.href = "/login.html";
                return;
            }

            try {
                // Add the selected product and quantity to the cart
                await api("/cart/items", {
                    method: "POST",
                    body: {
                        productId: p._id,
                        quantity: Number(
                            document.getElementById("qty").value
                        )
                    }
                });

                // Display a success message
                msg.textContent = "Added to cart.";

                // Refresh shared header information
                header();

            } catch (e) {
                // Display errors from the backend
                msg.textContent = e.message;
            }
        };

    } catch (e) {
        // Display an error if the product cannot be loaded
        root.textContent = e.message;
    }
});
