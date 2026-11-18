/* =========================================================
   Pukhtoon Fast Food Peshawar — script.js
   Vanilla JS: menu filter, cart, WhatsApp checkout, UI polish
   ========================================================= */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- Config ---------- */
  const WHATSAPP_NUMBER = "923150090303";
  const CART_KEY = "pkff_cart_v1";
  const CUSTOMER_KEY = "pkff_customer_v1";

  /* ---------- Helpers ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const money = (n) => "Rs. " + Number(n).toLocaleString("en-US");

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage unavailable — cart simply won't persist */
    }
  }

  /* =========================================================
     MENU DATA (read from the DOM so prices stay in one place)
     ========================================================= */
  const dishes = {};
  $$(".dish").forEach((card) => {
    const { id, name, price } = card.dataset;
    const img = $(".dish__media img", card);
    dishes[id] = {
      id: id,
      name: name,
      price: Number(price),
      image: img ? img.getAttribute("src") : "",
    };
  });

  /* =========================================================
     TOASTS
     ========================================================= */
  const toastStack = $("#toastStack");

  function toast(message, type) {
    if (!toastStack) return;
    const el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    const icon = document.createElement("i");
    icon.className =
      type === "error"
        ? "fa-solid fa-circle-exclamation"
        : type === "info"
        ? "fa-solid fa-circle-info"
        : "fa-solid fa-circle-check";
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    toastStack.appendChild(el);

    window.setTimeout(() => {
      el.classList.add("is-out");
      window.setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* =========================================================
     CART STATE
     ========================================================= */
  const cart = new Map(); // id -> qty

  const savedCart = readStore(CART_KEY, []);
  if (Array.isArray(savedCart)) {
    savedCart.forEach((entry) => {
      if (entry && dishes[entry.id] && Number(entry.qty) > 0) {
        cart.set(entry.id, Math.min(99, Math.floor(Number(entry.qty))));
      }
    });
  }

  const cartList = $("#cartList");
  const cartEmpty = $("#cartEmpty");
  const cartTools = $("#cartTools");
  const cartToolsHint = $("#cartToolsHint");
  const cartSubtotal = $("#cartSubtotal");
  const cartTotal = $("#cartTotal");
  const cartLabel = $("#cartLabel");
  const cartCount = $("#cartCount");
  const headerCartCount = $("#headerCartCount");
  const floatingCart = $("#floatingCart");

  function cartQuantity() {
    let total = 0;
    cart.forEach((qty) => (total += qty));
    return total;
  }

  function cartSubtotalValue() {
    let total = 0;
    cart.forEach((qty, id) => {
      if (dishes[id]) total += dishes[id].price * qty;
    });
    return total;
  }

  function persistCart() {
    const rows = [];
    cart.forEach((qty, id) => rows.push({ id: id, qty: qty }));
    writeStore(CART_KEY, rows);
  }

  function renderCart() {
    if (!cartList) return;

    const count = cartQuantity();
    const subtotal = cartSubtotalValue();

    // Sync all the counters
    if (cartCount) cartCount.textContent = String(count);
    if (headerCartCount) {
      headerCartCount.textContent = String(count);
      headerCartCount.hidden = count === 0;
    }
    if (cartTotal) cartTotal.textContent = money(subtotal);
    if (cartLabel) cartLabel.textContent = count
      ? count + (count === 1 ? " item &middot; view order" : " items &middot; view order").replace("&middot;", "·")
      : "View order";
    if (cartSubtotal) cartSubtotal.textContent = money(subtotal);
    if (cartToolsHint) {
      cartToolsHint.textContent = count
        ? count + (count === 1 ? " item in your order" : " items in your order")
        : "";
    }

    // Empty vs filled states
    if (cartEmpty) cartEmpty.hidden = count > 0;
    if (cartList) cartList.hidden = count === 0;
    if (cartTools) cartTools.hidden = count === 0;

    const checkoutForm = document.getElementById("checkoutForm");
    if (checkoutForm) checkoutForm.hidden = count === 0;

    // Floating cart visibility
    if (floatingCart) floatingCart.classList.toggle("is-visible", count > 0);

    // Rebuild rows
    cartList.textContent = "";
    cart.forEach((qty, id) => {
      const dish = dishes[id];
      if (!dish) return;

      const li = document.createElement("li");
      li.className = "cart-item";

      const img = document.createElement("img");
      img.className = "cart-item__img";
      img.src = dish.image;
      img.alt = dish.name;
      img.loading = "lazy";
      img.width = 58;
      img.height = 58;

      const info = document.createElement("div");
      info.className = "cart-item__info";
      const name = document.createElement("h4");
      name.textContent = dish.name;
      const price = document.createElement("p");
      price.className = "cart-item__price";
      price.textContent = money(dish.price) + " × " + qty + " = " + money(dish.price * qty);
      info.appendChild(name);
      info.appendChild(price);

      const right = document.createElement("div");
      right.className = "cart-item__right";

      const qtyBox = document.createElement("div");
      qtyBox.className = "qty";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.setAttribute("aria-label", "Remove one " + dish.name);
      minus.dataset.action = "decrease";
      minus.dataset.id = id;
      minus.innerHTML = '<i class="fa-solid fa-minus" aria-hidden="true"></i>';

      const qtyValue = document.createElement("span");
      qtyValue.textContent = String(qty);
      qtyValue.setAttribute("aria-live", "polite");

      const plus = document.createElement("button");
      plus.type = "button";
      plus.setAttribute("aria-label", "Add one more " + dish.name);
      plus.dataset.action = "increase";
      plus.dataset.id = id;
      plus.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';

      qtyBox.appendChild(minus);
      qtyBox.appendChild(qtyValue);
      qtyBox.appendChild(plus);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cart-item__remove";
      remove.dataset.action = "remove";
      remove.dataset.id = id;
      remove.textContent = "Remove";

      right.appendChild(qtyBox);
      right.appendChild(remove);

      li.appendChild(img);
      li.appendChild(info);
      li.appendChild(right);
      cartList.appendChild(li);
    });

    persistCart();
  }

  function addToCart(id, button) {
    const dish = dishes[id];
    if (!dish) return;

    cart.set(id, (cart.get(id) || 0) + 1);
    renderCart();
    bumpCart();

    if (button) {
      button.classList.add("is-added");
      const label = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Added';
      window.setTimeout(() => {
        button.classList.remove("is-added");
        button.innerHTML = label;
      }, 1300);
    }

    toast(dish.name + " added to your order");
  }

  function bumpCart() {
    if (!floatingCart) return;
    floatingCart.classList.remove("is-bump");
    // Force reflow so the animation can restart
    void floatingCart.offsetWidth;
    floatingCart.classList.add("is-bump");
  }

  function changeQty(id, delta) {
    if (!cart.has(id)) return;
    const next = cart.get(id) + delta;
    if (next <= 0) {
      cart.delete(id);
      const dish = dishes[id];
      toast((dish ? dish.name : "Item") + " removed from your order", "info");
    } else {
      cart.set(id, Math.min(99, next));
    }
    renderCart();
  }

  function removeItem(id) {
    const dish = dishes[id];
    cart.delete(id);
    renderCart();
    toast((dish ? dish.name : "Item") + " removed from your order", "info");
  }

  /* Delegated clicks for add buttons and cart rows */
  document.addEventListener("click", (event) => {
    const addBtn = event.target.closest("[data-add]");
    if (addBtn) {
      addToCart(addBtn.dataset.add, addBtn);
      return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn && cartList && cartList.contains(actionBtn)) {
      const id = actionBtn.dataset.id;
      const action = actionBtn.dataset.action;
      if (action === "increase") changeQty(id, 1);
      else if (action === "decrease") changeQty(id, -1);
      else if (action === "remove") removeItem(id);
    }
  });

  /* =========================================================
     CATEGORY FILTER
     ========================================================= */
  const filters = $$(".filter");
  const menuCards = $$(".dish");

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      filters.forEach((other) => {
        const isActive = other === button;
        other.classList.toggle("is-active", isActive);
        other.setAttribute("aria-pressed", String(isActive));
      });

      menuCards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.hidden = !show;
        card.classList.remove("is-in");
        if (show) {
          // Re-trigger the entrance animation
          void card.offsetWidth;
          card.classList.add("is-in");
        }
      });
    });
  });

  /* =========================================================
     DRAWER
     ========================================================= */
  const drawer = $("#cartDrawer");
  const overlay = $("#drawerOverlay");
  const drawerClose = $("#drawerClose");
  const headerCartBtn = $("#headerCartBtn");
  const browseMenuBtn = $("#browseMenuBtn");
  const clearCartBtn = $("#clearCartBtn");

  let lastFocused = null;
  let closeTimer = null;

  if (drawer) drawer.inert = true;

  function focusableInDrawer() {
    if (!drawer) return [];
    return $$(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      drawer
    ).filter((el) => el.offsetParent !== null);
  }

  function openDrawer() {
    if (!drawer || !overlay) return;
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    lastFocused = document.activeElement;
    overlay.hidden = false;
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-cart-open");
    window.requestAnimationFrame(() => {
      const first = drawerClose || focusableInDrawer()[0];
      if (first) first.focus({ preventScroll: true });
    });
  }

  function closeDrawer() {
    if (!drawer || !overlay) return;
    document.body.classList.remove("is-cart-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    closeTimer = window.setTimeout(() => {
      overlay.hidden = true;
    }, 450);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  if (headerCartBtn) headerCartBtn.addEventListener("click", openDrawer);
  if (floatingCart) floatingCart.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  if (browseMenuBtn) {
    browseMenuBtn.addEventListener("click", () => {
      closeDrawer();
      const menu = $("#menu");
      if (menu) menu.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (!cart.size) return;
      cart.clear();
      renderCart();
      toast("Your order has been cleared", "info");
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("is-cart-open")) return;

    if (event.key === "Escape") {
      closeDrawer();
      return;
    }

    if (event.key === "Tab") {
      const items = focusableInDrawer();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* =========================================================
     CHECKOUT FORM
     ========================================================= */
  const form = $("#checkoutForm");
  const nameInput = $("#customerName");
  const addressInput = $("#customerAddress");
  const notesInput = $("#orderNotes");
  const nameError = $("#nameError");
  const addressError = $("#addressError");
  const placeOrderBtn = $("#placeOrderBtn");
  const deliveryNote = $("#deliveryNote");

  function selectedOrderType() {
    const checked = form ? $('input[name="orderType"]:checked', form) : null;
    return checked ? checked.value : "Delivery";
  }

  function setFieldError(input, errorEl, show) {
    if (!input) return;
    const field = input.closest(".field");
    if (field) field.classList.toggle("is-invalid", show);
    if (errorEl) errorEl.hidden = !show;
    input.setAttribute("aria-invalid", String(show));
  }

  function saveCustomer() {
    if (!form) return;
    writeStore(CUSTOMER_KEY, {
      name: nameInput ? nameInput.value.trim() : "",
      address: addressInput ? addressInput.value.trim() : "",
      notes: notesInput ? notesInput.value.trim() : "",
      type: selectedOrderType(),
    });
  }

  function restoreCustomer() {
    const saved = readStore(CUSTOMER_KEY, null);
    if (!saved || !form) return;
    if (nameInput && saved.name) nameInput.value = saved.name;
    if (addressInput && saved.address) addressInput.value = saved.address;
    if (notesInput && saved.notes) notesInput.value = saved.notes;
    if (saved.type) {
      const radio = form.querySelector('input[name="orderType"][value="' + saved.type + '"]');
      if (radio) radio.checked = true;
    }
  }

  function syncOrderType() {
    const type = selectedOrderType();
    if (deliveryNote) {
      deliveryNote.innerHTML =
        type === "Delivery"
          ? '<i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Delivery charges confirmed on WhatsApp'
          : '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Pick up from Tehkal Payan Rd, near NADRA Office';
    }
    if (addressInput) {
      addressInput.placeholder =
        type === "Delivery"
          ? "House / street, area — e.g. Tehkal Payan"
          : "Optional — area you are coming from";
    }
    if (type === "Delivery") {
      // nothing to pre-clear; validation handled on submit
    } else {
      setFieldError(addressInput, addressError, false);
    }
    saveCustomer();
  }

  if (form) {
    $$('input[name="orderType"]', form).forEach((radio) => {
      radio.addEventListener("change", syncOrderType);
    });
    [nameInput, addressInput, notesInput].forEach((input) => {
      if (!input) return;
      input.addEventListener("input", () => {
        if (input === nameInput) setFieldError(nameInput, nameError, false);
        if (input === addressInput) setFieldError(addressInput, addressError, false);
      });
      input.addEventListener("change", saveCustomer);
    });
  }

  function buildOrderMessage() {
    const type = selectedOrderType();
    const name = nameInput ? nameInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";
    const notes = notesInput ? notesInput.value.trim() : "";

    const lines = [];
    lines.push("*NEW ORDER — Pukhtoon Fast Food Peshawar*");
    lines.push("");
    lines.push("*Order Type:* " + type);
    lines.push("*Name:* " + name);
    if (type === "Delivery" && address) lines.push("*Address:* " + address);
    lines.push("");
    lines.push("*My Order*");

    let i = 1;
    cart.forEach((qty, id) => {
      const dish = dishes[id];
      if (!dish) return;
      lines.push(
        i + ". " + qty + " × " + dish.name + " — " + money(dish.price * qty)
      );
      i += 1;
    });

    lines.push("");
    lines.push("*Total Bill:* " + money(cartSubtotalValue()));
    if (notes) {
      lines.push("");
      lines.push("*Notes:* " + notes);
    }
    lines.push("");
    lines.push("_Please confirm my order. Sent from the Pukhtoon Fast Food website._");

    return lines.join("\n");
  }

  function handlePlaceOrder() {
    if (!cart.size) {
      toast("Add something tasty to your order first", "info");
      openDrawer();
      return;
    }

    const type = selectedOrderType();
    const name = nameInput ? nameInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";
    let valid = true;

    if (name.length < 2) {
      setFieldError(nameInput, nameError, true);
      valid = false;
    }
    if (type === "Delivery" && address.length < 5) {
      setFieldError(addressInput, addressError, true);
      valid = false;
    }

    if (!valid) {
      toast("Please complete your name and delivery address", "error");
      const firstInvalid = drawer ? $(".field.is-invalid input", drawer) : null;
      if (firstInvalid) firstInvalid.focus({ preventScroll: false });
      return;
    }

    saveCustomer();

    const url =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildOrderMessage());

    const win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;

    toast("WhatsApp opened — press send to confirm your order");
    window.setTimeout(closeDrawer, 900);
  }

  if (placeOrderBtn) placeOrderBtn.addEventListener("click", handlePlaceOrder);

  /* =========================================================
     HEADER / NAVIGATION
     ========================================================= */
  const header = $("#siteHeader");
  const nav = $("#primaryNav");
  const navToggle = $("#navToggle");

  function onScroll() {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    $$(".nav__link, .nav__cta", nav).forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) closeNav();
    });
  }

  /* Active nav link based on the section in view */
  const sections = $$("main section[id]");
  const navLinks = $$(".nav__link");

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* =========================================================
     SCROLL REVEALS
     ========================================================= */
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window && revealItems.length) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("is-visible");
          observer.unobserve(el);
          // Drop the reveal classes once done so hover transforms work again
          window.setTimeout(() => {
            el.classList.remove("reveal", "is-visible");
          }, 850);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* =========================================================
     YEAR + INIT
     ========================================================= */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  restoreCustomer();
  syncOrderType();
  renderCart();

  // Show the floating cart on load if a saved cart exists
  if (floatingCart && cart.size) floatingCart.classList.add("is-visible");
})();
