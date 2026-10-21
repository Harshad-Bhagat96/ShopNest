
document.addEventListener("DOMContentLoaded", async () => {

    // Get references to HTML elements
    const grid = document.getElementById("products");
    const msg = document.getElementById("message");
    const cat = document.getElementById("category");

    // Store the current search query
    let q = "";

    // Load products from the backend
    async function load() {

        // Update Redux state to indicate that products are loading
        window.shopActions?.loadingProducts(true);

        // Store the current search and category filters in Redux
        window.shopActions?.setFilters({
            search: q,
            category: cat.value
        });

        // Show a loading message
        grid.innerHTML = "Loading products…";

        try {
            // Build query parameters for the API request
            const p = new URLSearchParams();

            if (q) {
                p.set("search", q);
            }

            if (cat.value !== "All") {
                p.set("category", cat.value);
            }

            // Fetch products using the selected filters
            let d = await api("/products?" + p);

            // Seed demo products if the database is empty
            // and the user has not applied any filters
            if (
                !d.products.length &&
                !q &&
                cat.value === "All"
            ) {
                await api("/demo/seed", {
                    method: "POST"
                });

                // Fetch products again after seeding
                d = await api("/products");
            }

            // Update Redux with the fetched products
            window.shopActions?.setProducts(d.products);

            // Display product cards or an empty-state message
            grid.innerHTML = d.products.length
                ? d.products.map(x => `
                    <article class="card">

                        <!-- Product image links to its details page -->
                        <a href="/product.html?id=${x._id}">
                            ${image(x.image, x.name)}
                        </a>

                        <div class="cardbody">

                            <!-- Product category -->
                            <span class="tag">
                                ${esc(x.category)}
                            </span>

                            <!-- Product name -->
                            <h3>
                                <a href="/product.html?id=${x._id}">
                                    ${esc(x.name)}
                                </a>
                            </h3>

                            <!-- Product description -->
                            <p class="muted">
                                ${esc(
                                    x.description ||
                                    "Everyday essential."
                                )}
                            </p>

                            <!-- Price and add-to-cart button -->
                            <div class="row">
                                <span class="price">
                                    ${money(x.price)}
                                </span>

                                <button data-add="${x._id}">
                                    Add to cart
                                </button>
                            </div>

                        </div>
                    </article>
                `).join("")
                : "<div class='empty'>No products found.</div>";

        } catch (e) {
            // Update loading state when the request fails
            window.shopActions?.loadingProducts(false);

            // Clear the product grid and display the error
            grid.innerHTML = "";
            msg.textContent =
                e.message + " Check MongoDB is running.";
        }
    }

    // Handle product search form submission
    document.getElementById("searchForm").onsubmit = e => {
        e.preventDefault();

        // Read and trim the search input
        q = document.getElementById("search").value.trim();

        // Update the page heading
        document.getElementById("title").textContent = q
            ? 'Results for "' + q + '"'
            : "Popular products";

        // Reload products using the search query
        load();
    };

    // Reload products when the category changes
    cat.onchange = load;

    // Handle clicks on Add to cart buttons
    grid.onclick = async e => {

        // Find the nearest button containing a product ID
        const b = e.target.closest("[data-add]");

        // Ignore clicks that are not on an Add to cart button
        if (!b) return;

        // Redirect unauthenticated users to the login page
        if (!token()) {
            location.href = "/login.html";
            return;
        }

        try {
            // Add one unit of the selected product to the cart
            await api("/cart/items", {
                method: "POST",
                body: {
                    productId: b.dataset.add,
                    quantity: 1
                }
            });

            // Display a success message
            msg.textContent = "Added to cart";

            // Notify Redux/shared message handling
            window.shopActions?.message(msg.textContent);

            // Refresh shared header information, including cart count
            header();

        } catch (err) {
            // Display any add-to-cart error
            msg.textContent = err.message;
        }
    };

    // Load products when the page opens
    await load();
});
