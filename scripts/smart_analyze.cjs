#!/usr/bin/env node
/**
 * Smart financial analysis — recategorizes by merchant name instead of trusting Monarch labels.
 * Focuses on the last 12 months for actionable insights.
 */

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.resolve(__dirname, "..", "data", "transactions.csv");

// ── Merchant → Category mapping ──
const MERCHANT_CATEGORIES = {
  // Groceries
  "Kroger": "Groceries", "Walmart": "Groceries", "Costco": "Groceries", "Food Lion": "Groceries",
  "City Food Co-Op": "Groceries", "Trader Joe's": "Groceries", "Aldi": "Groceries", "Target": "Groceries",
  "Rockingham Cooperative": "Groceries", "Clover Hill Produce": "Groceries", "Dry River Store": "Groceries",
  "Valley Pike Farm Market": "Groceries", "Overlook Produce": "Groceries",

  // Restaurants & Coffee
  "Chick-fil-A": "Restaurants", "Texas Roadhouse": "Restaurants", "Olive Garden": "Restaurants",
  "Chipotle": "Restaurants", "Wendy's": "Restaurants", "Panera Bread": "Restaurants",
  "Starbucks": "Coffee/Restaurants", "Sakura Japanese": "Restaurants", "The Camel": "Restaurants",
  "Benny Sorrentino": "Restaurants", "Benny Stivales": "Restaurants", "Slice Cirospizza": "Restaurants",
  "Dairy Queen": "Restaurants", "Carter Mountain": "Restaurants", "Bagel Hig": "Restaurants",
  "Kline's Dairy Bar": "Restaurants", "Smiley's Ice Cream": "Restaurants", "Jpetal Cafe": "Restaurants",
  "Mill Street Grill": "Restaurants", "Coffee Hound": "Coffee/Restaurants", "Klines Espresso": "Coffee/Restaurants",
  "Black Sheep Coffee": "Coffee/Restaurants", "Ciro's Lasagna": "Restaurants", "Toast": "Restaurants",
  "Loyal Legion": "Restaurants", "Anomaly": "Restaurants",

  // Gas
  "ExxonMobil": "Gas", "Sheetz": "Gas", "BP": "Gas", "Wawa": "Gas", "Royal Mart": "Gas",
  "Staunton Junction": "Gas",

  // Amazon (catch-all)
  "Amazon": "Amazon",

  // Subscriptions & Software
  "Starlink": "Internet", "Google": "Subscriptions", "Audible": "Subscriptions",
  "Superhuman": "Subscriptions", "Peacock TV": "Subscriptions", "Zwift": "Subscriptions",
  "Walmart+": "Subscriptions", "Fitiq": "Subscriptions", "Stripe": "Subscriptions",
  "Chat": "Subscriptions", "Propresenter": "Subscriptions",

  // Utilities
  "Shenandoah Valley Elec": "Utilities", "Shenandoah Valle": "Utilities",

  // Insurance
  "Erie Insurance": "Insurance",

  // Farm
  "Creambrook Farm": "Farm", "Sunrise Farms": "Farm", "Tractor Supply": "Farm",

  // Home
  "The Home Depot": "Home", "Lowe's": "Home", "Morris Heating": "Home",
  "Rockingham Coop": "Home",

  // Church / Charity
  "Church of the Lamb": "Giving", "Adhope": "Giving",

  // Travel
  "United Airlines": "Travel", "Amtrak": "Travel", "Kuku Campers": "Travel", "Hyatt": "Travel",

  // Pets
  "Viva Raw": "Pets (Dogs)",

  // Auto
  "Costco Gas": "Gas",

  // Clothing
  "L.L.Bean": "Clothing", "Ollie's Bargain": "Clothing", "Society6": "Clothing",
  "Chong's Custom": "Clothing",

  // Income sources
  "Society for Clas": "INCOME:SCL", "Shenandoah Valle": "INCOME:Carter",
  "Check Deposit": "INCOME:Other", "Deposit": "INCOME:Other",
};

function categorize(merchant, originalStatement, amount, monarchCategory) {
  // Income
  if (amount > 0) {
    if (monarchCategory === "Grant's Income") return "INCOME:Grant";
    if (monarchCategory === "Carter's Income") return "INCOME:Carter";
    if (monarchCategory === "Carter Wiley Cleaning") return "INCOME:Carter";
    if (monarchCategory === "Interest") return "INCOME:Interest";
    if (monarchCategory === "Reimbursements") return "INCOME:Reimbursement";
    if (monarchCategory === "Transfer" || monarchCategory === "Credit Card Payment") return "TRANSFER";
    return "INCOME:Other";
  }

  // Transfers
  if (monarchCategory === "Transfer" || monarchCategory === "Credit Card Payment") return "TRANSFER";

  // Mortgage (checks with specific amounts)
  if (monarchCategory === "Mortgage" || (merchant.startsWith("Check #") && Math.abs(amount) >= 1100 && Math.abs(amount) <= 1200)) return "Mortgage";

  // Try merchant match
  for (const [key, cat] of Object.entries(MERCHANT_CATEGORIES)) {
    if (merchant.toLowerCase().includes(key.toLowerCase()) ||
        originalStatement.toLowerCase().includes(key.toLowerCase())) {
      // Don't reclassify income items as expense categories
      if (cat.startsWith("INCOME:") && amount < 0) continue;
      if (amount < 0 && !cat.startsWith("INCOME:")) return cat;
    }
  }

  // Costco gas vs Costco groceries
  if (merchant === "Costco" && originalStatement.includes("GAS")) return "Gas";

  // Checks (unmatched)
  if (merchant.startsWith("Check #")) return "Checks (Unknown)";

  // Apple is ambiguous
  if (merchant === "Apple") {
    if (Math.abs(amount) < 20) return "Subscriptions";
    return "Apple (Mixed)";
  }

  // Fall through
  return "Uncategorized";
}

// ── CSV Parser ──
function parseCSV(text) {
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => (row[h] = values[idx] || ""));
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { values.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

function fmt(n) {
  return "$" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── Main ──
const txns = parseCSV(fs.readFileSync(CSV_PATH, "utf-8"));

// Recategorize everything
const recategorized = txns.map((t) => ({
  ...t,
  SmartCategory: categorize(t.Merchant, t["Original Statement"], parseFloat(t.Amount), t.Category),
  AmountNum: parseFloat(t.Amount),
}));

// Filter to last 12 months
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);
const cutoffStr = cutoff.toISOString().split("T")[0];
const recent = recategorized.filter((t) => t.Date >= cutoffStr);

// Separate
const transfers = recent.filter((t) => t.SmartCategory === "TRANSFER");
const income = recent.filter((t) => t.SmartCategory.startsWith("INCOME:"));
const expenses = recent.filter((t) => !t.SmartCategory.startsWith("INCOME:") && t.SmartCategory !== "TRANSFER" && t.AmountNum < 0);

// ── Income breakdown ──
const incomeBySource = {};
income.forEach((t) => {
  const src = t.SmartCategory.replace("INCOME:", "");
  if (!incomeBySource[src]) incomeBySource[src] = 0;
  incomeBySource[src] += t.AmountNum;
});

// ── Expense breakdown by smart category ──
const expByCategory = {};
expenses.forEach((t) => {
  const cat = t.SmartCategory;
  if (!expByCategory[cat]) expByCategory[cat] = { total: 0, count: 0 };
  expByCategory[cat].total += t.AmountNum;
  expByCategory[cat].count++;
});

// ── Monthly breakdown ──
const byMonth = {};
[...income, ...expenses].forEach((t) => {
  const month = t.Date.substring(0, 7);
  if (!byMonth[month]) byMonth[month] = { income: 0, expenses: 0 };
  if (t.AmountNum > 0) byMonth[month].income += t.AmountNum;
  else byMonth[month].expenses += t.AmountNum;
});

// ── Print ──
const totalIncome = income.reduce((s, t) => s + t.AmountNum, 0);
const totalExpenses = expenses.reduce((s, t) => s + t.AmountNum, 0);

console.log(`\n========================================`);
console.log(`  SMART FINANCIAL ANALYSIS (Last 12 Mo)`);
console.log(`========================================\n`);

console.log(`Period: ${cutoffStr} to ${txns[0]?.Date}`);
console.log(`Total transactions: ${recent.length} (${transfers.length} transfers excluded)\n`);

console.log(`--- INCOME SOURCES ---`);
const incSorted = Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]);
for (const [src, total] of incSorted) {
  const monthly = total / 12;
  console.log(`  ${src.padEnd(20)} ${fmt(total).padStart(12)}  (~${fmt(monthly)}/mo)`);
}
console.log(`  ${"TOTAL".padEnd(20)} ${fmt(totalIncome).padStart(12)}  (~${fmt(totalIncome / 12)}/mo)`);

console.log(`\n--- EXPENSES BY CATEGORY ---`);
const catSorted = Object.entries(expByCategory).sort((a, b) => a[1].total - b[1].total);
for (const [cat, data] of catSorted) {
  const monthly = data.total / 12;
  console.log(`  ${cat.padEnd(25)} ${fmt(data.total).padStart(12)}  (~${fmt(monthly)}/mo, ${data.count} txns)`);
}
console.log(`  ${"TOTAL EXPENSES".padEnd(25)} ${fmt(totalExpenses).padStart(12)}  (~${fmt(totalExpenses / 12)}/mo)`);

console.log(`\n--- NET ---`);
const net = totalIncome + totalExpenses;
console.log(`  Income:   ${fmt(totalIncome)}`);
console.log(`  Expenses: ${fmt(totalExpenses)}`);
console.log(`  Net:      ${net >= 0 ? "+" : "-"}${fmt(Math.abs(net))} (${net >= 0 ? "surplus" : "deficit"})`);
console.log(`  Monthly:  ${net >= 0 ? "+" : "-"}${fmt(Math.abs(net / 12))}/mo\n`);

console.log(`--- MONTHLY TREND ---`);
const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));
console.log(`${"Month".padEnd(10)} ${"Income".padStart(12)} ${"Expenses".padStart(12)} ${"Net".padStart(12)}`);
for (const [month, data] of months) {
  const n = data.income + data.expenses;
  console.log(
    `${month.padEnd(10)} ${fmt(data.income).padStart(12)} ${fmt(data.expenses).padStart(12)} ${(n >= 0 ? "+" : "-").concat(fmt(Math.abs(n))).padStart(12)}`
  );
}

// ── Remaining uncategorized ──
const uncatTxns = expenses.filter((t) => t.SmartCategory === "Uncategorized");
if (uncatTxns.length > 0) {
  console.log(`\n--- STILL UNCATEGORIZED (${uncatTxns.length} txns, ${fmt(Math.abs(uncatTxns.reduce((s, t) => s + t.AmountNum, 0)))}) ---`);
  // Group by merchant
  const uncatMerchants = {};
  uncatTxns.forEach((t) => {
    const m = t.Merchant;
    if (!uncatMerchants[m]) uncatMerchants[m] = { total: 0, count: 0 };
    uncatMerchants[m].total += t.AmountNum;
    uncatMerchants[m].count++;
  });
  const uncatSorted = Object.entries(uncatMerchants).sort((a, b) => a[1].total - b[1].total);
  for (const [m, data] of uncatSorted.slice(0, 20)) {
    console.log(`  ${m.padEnd(35)} ${fmt(data.total).padStart(10)}  (${data.count} txns)`);
  }
  if (uncatSorted.length > 20) console.log(`  ... and ${uncatSorted.length - 20} more merchants`);
}

// ── Amazon breakdown ──
const amazonTxns = expenses.filter((t) => t.SmartCategory === "Amazon");
if (amazonTxns.length > 0) {
  const amzTotal = amazonTxns.reduce((s, t) => s + t.AmountNum, 0);
  console.log(`\n--- AMAZON DETAIL (${amazonTxns.length} txns, ${fmt(amzTotal)}) ---`);
  console.log(`  Monthly avg: ~${fmt(amzTotal / 12)}/mo`);
  // By month
  const amzByMonth = {};
  amazonTxns.forEach((t) => {
    const m = t.Date.substring(0, 7);
    if (!amzByMonth[m]) amzByMonth[m] = 0;
    amzByMonth[m] += t.AmountNum;
  });
  const amzMonths = Object.entries(amzByMonth).sort((a, b) => b[0].localeCompare(a[0]));
  for (const [m, total] of amzMonths) {
    console.log(`  ${m}: ${fmt(total)}`);
  }
}

// Write analysis
const analysisData = {
  period: { start: cutoffStr, end: txns[0]?.Date },
  income: { total: totalIncome, monthly: totalIncome / 12, bySource: incomeBySource },
  expenses: { total: totalExpenses, monthly: totalExpenses / 12, byCategory: expByCategory },
  net: { total: net, monthly: net / 12 },
  monthlyBreakdown: byMonth,
};
fs.writeFileSync(
  path.resolve(__dirname, "..", "data", "smart_analysis.json"),
  JSON.stringify(analysisData, null, 2)
);
