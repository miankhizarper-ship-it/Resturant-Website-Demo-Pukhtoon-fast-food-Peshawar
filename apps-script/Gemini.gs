/**
 * ============================================================
 *  Gemini layer — talk to Google's Generative Language API
 *  Model: CONFIG.MODEL (gemini-2.5-flash) with fallbacks.
 * ============================================================
 */

var GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/";

/**
 * Structured output schema. Gemini can only reply in this shape,
 * which means the website never has to guess where prices or
 * item ids are.
 */
var RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: {
      type: "STRING",
      description: "The message to show the customer. Short, warm, formatted with **bold** and \"- \" bullets. Never raw JSON or HTML."
    },
    itemIds: {
      type: "ARRAY",
      description: "Ids from the MENU of every dish mentioned in the reply, in the order they appear. Empty when no dish is mentioned.",
      items: { type: "STRING" }
    },
    checkout: {
      type: "OBJECT",
      description: "Fill only when the customer has given items AND a name AND (for delivery) an area/address. Otherwise set ready=false.",
      properties: {
        ready: {
          type: "BOOLEAN",
          description: "true only when the order is complete enough to confirm."
        },
        name: { type: "STRING", description: "Customer name as they gave it." },
        phone: { type: "STRING", description: "Phone number if the customer shared one, else empty." },
        address: { type: "STRING", description: "House/street/area for delivery, or 'Pickup' for takeaway." },
        orderType: { type: "STRING", enum: ["Delivery", "Takeaway"] },
        notes: { type: "STRING", description: "Special instructions (extra chutney, no onions...)." },
        items: {
          type: "ARRAY",
          description: "Dishes the customer wants to order.",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING", description: "Menu id of the dish." },
              qty: { type: "INTEGER", description: "How many." }
            },
            required: ["id", "qty"]
          }
        }
      },
      required: ["ready"]
    }
  },
  required: ["reply", "itemIds"]
};

function getApiKey_() {
  var fromProps = "";
  try {
    fromProps = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
  } catch (err) { /* properties always exist, but never let this block a reply */ }

  if (fromProps.trim()) return fromProps.trim();
  if (typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY) return String(GEMINI_API_KEY).trim();
  return "";
}

/**
 * Calls Gemini, walking the model list until one answers.
 * @return {{text: string, model: string}}
 */
function callGemini_(systemText, contents, menu) {
  var key = getApiKey_();
  if (!key) throw new Error("NoGeminiKey");

  var models = [CONFIG.MODEL].concat(CONFIG.MODEL_FALLBACKS || []);
  var lastError = "";

  for (var i = 0; i < models.length; i++) {
    var model = models[i];

    var attempt = geminiRequest_(model, key, systemText, contents, true);

    // Some models reject thinkingConfig — retry once without it
    if (!attempt.ok && attempt.status === 400 && /think/i.test(attempt.error || "")) {
      attempt = geminiRequest_(model, key, systemText, contents, false);
    }

    if (attempt.ok) return { text: attempt.text, model: model };

    lastError = model + " -> " + attempt.error;
    Logger.log("Gemini attempt failed: %s", lastError);

    // A bad key will fail on every model — stop early
    if (attempt.status === 400 && /api key|api_key|invalid argument|permission/i.test(attempt.error || "")) break;
  }

  throw new Error("GeminiFailed: " + lastError);
}

function geminiRequest_(model, key, systemText, contents, withThinkingConfig) {
  var url = GEMINI_ENDPOINT + model + ":generateContent";

  var generationConfig = {
    temperature: 0.65,
    topP: 0.9,
    maxOutputTokens: 900,
    responseMimeType: "application/json",
    responseSchema: RESPONSE_SCHEMA
  };

  if (withThinkingConfig && /^gemini-2\.5/.test(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  var payload = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: contents,
    generationConfig: generationConfig
  };

  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { "x-goog-api-key": key },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    return { ok: false, status: 0, error: "network: " + (err && err.message ? err.message : err) };
  }

  var status = res.getResponseCode();
  var body = res.getContentText();

  if (status !== 200) {
    var message = body;
    try {
      var parsed = JSON.parse(body);
      if (parsed.error && parsed.error.message) message = parsed.error.message;
    } catch (err) { /* keep the raw body */ }
    return { ok: false, status: status, error: message };
  }

  var data;
  try {
    data = JSON.parse(body);
  } catch (err) {
    return { ok: false, status: status, error: "Gemini returned unreadable JSON." };
  }

  var candidate = (data.candidates || [])[0];
  if (!candidate) {
    var blocked = data.promptFeedback && data.promptFeedback.blockReason;
    return { ok: false, status: status, error: blocked ? "blocked (" + blocked + ")" : "no candidates returned" };
  }

  var parts = (candidate.content && candidate.content.parts) || [];
  var text = parts.map(function (p) { return p.text || ""; }).join("").trim();

  if (!text) {
    return { ok: false, status: status, error: "empty reply (finishReason=" + (candidate.finishReason || "unknown") + ")" };
  }

  return { ok: true, status: status, text: text };
}
