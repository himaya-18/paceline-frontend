/* =========================================================
   PACELINE — MAIN JAVASCRIPT
   Works on BOTH index.html and about.html.
   Every feature first checks that its HTML exists on the
   current page, so nothing crashes on the other page.
   ========================================================= */

"use strict";


/* =========================================================
   1. SMALL HELPERS
   ========================================================= */

/* $("css")  → first matching element   $$("css") → array of all */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/* Safe localStorage (never crashes in private mode) */
function readStorage(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null || value === undefined ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        /* storage unavailable — ignore */
    }
}


/* =========================================================
   2. SHARED STATE (declared first so every feature can use it)
   ========================================================= */

const FREE_DELIVERY_GBP = 75;

/* All prices are stored in GBP. We only CONVERT when displaying. */
/* rate = how many of that currency equal £1 (fixed demo rates).
   locale = how big numbers are grouped, e.g. ₹27,090 */
const CURRENCIES = {
    GBP: { symbol: "£", rate: 1,    locale: "en-GB" },
    USD: { symbol: "$", rate: 1.27, locale: "en-US" },
    EUR: { symbol: "€", rate: 1.17, locale: "en-IE" },
    INR: { symbol: "₹", rate: 129,  locale: "en-IN" }
};
const CURRENCY_ORDER = ["GBP", "USD", "EUR", "INR"];

let currency = readStorage("paceline-currency", "GBP");
if (!CURRENCIES[currency]) currency = "GBP";

let cart = readStorage("paceline-cart", []);
if (!Array.isArray(cart)) cart = [];
cart = cart.filter(item =>
    item && typeof item.name === "string" &&
    Number(item.price) > 0 && Number(item.quantity) > 0
);

let wishlist = readStorage("paceline-wishlist", []);
if (!Array.isArray(wishlist)) wishlist = [];
wishlist = wishlist.filter(item => typeof item === "string");


/* Things the search box can find (works on both pages) */
const SEARCH_ITEMS = [
    { title: "On Cloudmonster 3", price: 210, url: "index.html#arrivals",
      keywords: "on shoe shoes footwear road running cushioned bestseller" },
    { title: "Nike Vaporfly 4", price: 240, url: "index.html#arrivals",
      keywords: "nike shoe shoes footwear race racing marathon carbon" },
    { title: "Hoka Tecton X 4", price: 220, url: "index.html#arrivals",
      keywords: "hoka shoe shoes footwear trail off-road" },
    { title: "Asics Megablast", price: 210, url: "index.html#arrivals",
      keywords: "asics shoe shoes footwear road running bestseller" },
    { title: "Men's Running", url: "index.html",
      keywords: "men mens male running clothing" },
    { title: "Women's Running", url: "index.html",
      keywords: "women womens female running clothing" },
    { title: "Apparel", url: "index.html",
      keywords: "apparel clothing jacket shorts tops layers" },
    { title: "Accessories", url: "index.html",
      keywords: "accessories watch watches packs fuel belt" },
    { title: "Our Story", url: "about.html",
      keywords: "about story founders rae jamie history glasgow" },
    { title: "Book Gait Analysis", url: "about.html",
      keywords: "gait analysis clinic book free appointment" }
];


/* =========================================================
   3. DARK MODE
   ========================================================= */

if (readStorage("paceline-dark", false) === true) {
    document.body.classList.add("dark-mode");
}

$$(".dark-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        writeStorage("paceline-dark", isDark);
    });
});


/* =========================================================
   4. MOBILE MENU (hamburger)
   ========================================================= */

const hamburger = $(".hamburger");
const navMenu = $(".nav-menu");

function closeMenu() {
    if (!hamburger || !navMenu) return;
    navMenu.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.textContent = "☰";
}

if (hamburger && navMenu) {
    hamburger.setAttribute("aria-expanded", "false");

    hamburger.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("open");
        hamburger.setAttribute("aria-expanded", String(isOpen));
        hamburger.textContent = isOpen ? "×" : "☰";
    });

    /* close the menu after tapping a link */
    $$("a", navMenu).forEach(link => link.addEventListener("click", closeMenu));
}


/* =========================================================
   5. BACK TO TOP + READING PROGRESS
   ========================================================= */

const backTop = $("#back-to-top");
const readingProgress = $("#reading-progress");

window.addEventListener("scroll", () => {

    if (backTop) {
        backTop.classList.toggle("visible", window.scrollY > 500);
    }

    if (readingProgress) {
        const scrollable =
            document.documentElement.scrollHeight -
            document.documentElement.clientHeight;

        const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        readingProgress.style.width = percentage + "%";
    }

}, { passive: true });

if (backTop) {
    backTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}


/* =========================================================
   6. COOKIE BANNER
   (CSS hides it by default — we only show it if not accepted)
   ========================================================= */

const cookieBanner = $("#cookie-banner");
const acceptCookies = $("#accept-cookies");

if (cookieBanner && readStorage("paceline-cookies", false) !== true) {
    cookieBanner.style.display = "flex";
}

if (acceptCookies && cookieBanner) {
    acceptCookies.addEventListener("click", () => {
        writeStorage("paceline-cookies", true);
        cookieBanner.style.display = "none";
    });
}


/* =========================================================
   7. CURRENCY SWITCHER
   ========================================================= */

const currencyButton = $("#currency-switcher");

/* 210 (GBP) → "$267"  */
function formatPrice(gbpAmount) {
    const { symbol, rate, locale } = CURRENCIES[currency];
    return symbol + Math.round(gbpAmount * rate).toLocaleString(locale);
}

function updateCurrency() {

    /* product cards */
    $$(".product-price[data-price]").forEach(element => {
        element.textContent = formatPrice(Number(element.dataset.price));
    });

    /* any other text marked like <span data-gbp="75">£75</span> */
    $$("[data-gbp]").forEach(element => {
        element.textContent = formatPrice(Number(element.dataset.gbp));
    });

    /* the button label */
    if (currencyButton) {
        const prefix = currencyButton.dataset.prefix || "";
        currencyButton.textContent =
            `${prefix}EN / ${CURRENCIES[currency].symbol} ${currency}`;
        currencyButton.setAttribute(
            "aria-label",
            `Currency is ${currency}. Click to change.`
        );
    }

    renderCart();
    runSearch();
}

if (currencyButton) {
    currencyButton.addEventListener("click", () => {
        const next = (CURRENCY_ORDER.indexOf(currency) + 1) % CURRENCY_ORDER.length;
        currency = CURRENCY_ORDER[next];
        writeStorage("paceline-currency", currency);
        updateCurrency();
    });
}


/* =========================================================
   8. SEARCH  (finds products + pages, on both pages)
   ========================================================= */

const searchButton = $("#search-button") || $('.icon-btn[aria-label="Search"]');
let searchPanel = $("#search-panel");
let searchInput = null;
let searchResult = null;
let searchList = null;

/* index.html has no search panel in its HTML, so we build one */
function buildSearchPanel() {

    if (!searchPanel) {
        searchPanel = document.createElement("div");
        searchPanel.className = "search-panel";
        searchPanel.id = "search-panel";
        searchPanel.innerHTML = `
            <button class="search-close" id="search-close" aria-label="Close search">×</button>
            <div class="search-box">
                <span>SEARCH PACELINE</span>
                <input id="site-search" type="search" autocomplete="off"
                       aria-label="Search Paceline"
                       placeholder="Search running shoes, apparel...">
                <p id="search-result" aria-live="polite">
                    Try searching for shoes, trail, apparel or gait.
                </p>
            </div>`;
        document.body.appendChild(searchPanel);
    }

    searchPanel.setAttribute("role", "dialog");
    searchPanel.setAttribute("aria-label", "Search");

    searchInput = $("#site-search", searchPanel);
    searchResult = $("#search-result", searchPanel);

    /* the list of clickable results */
    searchList = $("#search-list", searchPanel);
    if (!searchList) {
        searchList = document.createElement("ul");
        searchList.id = "search-list";
        searchList.className = "search-list";
        searchResult.insertAdjacentElement("afterend", searchList);
    }

    const closeButton = $("#search-close", searchPanel);
    if (closeButton) closeButton.addEventListener("click", closeSearch);

    searchPanel.addEventListener("click", event => {
        if (event.target === searchPanel) closeSearch();
    });

    searchInput.addEventListener("input", runSearch);
}

function openSearch() {
    searchPanel.classList.add("active");
    searchInput.focus();
}

function closeSearch() {
    if (!searchPanel) return;
    searchPanel.classList.remove("active");
}

/* "clou" matches "cloudmonster" — each typed word must START a word */
function matchesQuery(item, query) {
    const words = (item.title + " " + item.keywords).toLowerCase().split(/[\s-]+/);
    return query.split(/\s+/).every(part =>
        words.some(word => word.startsWith(part))
    );
}

function runSearch() {

    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    searchList.innerHTML = "";

    if (!query) {
        searchResult.textContent = "Try searching for shoes, trail, apparel or gait.";
        return;
    }

    const matches = SEARCH_ITEMS.filter(item => matchesQuery(item, query)).slice(0, 6);

    if (matches.length === 0) {
        searchResult.textContent = "No match yet — try shoes, trail, nike or apparel.";
        return;
    }

    searchResult.textContent =
        `${matches.length} result${matches.length > 1 ? "s" : ""} found`;

    matches.forEach(item => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        const title = document.createElement("span");
        const detail = document.createElement("small");

        link.href = item.url;
        title.textContent = item.title;
        detail.textContent = item.price ? formatPrice(item.price) : "View →";

        link.append(title, detail);
        li.appendChild(link);
        searchList.appendChild(li);

        /* clicking a result on the same page should close the panel */
        link.addEventListener("click", closeSearch);
    });
}

if (searchButton) {
    buildSearchPanel();
    searchButton.addEventListener("click", openSearch);
}


/* =========================================================
   9. GAIT ANALYSIS MODAL (about page)
   ========================================================= */

const gaitModal = $("#gait-modal");
const openGaitButton = $("#open-gait-modal");
const closeGaitButton = $("#close-gait-modal");
const gaitForm = $("#gait-form");
const gaitMessage = $("#gait-message");

function openGait() {
    gaitModal.classList.add("active");
    const nameField = $("#gait-name");
    if (nameField) nameField.focus();
}

function closeGait() {
    if (gaitModal) gaitModal.classList.remove("active");
}

if (gaitModal && openGaitButton) {
    openGaitButton.addEventListener("click", openGait);
}

if (gaitModal && closeGaitButton) {
    closeGaitButton.addEventListener("click", closeGait);
}

if (gaitModal) {
    gaitModal.addEventListener("click", event => {
        if (event.target === gaitModal) closeGait();
    });
}

if (gaitForm) {

    /* stop people picking a date in the past */
    const dateField = $("#gait-date");
    if (dateField) {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        dateField.min = today.toISOString().split("T")[0];
    }

    gaitForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = $("#gait-name").value.trim();
        const date = $("#gait-date").value;
        const time = $("#gait-time").value;

        if (name.length < 2) {
            gaitMessage.textContent = "Please enter your name.";
            return;
        }

        if (!date || !time) {
            gaitMessage.textContent = "Please select a date and time.";
            return;
        }

        if (dateField && dateField.min && date < dateField.min) {
            gaitMessage.textContent = "Please choose today or a future date.";
            return;
        }

        gaitMessage.textContent =
            `Booking confirmed for ${name} on ${date} at ${time}. See you soon!`;

        gaitForm.reset();
    });
}


/* =========================================================
   10. NEWSLETTER (both pages)
   ========================================================= */

$$(".newsletter-form").forEach(form => {

    form.addEventListener("submit", event => {
        event.preventDefault();

        const input = $("input", form);
        const message = $(".newsletter-message", form.parentElement);
        const email = input.value.trim();
        const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!message) return;

        if (!looksValid) {
            message.textContent = "Please enter a valid email address.";
            return;
        }

        message.textContent =
            "You're in! Use code PACE10 for 10% off your first order.";
        form.reset();
    });

});


/* =========================================================
   11. PRODUCT FILTERS (index page)
   ========================================================= */

const filterButtons = $$(".filter-btn");
const productCards = $$(".product-card");

filterButtons.forEach(button => {

    button.setAttribute("aria-pressed", String(button.classList.contains("active")));

    button.addEventListener("click", () => {

        filterButtons.forEach(other => {
            other.classList.remove("active");
            other.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        const filter = button.dataset.filter;

        productCards.forEach(card => {
            card.hidden = !(filter === "all" || card.dataset.category === filter);
        });
    });

});


/* =========================================================
   12. WISHLIST (index page) — saved by product NAME
   ========================================================= */

$$(".product-card").forEach(card => {

    const heart = $(".wishlist-btn", card);
    const nameElement = $(".product-name", card);

    if (!heart || !nameElement) return;

    const name = nameElement.textContent.trim();

    function paintHeart() {
        const liked = wishlist.includes(name);
        heart.textContent = liked ? "♥" : "♡";
        heart.classList.toggle("liked", liked);
        heart.setAttribute("aria-pressed", String(liked));
        heart.setAttribute(
            "aria-label",
            liked ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`
        );
    }

    paintHeart();

    heart.addEventListener("click", () => {
        wishlist = wishlist.includes(name)
            ? wishlist.filter(item => item !== name)
            : [...wishlist, name];

        writeStorage("paceline-wishlist", wishlist);
        paintHeart();
    });

});


/* =========================================================
   13. SHOPPING BAG (index page)
   ========================================================= */

const cartDrawer = $("#cart-drawer");
const cartItems = $("#cart-items");
const cartSubtotal = $("#cart-subtotal");
const cartProgress = $("#delivery-progress");
const cartDeliveryText = $("#delivery-text");
const cartBadge = $(".cart-count");
const openCartButton = $("#open-cart");
const closeCartButton = $("#close-cart");
const checkoutButton = $(".checkout-button");

function saveCart() {
    writeStorage("paceline-cart", cart);
}

function updateCartBadge() {
    if (!cartBadge) return;
    cartBadge.textContent =
        cart.reduce((total, item) => total + item.quantity, 0);
}

function renderCart() {

    updateCartBadge();

    if (!cartItems) return;

    cartItems.innerHTML = "";

    let subtotal = 0;

    if (cart.length === 0) {
        const empty = document.createElement("p");
        empty.className = "cart-empty";
        empty.textContent = "Your bag is empty.";
        cartItems.appendChild(empty);
    }

    cart.forEach((item, index) => {

        subtotal += item.price * item.quantity;

        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <div>
                <strong></strong>
                <small></small>
            </div>
            <div class="quantity-controls">
                <button type="button" data-action="minus"
                        data-index="${index}" aria-label="Decrease quantity">−</button>
                <span></span>
                <button type="button" data-action="plus"
                        data-index="${index}" aria-label="Increase quantity">+</button>
            </div>`;

        $("strong", row).textContent = item.name;
        $("small", row).textContent = formatPrice(item.price);
        $("span", row).textContent = item.quantity;

        cartItems.appendChild(row);
    });

    if (cartSubtotal) {
        cartSubtotal.textContent = formatPrice(subtotal);
    }

    if (cartProgress) {
        cartProgress.style.width =
            Math.min((subtotal / FREE_DELIVERY_GBP) * 100, 100) + "%";
    }

    if (cartDeliveryText) {
        cartDeliveryText.textContent = subtotal >= FREE_DELIVERY_GBP
            ? "You've unlocked FREE delivery!"
            : `You're ${formatPrice(FREE_DELIVERY_GBP - subtotal)} away from free delivery`;
    }
}

function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add("active");
    if (closeCartButton) closeCartButton.focus();
}

function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove("active");
}

function addToCart(name, price) {

    const existing = cart.find(item => item.name === name);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ name, price, quantity: 1 });
    }

    saveCart();
    renderCart();
    openCart();
}

/* one listener handles every + and − button inside the bag */
if (cartItems) {
    cartItems.addEventListener("click", event => {

        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const index = Number(button.dataset.index);
        if (!cart[index]) return;

        if (button.dataset.action === "plus") {
            cart[index].quantity++;
        } else if (cart[index].quantity > 1) {
            cart[index].quantity--;
        } else {
            cart.splice(index, 1);
        }

        saveCart();
        renderCart();
    });
}

$$(".add-cart").forEach(button => {
    button.addEventListener("click", () => {
        addToCart(button.dataset.name, Number(button.dataset.price));
    });
});

if (openCartButton) openCartButton.addEventListener("click", () => { renderCart(); openCart(); });
if (closeCartButton) closeCartButton.addEventListener("click", closeCart);

if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
        const original = "CHECKOUT →";
        checkoutButton.textContent = "DEMO STORE — NO PAYMENT TAKEN";
        setTimeout(() => { checkoutButton.textContent = original; }, 2200);
    });
}


/* =========================================================
   14. ESCAPE KEY CLOSES EVERYTHING
   ========================================================= */

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeSearch();
    closeGait();
    closeCart();
    closeMenu();
});


/* =========================================================
   15. START-UP — paint everything once
   ========================================================= */

updateCurrency();   /* also draws the bag + updates every price */