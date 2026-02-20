#!/usr/bin/env node
/**
 * Analyze transaction data from Monarch Money CSV export.
 * Outputs a financial summary to stdout and writes detailed data to data/analysis.json.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const CSV_PATH = path.resolve(DATA_DIR, "transactions.csv");

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
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  values.push(current.trim());
  return values;
}

function analyzeTransactions(txns) {
  // Filter out transfers
  const real = txns.filter(
    (t) => t.Category !== "Transfer" && t.Category !== "Credit Card Payment"
  );

  const income = real.filter((t) => parseFloat(t.Amount) > 0);
  const expenses = real.filter((t) => parseFloat(t.Amount) < 0);

  const totalIncome = income.reduce((s, t) => s + parseFloat(t.Amount), 0);
  const totalExpenses = expenses.reduce((s, t) => s + parseFloat(t.Amount), 0);

  // By category
  const byCategory = {};
  expenses.forEach((t) => {
    const cat = t.Category || "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, transactions: [] };
    byCategory[cat].total += parseFloat(t.Amount);
    byCategory[cat].count++;
  });

  // By month
  const byMonth = {};
  real.forEach((t) => {
    const month = t.Date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { income: 0, expenses: 0, count: 0 };
    const amt = parseFloat(t.Amount);
    if (amt > 0) byMonth[month].income += amt;
    else byMonth[month].expenses += amt;
    byMonth[month].count++;
  });

  // By merchant (top spenders)
  const byMerchant = {};
  expenses.forEach((t) => {
    const m = t.Merchant || "Unknown";
    if (!byMerchant[m]) byMerchant[m] = { total: 0, count: 0 };
    byMerchant[m].total += parseFloat(t.Amount);
    byMerchant[m].count++;
  });

  // Accounts
  const accounts = new Set();
  txns.forEach((t) => accounts.add(t.Account));

  return { totalIncome, totalExpenses, byCategory, byMonth, byMerchant, accounts: [...accounts] };
}

function fmt(n) {
  return "$" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Main
const csv = fs.readFileSync(CSV_PATH, "utf-8");
const txns = parseCSV(csv);
const analysis = analyzeTransactions(txns);

console.log(`\n=== FINANCIAL OVERVIEW ===\n`);
console.log(`Total transactions: ${txns.length}`);
console.log(`Date range: ${txns[txns.length - 1]?.Date} to ${txns[0]?.Date}`);
console.log(`Accounts: ${analysis.accounts.join(", ")}`);

console.log(`\n--- TOTALS (excluding transfers) ---`);
console.log(`Total Income:   ${fmt(analysis.totalIncome)}`);
console.log(`Total Expenses: ${fmt(analysis.totalExpenses)}`);
console.log(`Net:            ${fmt(analysis.totalIncome + analysis.totalExpenses)} ${analysis.totalIncome + analysis.totalExpenses >= 0 ? "(positive)" : "(negative)"}`);

console.log(`\n--- MONTHLY BREAKDOWN ---`);
const months = Object.entries(analysis.byMonth).sort((a, b) => b[0].localeCompare(a[0]));
console.log(`${"Month".padEnd(10)} ${"Income".padStart(12)} ${"Expenses".padStart(12)} ${"Net".padStart(12)}`);
for (const [month, data] of months.slice(0, 12)) {
  const net = data.income + data.expenses;
  console.log(
    `${month.padEnd(10)} ${fmt(data.income).padStart(12)} ${fmt(data.expenses).padStart(12)} ${(net >= 0 ? "+" : "-").concat(fmt(Math.abs(net))).padStart(12)}`
  );
}

console.log(`\n--- TOP SPENDING CATEGORIES (all time) ---`);
const cats = Object.entries(analysis.byCategory)
  .sort((a, b) => a[1].total - b[1].total)
  .slice(0, 15);
for (const [cat, data] of cats) {
  console.log(`  ${cat.padEnd(25)} ${fmt(data.total).padStart(12)}  (${data.count} txns)`);
}

console.log(`\n--- TOP MERCHANTS (all time) ---`);
const merchants = Object.entries(analysis.byMerchant)
  .sort((a, b) => a[1].total - b[1].total)
  .slice(0, 15);
for (const [m, data] of merchants) {
  console.log(`  ${m.padEnd(30)} ${fmt(data.total).padStart(12)}  (${data.count} txns)`);
}

// Recent month averages
const recentMonths = months.slice(0, 6);
if (recentMonths.length > 0) {
  const avgIncome = recentMonths.reduce((s, [, d]) => s + d.income, 0) / recentMonths.length;
  const avgExpenses = recentMonths.reduce((s, [, d]) => s + d.expenses, 0) / recentMonths.length;
  console.log(`\n--- LAST ${recentMonths.length} MONTHS AVERAGES ---`);
  console.log(`Avg Monthly Income:   ${fmt(avgIncome)}`);
  console.log(`Avg Monthly Expenses: ${fmt(avgExpenses)}`);
  console.log(`Avg Monthly Net:      ${fmt(avgIncome + avgExpenses)} ${avgIncome + avgExpenses >= 0 ? "(positive)" : "(negative)"}`);
}

// Write full analysis
fs.writeFileSync(
  path.resolve(DATA_DIR, "analysis.json"),
  JSON.stringify(analysis, null, 2)
);
console.log(`\nFull analysis written to data/analysis.json`);
