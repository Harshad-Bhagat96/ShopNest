
/*
    Redux-style global state management using the official Redux core
    library without React.

    Redux manages frontend UI state.
    MongoDB and the backend API remain the source of truth for
    products, orders, and cart data.
*/

(function () {

    // Key used to persist Redux state in localStorage
    const STORAGE_KEY = "shopnestReduxState";


    /* =========================================
       LOAD INITIAL STATE FROM LOCAL STORAGE
    ========================================= */

    // Read previously saved Redux state
    const initial = (() => {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            ) || {};
        } catch {
            // Use an empty object if saved JSON is invalid
            return {};
        }
    })();


    /* =========================================
       DEFINE DEFAULT STATE
    ========================================= */

    const defaultState = {
        auth: {
            user: null
        },

        cart: {
            items: [],
            count: 0,
            subtotal: 0
        },

        products: {
            items: [],
            search: "",
            category: "All",
            loading: false
        },

        ui: {
            lastMessage: ""
        }
    };


    /* =========================================
       MERGE SAVED STATE WITH DEFAULT STATE
    ========================================= */

    // Preserve default values for any missing properties
    const preloadedState = {
        ...defaultState,
        ...initial,

        auth: {
            ...defaultState.auth,
            ...(initial.auth || {})
        },

        cart: {
            ...defaultState.cart,
            ...(initial.cart || {})
        },

        products: {
            ...defaultState.products,
            ...(initial.products || {})
        },

        ui: {
            ...defaultState.ui,
            ...(initial.ui || {})
        }
    };


    /* =========================================
       REDUX REDUCER
    ========================================= */

    // A reducer receives the current state and an action.
    // It returns the next state without directly modifying
    // the existing state.
    function reducer(state = preloadedState, action) {

        switch (action.type) {

            // Save the current user's information
            case "auth/sessionSet":
                return {
                    ...state,
                    auth: {
                        user: action.payload || null
                    }
                };


            // Log out the user and clear the cart state
            case "auth/logout":
                return {
                    ...state,
                    auth: {
                        user: null
                    },
                    cart: {
                        items: [],
                        count: 0,
                        subtotal: 0
                    }
                };


            // Synchronize cart items and calculate totals
            case "cart/synced": {
                const items = action.payload || [];

                return {
                    ...state,
                    cart: {
                        items,

                        // Calculate total quantity of all items
                        count: items.reduce(
                            (n, i) =>
                                n + Number(i.quantity || 0),
                            0
                        ),

                        // Calculate cart subtotal
                        subtotal: items.reduce(
                            (n, i) =>
                                n +
                                Number(i.quantity || 0) *
                                Number(i.product?.price || 0),
                            0
                        )
                    }
                };
            }


            // Clear the cart
            case "cart/cleared":
                return {
                    ...state,
                    cart: {
                        items: [],
                        count: 0,
                        subtotal: 0
                    }
                };


            // Update the product loading status
            case "products/loading":
                return {
                    ...state,
                    products: {
                        ...state.products,
                        loading: Boolean(action.payload)
                    }
                };


            // Save loaded products and mark loading as complete
            case "products/loaded":
                return {
                    ...state,
                    products: {
                        ...state.products,
                        items: action.payload || [],
                        loading: false
                    }
                };


            // Update search and category filters
            case "products/filtersChanged":
                return {
                    ...state,
                    products: {
                        ...state.products,
                        ...action.payload
                    }
                };


            // Save the latest UI message
            case "ui/message":
                return {
                    ...state,
                    ui: {
                        lastMessage: String(
                            action.payload || ""
                        )
                    }
                };


            // Return the current state for unknown actions
            default:
                return state;
        }
    }


    /* =========================================
       CHECK REDUX AVAILABILITY
    ========================================= */

    // Make sure the Redux library loaded successfully
    if (
        !window.Redux ||
        typeof window.Redux.createStore !== "function"
    ) {
        console.error(
            "Redux library did not load. Check your internet " +
            "connection and the Redux CDN script."
        );

        window.shopStore = null;
        return;
    }


    /* =========================================
       CREATE REDUX STORE
    ========================================= */

    // Create the store using the reducer and initial state
    const store = window.Redux.createStore(
        reducer,
        preloadedState
    );


    /* =========================================
       PERSIST REDUX STATE
    ========================================= */

    // Prevent multiple persistence operations from being queued
    let persistQueued = false;

    // Run whenever the Redux state changes
    store.subscribe(() => {

        // Skip if a save operation is already queued
        if (persistQueued) return;

        persistQueued = true;

        // Schedule persistence after the current synchronous work
        Promise.resolve().then(() => {

            persistQueued = false;

            // Read the latest Redux state
            const s = store.getState();

            /*
                Persist selected application state.

                Never store the JWT token through Redux.
                The token remains in its existing session key.
            */
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    auth: {
                        user: s.auth.user
                    },

                    cart: s.cart,

                    products: {
                        search: s.products.search,
                        category: s.products.category
                    },

                    ui: s.ui
                })
            );
        });
    });


    /* =========================================
       EXPOSE STORE GLOBALLY
    ========================================= */

    // Allow other JavaScript files to access the Redux store
    window.shopStore = store;


    /* =========================================
       DEFINE HELPER ACTIONS
    ========================================= */

    // These functions dispatch actions to the Redux store.
    // Other files can call them through window.shopActions.
    window.shopActions = {

        // Update the logged-in user's information
        setUser: user =>
            store.dispatch({
                type: "auth/sessionSet",
                payload: user
            }),

        // Log out and clear the cart state
        logout: () =>
            store.dispatch({
                type: "auth/logout"
            }),

        // Synchronize cart items
        syncCart: items =>
            store.dispatch({
                type: "cart/synced",
                payload: items
            }),

        // Clear cart items
        clearCart: () =>
            store.dispatch({
                type: "cart/cleared"
            }),

        // Update product loading status
        loadingProducts: value =>
            store.dispatch({
                type: "products/loading",
                payload: value
            }),

        // Save loaded products
        setProducts: items =>
            store.dispatch({
                type: "products/loaded",
                payload: items
            }),

        // Update search and category filters
        setFilters: filters =>
            store.dispatch({
                type: "products/filtersChanged",
                payload: filters
            }),

        // Save the latest UI message
        message: value =>
            store.dispatch({
                type: "ui/message",
                payload: value
            })
    };

})();
