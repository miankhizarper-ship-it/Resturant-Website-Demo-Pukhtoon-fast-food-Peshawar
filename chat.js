/* =========================================================
   Pukhtoon Fast Food — Pukhtoon AI chat widget
   Talks to the Apps Script web app (Gemini + Google Sheets).
   Falls back to a built-in demo assistant when no endpoint
   is configured, so the site always works standalone.
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.PUKHTOON_AI || {};
  var ENDPOINT = String(CFG.endpoint || "").trim();
  var LIVE = !!ENDPOINT && CFG.demoMode !== true;
  var CURRENCY = CFG.currency || "Rs.";
  var WA = CFG.whatsapp || "923150090303";
  var MAX_HISTORY = CFG.maxHistory || 12;
  var STORE_KEY = "pkff_ai_chat_v1";

  var el = {};
  var state = { messages: [], busy: false, open: false, greeted: false };
  var itemIndex = {};
  var siteMenu = [];
  var draft = { items: [], name: "", address: "", type: "", notes: "" };

  /* ---------------------------------------------------------
     Utilities
     --------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function elNew(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return CURRENCY + " " + Number(n || 0).toLocaleString("en-PK"); }
  function scrollDown(smooth) {
    if (!el.messages) return;
    el.messages.scrollTo({ top: el.messages.scrollHeight, behavior: smooth === false ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------
     Styled markup renderer (AI text -> HTML)
     --------------------------------------------------------- */
  function inline(s) {
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' + label + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/(?:Rs\.?|PKR)\s?(\d[\d,]*)/gi, '<span class="ai-price">' + CURRENCY + " $1</span>");
    return s;
  }

  function formatMarkup(raw) {
    var text = esc(String(raw || "")).replace(/\r\n/g, "\n").trim();
    if (!text) return "";
    var out = [];
    var list = null;
    var para = [];

    function flushPara() {
      if (!para.length) return;
      out.push("<p>" + para.map(inline).join("<br>") + "</p>");
      para = [];
    }
    function flushList() {
      if (!list) return;
      out.push("</" + list + ">");
      list = null;
    }

    text.split("\n").forEach(function (line) {
      var t = line.trim();

      if (!t) { flushPara(); flushList(); return; }

      var h = t.match(/^#{1,6}\s+(.*)$/);
      if (h) { flushPara(); flushList(); out.push("<h4>" + inline(h[1]) + "</h4>"); return; }

      var ul = t.match(/^[-•*]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (list !== "ul") { flushList(); out.push("<ul>"); list = "ul"; }
        out.push("<li>" + inline(ul[1]) + "</li>");
        return;
      }

      var ol = t.match(/^\d+[.)]\s+(.*)$/);
      if (ol) {
        flushPara();
        if (list !== "ol") { flushList(); out.push("<ol>"); list = "ol"; }
        out.push("<li>" + inline(ol[1]) + "</li>");
        return;
      }

      flushList();
      para.push(t);
    });

    flushPara();
    flushList();
    return out.join("");
  }

  /* ---------------------------------------------------------
     Message rendering
     --------------------------------------------------------- */
  function addRow(role) {
    var row = elNew("div", "ai-msg ai-msg--" + role);
    var avatar = elNew("div", "ai-msg__avatar");
    avatar.innerHTML = role === "user"
      ? '<i class="fa-solid fa-user"></i>'
      : '<i class="fa-solid fa-wand-magic-sparkles"></i>';
    var col = elNew("div", "ai-msg__col");
    row.appendChild(avatar);
    row.appendChild(col);
    el.messages.appendChild(row);
    return col;
  }

  function pushUser(text) {
    var col = addRow("user");
    var b = elNew("div", "ai-bubble");
    b.innerHTML = formatMarkup(text);
    col.appendChild(b);
    scrollDown();
  }

  function pushBot(payload) {
    var col = addRow("bot");

    if (payload.reply) {
      var b = elNew("div", "ai-bubble");
      b.innerHTML = formatMarkup(payload.reply);
      col.appendChild(b);
    }

    if (payload.items && payload.items.length) {
      col.appendChild(buildItems(payload.items));
    }

    if (payload.checkout && payload.checkout.ready) {
      col.appendChild(buildCheckout(payload.checkout));
    }

    if (payload.order) {
      col.appendChild(buildReceipt(payload.order));
    }

    scrollDown();
  }

  function showTyping() {
    var col = addRow("bot");
    col.appendChild(elNew("div", "ai-bubble",
      '<span class="ai-typing" aria-label="Assistant is typing"><span></span><span></span><span></span></span>'));
    scrollDown();
    return col.parentNode;
  }

  /* ---------------------------------------------------------
     Cards
     --------------------------------------------------------- */
  function buildItems(items) {
    var wrap = elNew("div", "ai-items");
    items.forEach(function (it) {
      if (!it || !it.id) return;
      itemIndex[it.id] = it;
      var card = elNew("div", "ai-item");
      var img = it.image ? String(it.image) : "";
      card.innerHTML =
        '<div class="ai-item__img">' +
        (img ? '<img src="' + esc(img) + '" alt="' + esc(it.name) + '" loading="lazy">' : "") +
        "</div>" +
        '<div class="ai-item__body">' +
        '<div class="ai-item__name">' + esc(it.name) + "</div>" +
        '<div class="ai-item__meta">' +
        '<span class="ai-item__price">' + money(it.price) + "</span>" +
        '<button class="ai-item__add" type="button" data-add-item="' + esc(it.id) + '">' +
        '<i class="fa-solid fa-plus"></i> Add</button>' +
        "</div></div>";
      wrap.appendChild(card);
    });
    return wrap;
  }

  function buildCheckout(co) {
    var card = elNew("div", "ai-card");
    var rows = (co.items || []).map(function (it) {
      return '<div class="ai-row"><span>' + esc(it.qty + "× " + it.name) + "</span><span>" +
        money(it.price * it.qty) + "</span></div>";
    }).join("");

    var fee = co.deliveryFee ? money(co.deliveryFee) : (co.orderType === "Takeaway" ? "Pickup" : "Free");
    var total = co.total != null ? co.total : (co.items || []).reduce(function (s, i) { return s + i.price * i.qty; }, 0);

    card.innerHTML =
      '<div class="ai-card__head"><i class="fa-solid fa-receipt"></i> Order summary</div>' +
      '<div class="ai-card__rows">' + rows +
      '<div class="ai-row"><span>' + esc(co.orderType || "Delivery") + " fee</span><span>" + esc(fee) + "</span></div>" +
      '<div class="ai-row ai-row--total"><span>Total</span><span>' + money(total) + "</span></div>" +
      (co.name ? '<div class="ai-row"><span>Name</span><span>' + esc(co.name) + "</span></div>" : "") +
      (co.address ? '<div class="ai-row"><span>Address</span><span>' + esc(co.address) + "</span></div>" : "") +
      "</div>" +
      '<div class="ai-card__actions">' +
      '<button class="ai-btn ai-btn--primary" type="button" data-confirm-order><i class="fa-solid fa-check"></i> Confirm order</button>' +
      '<button class="ai-btn ai-btn--ghost" type="button" data-change-order>Change</button>' +
      "</div>" +
      '<p class="ai-card__note">' + (LIVE
        ? "Saved to the restaurant sheet instantly. We call you on the number you share to confirm."
        : "Demo mode — nothing is sent. In live mode this writes straight to Google Sheets.") +
      "</p>";

    card._order = co;
    return card;
  }

  function buildReceipt(order) {
    var card = elNew("div", "ai-card ai-card--success");
    var id = order.orderId || "PK-DEMO";
    card.innerHTML =
      '<div class="ai-card__head"><i class="fa-solid fa-circle-check"></i> Order placed</div>' +
      '<div class="ai-card__rows">' +
      '<div class="ai-row"><span>Order ID</span><span><strong>' + esc(id) + "</strong></span></div>" +
      '<div class="ai-row"><span>Total</span><span>' + money(order.total) + "</span></div>" +
      '<div class="ai-row"><span>Status</span><span>New · in the kitchen queue</span></div>' +
      "</div>" +
      '<div class="ai-card__actions">' +
      '<a class="ai-btn ai-btn--wa" href="' + esc(order.whatsappUrl || waLink(order)) + '" target="_blank" rel="noopener">' +
      '<i class="fa-brands fa-whatsapp"></i> Send on WhatsApp</a>' +
      "</div>" +
      '<p class="ai-card__note">Keep this ID for follow-ups. Track it any time by asking "status of ' + esc(id) + '".</p>';
    return card;
  }

  function waLink(order) {
    var lines = ["*Pukhtoon Fast Food — AI order*", "Order: " + (order.orderId || "")];
    (order.items || []).forEach(function (i) {
      lines.push(i.qty + " x " + i.name + " — " + money(i.price * i.qty));
    });
    lines.push("Total: " + money(order.total));
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  /* ---------------------------------------------------------
     Transport
     --------------------------------------------------------- */
  function callBackend(payload) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
      redirect: "follow"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Server returned " + res.status);
        return res.text();
      })
      .then(function (txt) {
        try { return JSON.parse(txt); }
        catch (e) {
          throw new Error("Unexpected reply from the assistant server.");
        }
      })
      .finally(function () { clearTimeout(timer); });
  }

  function trackOrder(orderId) {
    if (!LIVE) {
      return Promise.resolve({
        reply: orderId.indexOf("PK-DEMO") === 0
          ? "**" + orderId + "** is a demo order, so it isn't stored anywhere. Connect the Apps Script URL in `config.js` and every order gets a real, trackable id."
          : "Order tracking needs the live backend. Connect the Apps Script URL in `config.js` and I'll pull the status straight from the sheet."
      });
    }
    return callBackend({ action: "status", orderId: orderId }).then(function (res) {
      if (!res || !res.ok || !res.order) {
        return { reply: (res && res.error) || ("I couldn't find an order with the id **" + orderId + "**. Check the id and try again.") };
      }
      var o = res.order;
      return {
        reply: "Order **" + o.orderId + "**\n\n- Status: **" + o.status + "**\n- " + o.items +
          "\n- Total: " + money(o.total) + "\n- " + (o.orderType || "Delivery") + " · placed " + o.timestamp +
          "\n\nNeed to change something? Call **+92 315 009 0303** and quote this id."
      };
    });
  }

  function lastN(n) {
    return state.messages.slice(-n).map(function (m) {
      return { role: m.role, text: m.text };
    });
  }

  function cartSnapshot() {
    if (window.PukhtoonOrder && typeof window.PukhtoonOrder.items === "function") {
      try { return window.PukhtoonOrder.items(); } catch (e) { return []; }
    }
    return [];
  }

  /* ---------------------------------------------------------
     Send
     --------------------------------------------------------- */
  function send(rawText) {
    var text = String(rawText || "").trim();
    if (!text || state.busy) return;

    el.input.value = "";
    autoGrow();
    pushUser(text);
    state.messages.push({ role: "user", text: text });
    saveChat();

    state.busy = true;
    setBusy(true);
    var typing = showTyping();

    var request;

    var tracked = text.match(/\b(PK-[A-Z0-9-]{3,})\b/i);
    if (tracked) {
      request = trackOrder(tracked[1].toUpperCase());
    } else if (LIVE) {
      request = callBackend({
        action: "chat",
        message: text,
        history: lastN(MAX_HISTORY),
        cart: cartSnapshot(),
        page: location.href
      });
    } else {
      request = Promise.resolve(demoReply(text));
    }

    request
      .then(function (res) {
        if (!res || res.ok === false) throw new Error((res && res.error) || "no response");
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        pushBot(res);
        if (res.reply) state.messages.push({ role: "model", text: res.reply });
        saveChat();
      })
      .catch(function (err) {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        var col = addRow("bot");
        var b = elNew("div", "ai-bubble");
        b.innerHTML = formatMarkup(
          "I couldn't reach the ordering service just now" +
          (err && err.message ? " (" + err.message + ")" : "") +
          ". You can still order on WhatsApp and we'll take it from there."
        );
        col.appendChild(b);
        var actions = elNew("div", "ai-card__actions");
        actions.innerHTML = '<a class="ai-btn ai-btn--wa" href="https://wa.me/' + WA +
          '?text=' + encodeURIComponent("Assalam-o-Alaikum, I'd like to place an order.") +
          '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Order on WhatsApp</a>';
        col.appendChild(actions);
        scrollDown();
      })
      .finally(function () {
        state.busy = false;
        setBusy(false);
      });
  }

  function placeOrder(co, btn) {
    if (!co || !co.items || !co.items.length) return;
    btn.disabled = true;
    var original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing…';

    var req = LIVE
      ? callBackend({ action: "placeOrder", order: co, page: location.href })
      : Promise.resolve(demoPlaceOrder(co));

    req
      .then(function (res) {
        if (!res || res.ok === false) throw new Error((res && res.error) || "Order could not be saved");
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Ordered';
        var changeBtn = btn.parentNode.querySelector("[data-change-order]");
        if (changeBtn) changeBtn.remove();
        pushBot({ reply: "Done — your order is in. 🎉", order: res });
        var qty = co.items.reduce(function (s, i) { return s + i.qty; }, 0);
        if (window.PukhtoonOrder && window.PukhtoonOrder.clear) window.PukhtoonOrder.clear();
        toast("Order " + (res.orderId || "") + " placed · " + qty + " item" + (qty > 1 ? "s" : ""));
        draft = { items: [], name: "", address: "", type: "", notes: "" };
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        var col = addRow("bot");
        var b = elNew("div", "ai-bubble");
        b.innerHTML = formatMarkup("That didn't go through: " + (err.message || "unknown error") +
          ". Nothing was saved — please try once more, or send the order on WhatsApp.");
        col.appendChild(b);
        scrollDown();
      });
  }

  function toast(msg) {
    var stack = document.getElementById("toastStack");
    if (!stack) return;
    var t = elNew("div", "toast", '<i class="fa-solid fa-circle-check"></i><span>' + esc(msg) + "</span>");
    stack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-visible"); });
    setTimeout(function () {
      t.classList.remove("is-visible");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 3200);
  }

  /* ---------------------------------------------------------
     Demo assistant (no endpoint configured)
     --------------------------------------------------------- */
  function loadSiteMenu() {
    siteMenu = [];
    Array.prototype.forEach.call(document.querySelectorAll(".dish[data-id]"), function (d) {
      var img = d.querySelector("img");
      siteMenu.push({
        id: d.getAttribute("data-id"),
        name: d.getAttribute("data-name") || "",
        price: Number(d.getAttribute("data-price") || 0),
        category: d.getAttribute("data-category") || "",
        image: img ? img.getAttribute("src") : ""
      });
    });
  }

  function pick(ids, fallbackCount) {
    var out = ids.map(function (id) {
      var m = siteMenu.filter(function (s) { return s.id === id; })[0];
      return m ? { id: m.id, name: m.name, price: m.price, image: m.image } : null;
    }).filter(Boolean);
    if (out.length < (fallbackCount || 1)) {
      siteMenu.slice(0, fallbackCount || 2).forEach(function (m) {
        if (!out.some(function (o) { return o.id === m.id; })) {
          out.push({ id: m.id, name: m.name, price: m.price, image: m.image });
        }
      });
    }
    return out;
  }

  function findItems(text) {
    var found = [];
    var lower = " " + text.toLowerCase() + " ";
    var seen = {};

    siteMenu.forEach(function (item) {
      var name = item.name.toLowerCase();
      var keys = [name];
      var first = name.split(" ")[0];
      if (first.length > 4 && first !== "chicken" && first !== "loaded") keys.push(first);
      if (/zinger/.test(name)) keys.push("zinger");
      if (/shawarma/.test(name)) keys.push("shawarma");
      if (/pizza/.test(name)) keys.push("pizza");
      if (/paratha/.test(name)) keys.push("paratha roll");
      if (/wings/.test(name)) keys.push("wings");
      if (/chow mein/.test(name)) keys.push("chow mein");
      if (/fries/.test(name)) keys.push("fries");
      if (/coffee/.test(name)) keys.push("coffee");
      if (/shake/.test(name)) keys.push("shake");
      if (/kabab/.test(name)) keys.push("kabab");

      var hit = keys.some(function (k) { return k && lower.indexOf(k) !== -1; });
      if (!hit || seen[item.id]) return;
      seen[item.id] = true;

      var qty = 1;
      var m = lower.match(new RegExp("(\\d+)\\s*(?:x\\s*)?" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      if (m) qty = Math.min(20, Math.max(1, parseInt(m[1], 10)));

      found.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: qty });
    });

    return found;
  }

  function draftTotals(type) {
    var total = draft.items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    return { subtotal: total, deliveryFee: 0, total: total, orderType: type || draft.type || "Delivery" };
  }

  function demoReply(text) {
    var lower = text.toLowerCase();
    var items = findItems(text);

    // name capture
    var nm = text.match(/(?:my name is|name is|mera naam|naam)\s+([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF .'-]{1,30})/i);
    if (nm) draft.name = nm[1].trim();

    // order type
    if (/takeaway|take away|pick ?up|parcel|le ?kar/.test(lower)) draft.type = "Takeaway";
    else if (/deliver|delivery|ghar|home/.test(lower)) draft.type = "Delivery";

    // address
    var area = text.match(/(tehkal|university town|uni town|canal town|hayatabad|gulbahar|dalazak|kohat road|saddar|abdara|board bazaar)/i);
    if (area) draft.address = (draft.address ? draft.address + ", " : "") + area[0];

    if (items.length) {
      items.forEach(function (it) {
        var ex = draft.items.filter(function (d) { return d.id === it.id; })[0];
        if (ex) ex.qty += it.qty;
        else draft.items.push(it);
      });
      var t = draftTotals();
      return {
        reply: "Added **" + items.map(function (i) { return i.qty + "× " + i.name; }).join("**, **") +
          "** to your order.\n\nRunning total: **" + money(t.total) + "**.\n\n" +
          (draft.name && (draft.type === "Takeaway" || draft.address)
            ? "Say **confirm** and I'll place it."
            : "Share your **name** and **delivery area** (Tehkal, University Town, Canal Town…) and I'll place it — or add more items."),
        items: items.map(function (i) { return { id: i.id, name: i.name, price: i.price, image: i.image }; })
      };
    }

    if (/(confirm|place (the )?order|checkout|order kar|final)/.test(lower)) {
      if (!draft.items.length) {
        return { reply: "There's nothing in the order yet. Tell me what you'd like — e.g. **2 Zinger Burgers and a Chow Mein**." };
      }
      if (!draft.name) return { reply: "Almost there — what **name** should I put on the order?" };
      if (draft.type !== "Takeaway" && !draft.address) {
        return { reply: "Which **area** should we deliver to? Tehkal, University Town, Canal Town and Hayatabad are all covered." };
      }
      var totals = draftTotals();
      return {
        reply: "Here's your order, **" + draft.name + "**. Check it once and confirm below.",
        checkout: {
          ready: true,
          name: draft.name,
          address: draft.type === "Takeaway" ? "Pickup — University Road, Tehkal Payan" : draft.address,
          orderType: draft.type || "Delivery",
          items: draft.items.map(function (i) { return { id: i.id, name: i.name, price: i.price, qty: i.qty }; }),
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          total: totals.total
        }
      };
    }

    if (/(hours|timing|time|khul|open|band)/.test(lower)) {
      return { reply: "We're open **4 PM – 2 AM**, every day.\n\nDelivery runs **3 PM – 1 AM**, so a late-night Zinger is never a problem. 🌙" };
    }
    if (/(where|location|address|kahan|map)/.test(lower)) {
      return { reply: "You'll find us on **University Road, Tehkal Payan** — right next to the NADRA Office, Peshawar.\n\nTwo outlets: University Road and Tehkal. Tap **Get directions** on the map below and we'll see you soon." };
    }
    if (/(deliver|delivery|area)/.test(lower)) {
      return { reply: "We deliver across **Tehkal, University Town, Canal Town, Hayatabad and Saddar** — roughly 20–35 minutes.\n\nMinimum order is **" + money(249) + "**. Tell me your area and I'll start the order." };
    }
    if (/(halal|zabiha)/.test(lower)) {
      return { reply: "Everything is **100% halal** — meat, oil and spices included. 🌙" };
    }
    if (/(pay|cash|card|easypaisa|jazzcash)/.test(lower)) {
      return { reply: "**Cash on delivery** for now, plus Easypaisa or JazzCash on request. Card machine isn't available yet." };
    }
    if (/(rating|review|trust|best)/.test(lower)) {
      return { reply: "We're rated **4.6★ on Google** (72+ reviews) and **4.9★ on Foodpanda** (97+). The Zinger Burger and Chicken Chow Mein carry most of those reviews. ⭐" };
    }
    if (/(menu|kya hai|what do you have|options|items)/.test(lower)) {
      return {
        reply: "Here's what people order most. Tap **Add** to build an order as we chat:",
        items: pick(["zinger-burger", "chow-mein", "cheese-shawarma", "loaded-fries"], 4)
      };
    }
    if (/(popular|recommend|suggest|best seller|bestseller|kya acha)/.test(lower)) {
      return {
        reply: "For a first order I'd go **Zinger Burger** (crispy fillet, " + money(380) + ") with **Loaded Fries** (" + money(350) + ").\n\nIf you're sharing, the **Crown Crust Pizza** (" + money(1150) + ") and **Chicken Chow Mein** (" + money(550) + ") feed two comfortably.",
        items: pick(["zinger-burger", "loaded-fries"], 2)
      };
    }
    if (/^(hi|hey|hello|salam|assalam|asalam|aoa|hy)\b/.test(lower) || lower.length < 4) {
      return { reply: "Wa alaikum assalam! 👋 I'm **Pukhtoon AI**. I can suggest dishes, check prices and place your order in a couple of messages.\n\nWhat are you in the mood for — burgers, pizza, rolls or something fried?" };
    }

    return {
      reply: "I can help with the **menu, prices, delivery areas, timings** — and I can place the order for you.\n\nTry: *\"2 zinger burgers and a chow mein, delivery to Tehkal\"* — or tell me what you're craving and I'll suggest something."
    };
  }

  function demoPlaceOrder(co) {
    var total = co.total != null ? co.total : co.items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var id = "PK-DEMO-" + Math.floor(1000 + Math.random() * 9000);
    return {
      ok: true,
      orderId: id,
      total: total,
      items: co.items,
      whatsappUrl: waLink({ orderId: id, items: co.items, total: total })
    };
  }

  /* ---------------------------------------------------------
     Panel behaviour
     --------------------------------------------------------- */
  function setBusy(b) {
    if (el.send) el.send.disabled = b;
  }

  function openPanel() {
    if (!el.panel) return;
    state.open = true;
    el.panel.classList.add("is-open");
    el.panel.setAttribute("aria-hidden", "false");
    el.launcher.setAttribute("aria-expanded", "true");
    el.launcher.classList.add("is-hidden");
    document.body.classList.add("ai-open");
    if (!state.greeted) {
      state.greeted = true;
      if (!state.messages.length) {
        pushBot({
          reply: "Assalam-o-Alaikum! 👋 I'm **Pukhtoon AI**, the ordering assistant at " +
            (CFG.restaurantName || "Pukhtoon Fast Food") + ".\n\nTell me what you're craving and I'll build the order — or ask about prices, delivery or timings."
        });
      }
    }
    setTimeout(function () { scrollDown(false); }, 60);
    setTimeout(function () { if (window.matchMedia("(min-width: 900px)").matches) el.input.focus(); }, 260);
  }

  function closePanel() {
    if (!el.panel) return;
    state.open = false;
    el.panel.classList.remove("is-open");
    el.panel.setAttribute("aria-hidden", "true");
    el.launcher.setAttribute("aria-expanded", "false");
    el.launcher.classList.remove("is-hidden");
    document.body.classList.remove("ai-open");
    el.launcher.focus({ preventScroll: true });
  }

  function togglePanel() { state.open ? closePanel() : openPanel(); }

  function autoGrow() {
    if (!el.input) return;
    el.input.style.height = "auto";
    el.input.style.height = Math.min(el.input.scrollHeight, 110) + "px";
  }

  function saveChat() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state.messages.slice(-24)));
    } catch (e) { /* private mode */ }
  }

  function restoreChat() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!Array.isArray(saved) || !saved.length) return;
      state.messages = saved;
      state.greeted = true;
      saved.slice(-8).forEach(function (m) {
        if (m.role === "user") pushUser(m.text);
        else pushBot({ reply: m.text });
      });
      var fresh = addRow("bot");
      fresh.appendChild(elNew("div", "ai-bubble",
        '<span style="color:#9a9aa3">Conversation restored — or start fresh with the <i class="fa-solid fa-rotate-left"></i> button above.</span>'));
    } catch (e) { /* ignore */ }
  }

  function resetChat() {
    state.messages = [];
    state.greeted = false;
    draft = { items: [], name: "", address: "", type: "", notes: "" };
    el.messages.innerHTML = "";
    saveChat();
    openPanel();
  }

  /* ---------------------------------------------------------
     Events
     --------------------------------------------------------- */
  function handleClick(e) {
    var addBtn = e.target.closest("[data-add-item]");
    if (addBtn) {
      var id = addBtn.getAttribute("data-add-item");
      var item = itemIndex[id];
      if (item && window.PukhtoonOrder && window.PukhtoonOrder.add) {
        window.PukhtoonOrder.add(item, 1);
        addBtn.classList.add("is-added");
        addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
        setTimeout(function () {
          addBtn.classList.remove("is-added");
          addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
        }, 1800);
      }
      return;
    }

    var confirmBtn = e.target.closest("[data-confirm-order]");
    if (confirmBtn) {
      var card = confirmBtn.closest(".ai-card");
      if (card && card._order) placeOrder(card._order, confirmBtn);
      return;
    }

    var changeBtn = e.target.closest("[data-change-order]");
    if (changeBtn) {
      closePanel();
      if (window.PukhtoonOrder && window.PukhtoonOrder.open) window.PukhtoonOrder.open();
      return;
    }
  }

  function bind() {
    el.launcher.addEventListener("click", togglePanel);
    el.close.addEventListener("click", closePanel);
    el.reset.addEventListener("click", resetChat);
    el.messages.addEventListener("click", handleClick);

    el.quick.addEventListener("click", function (e) {
      var chip = e.target.closest(".ai-chip");
      if (chip) send(chip.getAttribute("data-prompt") || chip.textContent);
    });

    el.form.addEventListener("submit", function (e) {
      e.preventDefault();
      send(el.input.value);
    });

    el.input.addEventListener("input", autoGrow);
    el.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(el.input.value);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) closePanel();
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function init() {
    el.launcher = document.getElementById("aiLauncher");
    el.panel = document.getElementById("aiPanel");
    if (!el.launcher || !el.panel) return;

    el.messages = document.getElementById("aiMessages");
    el.quick = document.getElementById("aiQuick");
    el.form = document.getElementById("aiForm");
    el.input = document.getElementById("aiInput");
    el.send = document.getElementById("aiSend");
    el.close = document.getElementById("aiClose");
    el.reset = document.getElementById("aiReset");
    el.status = document.getElementById("aiStatus");

    if (el.status) {
      el.status.innerHTML = LIVE
        ? '<span class="dot"></span> Online · replies in seconds'
        : '<span class="dot" style="background:#ffb27a;box-shadow:0 0 0 3px rgba(255,178,122,.14)"></span> Demo mode · sample replies';
    }

    var foot = document.getElementById("aiFootNote");
    if (foot) {
      foot.innerHTML = LIVE
        ? 'Powered by <b>Gemini</b> · orders land in Google Sheets · <b>+92 315 009 0303</b>'
        : 'Powered by <b>Gemini</b> · <span class="ai-demo">demo build — connect the Apps Script URL in config.js to go live</span>';
    }

    loadSiteMenu();
    bind();
    restoreChat();

    // hand the widget to the page for debugging / deep links
    window.PukhtoonAI = {
      open: openPanel,
      close: closePanel,
      send: send,
      reset: resetChat,
      isLive: LIVE
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
