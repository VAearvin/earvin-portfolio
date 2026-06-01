/* ============================================================
   Earvin Laureano — single source of truth for pricing & helpers.
   Loaded by the hub + all category pages.
   ============================================================ */

window.PRICING = {
  currency: "USD",
  bookingUrl: "/#contact",
  partnership: { from: 2000, dedicatedFrom: 3500, model: "retainer" },
  audits: {
    free: { price: 0 },
    full: { price: 600, credited: true, creditWindowDays: 30 }
  },
  builds: {
    foundation:       { from: 1800 },
    foundationSeoAi:  { from: 3800 },
    relaunch:         { from: 2400 },
    relaunchSeoAi:    { from: 4400 },
    managedMigration: { from: 10000, customQuote: true }
  },
  funnel: { from: 1500 },
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
