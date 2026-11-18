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

## Files

```
index.html      Markup: header, hero, menu, features, reviews, location, footer, cart drawer
style.css       Design system, dark fast-food theme, animations, responsive breakpoints
script.js       Menu filtering, cart state, drawer, WhatsApp checkout, UI polish
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
