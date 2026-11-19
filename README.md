# Pukhtoon Fast Food Peshawar — Demo Website

A modern, mobile-first demo restaurant website for **Pukhtoon Fast Food Peshawar**
(University Road, Tehkal Payan, Peshawar) built with clean **HTML5, CSS3 and vanilla JavaScript**.
No frameworks, no build step — open `index.html` and it runs.

## Live features

| Section | What it does |
| --- | --- |
| **Top bar & header** | Sticky, blurred header with scroll state, active-section nav highlighting and a mobile slide-down menu. |
| **Hero** | Headline, budget-price subheadline, "Explore Menu" smooth scroll, direct WhatsApp CTA, trust badges (4.6★ Google, open till 2 AM, 100% Halal) and a rating stats strip. |
| **Menu** | 12 dishes across 5 categories with live filtering (All / Burgers / Pizzas / Rolls & Shawarma / Sides & Chinese / Desserts & Drinks), bestseller tags and real PKR pricing. |
| **Cart** | Add to order, quantity stepper, remove, clear, live item count + total, cart persisted in `localStorage`. |
| **Checkout drawer** | Slide-out panel with Name, Delivery Address (area suggestions for Tehkal, University Town, Canal Town, Hayatabad) and Delivery / Takeaway order type. Validates inputs and builds a formatted WhatsApp receipt. |
| **Reviews** | Google + Foodpanda rating summary and three customer reviews. |
| **Location** | Embedded Google Map (dark-styled), both outlets, timings, and clickable Call / WhatsApp buttons. |
| **Pukhtoon AI** | Floating chat assistant powered by **Gemini** with the menu as context. Recommends dishes with photo cards, answers FAQs, builds an order conversationally and — once confirmed — writes it to **Google Sheets** through an **Apps Script** backend. Falls back to a scripted demo brain when no backend is configured. |
| **Extras** | Toast notifications, scroll-reveal animations, focus trapping + `Esc` to close the drawer, reduced-motion support, `prefers-reduced-motion` and keyboard-friendly controls. |

## Order flow

1. Add dishes to the order.
2. Open the floating cart (or the bag icon in the header).
3. Enter name, address and order type.
4. **Place Order via WhatsApp** opens:

```
https://wa.me/923150090303?text=<formatted receipt>
```

The receipt includes the order type, customer name, address, each line item with
quantity and line total, the full bill and any notes — so the kitchen can confirm in one tap.

## AI ordering assistant

The chat button in the bottom-left opens **Pukhtoon AI**. It can:

- recommend dishes and show their photos inside the conversation,
- answer questions about prices, timings, delivery areas and payment,
- build an order from plain language (“2 zingers and a chow mein, Ali, Tehkal”),
- show a summary card, and on **Confirm** write the order to Google Sheets,
- track an order: “status of PK-251118-0001”.

Architecture:

```
chat.js  →  Apps Script web app  →  Gemini (menu + FAQ context, JSON reply)
                     ↓
             Google Sheets  (Menu · Orders · Settings · Knowledge)
```

**Setup:** see **[SETUP.md](SETUP.md)** — the sheet is already built; you only paste the
Apps Script files, deploy as a web app and put the `/exec` URL in `config.js`.

**Without a backend** the widget runs in demo mode: it answers from a small built-in script,
builds an order and shows the confirm card, but saves nothing.

## Files

```
index.html      Markup: header, hero, menu, features, reviews, location, footer, cart drawer, AI panel
style.css       Design system, dark fast-food theme, animations, responsive breakpoints
script.js       Menu filtering, cart state, drawer, WhatsApp checkout, UI polish, cart API for the AI
config.js       AI endpoint + restaurant constants (paste your Apps Script /exec URL here)
chat.css        AI chat widget styling
chat.js         AI chat widget: messages, dish cards, order confirm, order tracking, demo brain
apps-script/    Backend: Code.gs (orders + sheets), Gemini.gs (API), Secrets.gs (key, git-ignored)
SETUP.md        Step-by-step deploy guide for the sheet + Apps Script + website
assets/images/  12 locally-hosted food photos (4:3, optimised JPEG)
```

## Customising

- **Phone / WhatsApp:** search for `923150090303` in `index.html` and `WHATSAPP_NUMBER` in `script.js`.
- **Menu & prices:** each dish is an `<article class="dish">` with `data-id`, `data-name`, `data-price`
  and `data-category`. Change those and the price text; the cart reads from the markup, so there is
  only one place to edit.
- **Brand colours:** CSS custom properties at the top of `style.css` (`--red`, `--orange`, `--card`…).

## Notes

- Icons come from the FontAwesome CDN and type from Google Fonts (Poppins + Inter).
- Food photography is stored locally in `assets/images` so the demo never shows broken images.
- The demo is illustrative: prices, reviews and business claims are sample content.
- The AI never invents prices: the sheet is the source of truth and the backend re-validates
  every basket before writing an order. `accept_ai_orders = FALSE` in the Settings tab is an
  instant kill switch for online ordering.
