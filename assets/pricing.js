/* ============================================================
   Earvin Laureano — single source of truth for pricing & helpers.
   Loaded by the hub + all category pages.
   ============================================================ */

window.PRICING = {
  currency: "USD",
  bookingUrl: "/#contact",
  partnership: { from: 1997, dedicatedFrom: 3497, model: "retainer" },
  audits: {
    free: { price: 0 },
    full: { price: 597, credited: true, creditWindowDays: 30 }
  },
  builds: {
    foundation:       { from: 1797 },
    foundationSeoAi:  { from: 3797 },
    relaunch:         { from: 2397 },
    relaunchSeoAi:    { from: 4397 },
    managedMigration: { from: 9997, customQuote: true }
  },
  funnel: { from: 1497 },
  websiteCare: {
    care:   { monthly: 99 },
    growth: { monthly: 299 },
    pro:    { monthly: 599 }
  },
  terms: {
    deposit: "50% deposit, 50% on launch",
    pricingNote: "\"From\" pricing — final scope varies",
    firstMonthFree: true,
    buyoutPremiumPct: "30–40%"
  }
};

window.money = function (n) { return "$" + Number(n).toLocaleString("en-US"); };
