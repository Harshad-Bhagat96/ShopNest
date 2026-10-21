
document.addEventListener("DOMContentLoaded", () => {

    // Get references to HTML elements
    const form = document.getElementById("productForm");
    const msg = document.getElementById("message");
    const products = document.getElementById("adminProducts");
    const orders = document.getElementById("adminOrders");
    const users = document.getElementById("adminUsers");

    // Store all products for editing
    let all = [];

    // Reset the product form
    function reset() {
        form.reset();

        // Clear the hidden product ID
        form.elements.id.value = "";

        // Restore the form title
        document.getElementById("formTitle").textContent = "Add product";

        // Hide the cancel-edit button
        document.getElementById("cancel").classList.add("hidden");
    }

    // Load dashboard data from the backend
    async function load() {
        try {
            // Fetch products, orders, users, and overview statistics
            const [p, o, u, stats] = await Promise.all([
                api("/admin/products"),
                api("/admin/orders"),
                api("/admin/users"),
                api("/admin/overview")
            ]);

            // Store products locally
            all = p.products;

            // Display dashboard statistics
            document.getElementById("overview").innerHTML = [
                ["Customers", stats.users],
                ["Products", stats.products],
                ["Orders", stats.orders],
                ["Paid revenue", money(stats.revenue)]
            ]
                .map(([a, b]) => `
                    <article class="panel">
                        <span>${a}</span>
                        <h2>${b}</h2>
                    </article>
                `)
                .join("");

            // Display products with Edit and Delete buttons
            products.innerHTML = all
                .map(p => `
                    <article class="cartrow">
                        ${image(p.image, p.name)}

                        <div>
                            <b>${esc(p.name)}</b>
                            <p>${money(p.price)} · Stock ${p.stock}</p>
                        </div>

                        <div>
                            <button data-edit="${p._id}">Edit</button>
                            <button
                                class="secondary"
                                data-delete="${p._id}"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `)
                .join("") || "No products";

            // Display recent orders and order-status dropdowns
            orders.innerHTML = o.orders
                .map(o => `
                    <article class="panel">
                        <b>${esc(o.user?.name || "Customer")}</b>
                        · ${money(o.total)}
                        · ${esc(o.paymentStatus)}

                        <p>
                            ${esc(o._id)}
                            · ${new Date(o.createdAt).toLocaleString()}
                        </p>

                        <label>
                            Status

                            <select data-status="${o._id}">
                                ${[
                                    "Placed",
                                    "Processing",
                                    "Shipped",
                                    "Delivered",
                                    "Cancelled"
                                ]
                                    .map(s => `
                                        <option ${o.status === s ? "selected" : ""}>
                                            ${s}
                                        </option>
                                    `)
                                    .join("")}
                            </select>
                        </label>
                    </article>
                `)
                .join("") || "No orders";

            // Display users and their role dropdowns
            users.innerHTML = u.users
                .map(u => `
                    <article class="panel">
                        <b>${esc(u.name)}</b>
                        · ${esc(u.email)}

                        <label>
                            Role

                            <select data-role="${u._id}">
                                <option
                                    value="customer"
                                    ${u.role === "customer" ? "selected" : ""}
                                >
                                    Customer
                                </option>

                                <option
                                    value="admin"
                                    ${u.role === "admin" ? "selected" : ""}
                                >
                                    Admin
                                </option>
                            </select>
                        </label>
                    </article>
                `)
                .join("");

        } catch (e) {
            // Display an error if the dashboard cannot load
            msg.textContent =
                e.message + " — log in with an admin account first.";
        }
    }

    // Handle adding or editing a product
    form.onsubmit = async e => {
        e.preventDefault();

        try {
            // Read all form values
            const fd = new FormData(form);
            const id = fd.get("id");

            // Build the product object
            const body = {
                name: fd.get("name"),
                description: fd.get("description"),
                category: fd.get("category"),
                price: Number(fd.get("price")),
                stock: Number(fd.get("stock")),
                image: fd.get("image"),
                featured: fd.get("featured") === "on"
            };

            // Check whether the user selected an image file
            const file = document.getElementById("imageFile").files[0];

            if (file) {
                // Prepare the image upload request
                const up = new FormData();
                up.append("image", file);

                // Upload the image with the authentication token
                const r = await fetch("/api/admin/upload", {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + token()
                    },
                    body: up
                });

                const d = await r.json();

                // Stop if the upload failed
                if (!r.ok) {
                    throw Error(d.message);
                }

                // Use the uploaded image URL
                body.image = d.url;
            }

            // Choose POST for a new product or PUT for an existing product
            await api(
                "/admin/products" + (id ? "/" + id : ""),
                {
                    method: id ? "PUT" : "POST",
                    body
                }
            );

            // Display success message and refresh the dashboard
            msg.textContent = "Product saved.";
            reset();
            await load();

        } catch (e) {
            // Display product save or upload errors
            msg.textContent = e.message;
        }
    };

    // Cancel editing and reset the form
    document.getElementById("cancel").onclick = reset;

    // Handle clicks on product Edit and Delete buttons
    products.onclick = async e => {
        const edit = e.target.closest("[data-edit]");
        const del = e.target.closest("[data-delete]");

        // Populate the form when Edit is clicked
        if (edit) {
            const p = all.find(x => x._id === edit.dataset.edit);

            // Fill the form with the selected product's values
            for (const k of [
                "name",
                "description",
                "category",
                "price",
                "stock",
                "image"
            ]) {
                form.elements[k].value = p[k] ?? "";
            }

            // Restore the featured checkbox value
            form.elements.featured.checked = !!p.featured;

            // Store the product ID for the update request
            form.elements.id.value = p._id;

            // Change the form to editing mode
            document.getElementById("formTitle").textContent = "Edit product";
            document.getElementById("cancel").classList.remove("hidden");

            // Scroll to the form
            scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }

        // Delete a product after confirmation
        if (del && confirm("Delete this product?")) {
            try {
                await api("/admin/products/" + del.dataset.delete, {
                    method: "DELETE"
                });

                // Refresh the dashboard
                await load();

            } catch (e) {
                msg.textContent = e.message;
            }
        }
    };

    // Handle order-status changes
    orders.onchange = async e => {
        const x = e.target.closest("[data-status]");

        // Ignore changes outside a status dropdown
        if (!x) return;

        try {
            const result = await api(
                "/admin/orders/" + x.dataset.status + "/status",
                {
                    method: "PATCH",
                    body: {
                        status: x.value
                    }
                }
            );

            msg.textContent = x.value === "Delivered" && result.email
                ? "Order marked delivered. " + result.email.message
                : "Order status updated.";

            // Refresh the dashboard
            await load();

        } catch (e) {
            msg.textContent = e.message;
        }
    };

    // Handle user-role changes
    users.onchange = async e => {
        const x = e.target.closest("[data-role]");

        // Ignore changes outside a role dropdown
        if (!x) return;

        try {
            await api(
                "/admin/users/" + x.dataset.role + "/role",
                {
                    method: "PATCH",
                    body: {
                        role: x.value
                    }
                }
            );

            msg.textContent = "User role updated.";

            // Refresh the dashboard
            await load();

        } catch (e) {
            msg.textContent = e.message;

            // Restore the dropdown to the server's actual role
            await load();
        }
    };

    // Load the dashboard when the page opens
    load();
});
