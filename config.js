/* =========================================================
   Pukhtoon Fast Food — AI assistant config
   ---------------------------------------------------------
   1. Deploy the Apps Script from /apps-script as a Web App
      (Execute as: Me · Who has access: Anyone).
   2. Paste the /exec URL below.
   3. Leave it empty to browse the site in DEMO MODE:
      the assistant still answers and can build an order,
      but nothing is sent to Gemini or Google Sheets.
   ========================================================= */
window.PUKHTOON_AI = {
  // e.g. "https://script.google.com/macros/s/AKfycb.../exec"
  endpoint: "https://script.google.com/macros/s/AKfycbwI43GloCM9c36zdyJRsgxxG6Yi--SVlFRNn6x0If2MZi5n2dUhWVctGQ9aQKFY8ybuTw/exec",

  restaurantName: "Pukhtoon Fast Food Peshawar",
  whatsapp: "923150090303",
  currency: "Rs.",

  // true = always use the built-in sample brain (handy for demos).
  // Leave false: the widget goes live as soon as `endpoint` is filled in.
  demoMode: false,

  // How many previous messages to send back to the assistant
  maxHistory: 12,
};
