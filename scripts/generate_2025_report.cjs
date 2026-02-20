#!/usr/bin/env node
/**
 * Generate a styled 2025 Financial Overview PDF.
 * Recategorizes all transactions using merchant-name heuristics + check rules from Grant.
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const CSV_PATH = path.resolve(__dirname, "..", "data", "transactions.csv");
const OUTPUT_PDF = path.resolve(__dirname, "..", "data", "2025-Financial-Overview.pdf");

// ── CSV Parser ──
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

function parseCSV(text) {
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const values = parseCSVLine(l);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] || "");
    return row;
  });
}

// ── Smart Categorization ──
const MERCHANT_MAP = {
  "Kroger": "Groceries", "Walmart": "Groceries", "Costco": "Groceries",
  "Food Lion": "Groceries", "City Food Co-Op": "Groceries", "Trader Joe's": "Groceries",
  "Aldi": "Groceries", "Target": "Groceries", "Rockingham Cooperative": "Groceries",
  "Clover Hill Produce": "Groceries", "Dry River Store": "Groceries",
  "Valley Pike Farm Market": "Groceries", "Overlook Produce": "Groceries",
  "Walmart+": "Subscriptions",

  "Chick-fil-A": "Restaurants", "Texas Roadhouse": "Restaurants",
  "Olive Garden": "Restaurants", "Chipotle": "Restaurants", "Wendy's": "Restaurants",
  "Panera Bread": "Restaurants", "Sakura Japanese": "Restaurants",
  "The Camel": "Restaurants", "Benny Sorrentino": "Restaurants",
  "Benny Stivales": "Restaurants", "Slice Cirospizza": "Restaurants",
  "Dairy Queen": "Restaurants", "Carter Mountain": "Restaurants",
  "Bagel Hig": "Restaurants", "Kline's Dairy Bar": "Restaurants",
  "Smiley's Ice Cream": "Restaurants", "Mill Street Grill": "Restaurants",
  "Ciro's Lasagna": "Restaurants", "Toast": "Restaurants",
  "Loyal Legion": "Restaurants", "Anomaly": "Restaurants",
  "Starbucks": "Coffee", "Coffee Hound": "Coffee",
  "Klines Espresso": "Coffee", "Black Sheep Coffee": "Coffee",
  "Jpetal Cafe": "Coffee",

  "ExxonMobil": "Gas", "Sheetz": "Gas", "BP": "Gas", "Wawa": "Gas",
  "Royal Mart": "Gas", "Staunton Junction": "Gas", "Costco Gas": "Gas",

  "Amazon": "Amazon",

  "Starlink": "Internet", "Shenandoah Valley Elec": "Utilities",
  "Shenandoah Valle": "Utilities", "Holtzman Propane": "Utilities",

  "Google": "Subscriptions", "Audible": "Subscriptions",
  "Superhuman": "Subscriptions", "Peacock TV": "Subscriptions",
  "Zwift": "Subscriptions", "Fitiq": "Subscriptions",
  "Chat": "Subscriptions", "Propresenter": "Subscriptions",
  "Stripe": "Subscriptions", "D J*WSJ": "Subscriptions",

  "Erie Insurance": "Insurance", "Progressive": "Insurance",

  "Creambrook Farm": "Farm", "Sunrise Farms": "Farm", "Tractor Supply": "Farm",

  "The Home Depot": "Home", "Lowe's": "Home", "Morris Heating": "Home",
  "Shenandoah Paint": "Home", "Rockingham Coop": "Home",
  "County Line Materials": "Home", "Northern Tool": "Home",
  "Wayfair": "Home",

  "Church of the Lamb": "Giving (Church)", "Adhope": "Giving (Church)",

  "United Airlines": "Travel", "Amtrak": "Travel", "Kuku Campers": "Travel",
  "Hyatt": "Travel", "Chase Travel": "Travel", "Iad Dulles": "Travel",

  "Viva Raw": "Pets", "The Well Balanced Paw": "Pets",

  "L.L.Bean": "Clothing", "Ollie's Bargain": "Clothing",
  "Society6": "Clothing", "Chong's Custom": "Clothing",
  "Melanzana": "Clothing",

  "Harrisonburg Smilemakers": "Medical/Dental", "Walgreens": "Medical/Dental",

  "Harrisonbur Membership": "Memberships",

  "Lineage": "Subscriptions",
};

function categorize(merchant, stmt, amount, monarchCat) {
  const amt = parseFloat(amount);

  // Income
  if (amt > 0) {
    if (monarchCat === "Grant's Income") return "INCOME:Grant (SCL)";
    if (monarchCat === "Carter's Income") return "INCOME:Carter (SVH)";
    if (monarchCat === "Carter Wiley Cleaning") return "INCOME:Carter (Cleaning)";
    if (monarchCat === "Interest") return "INCOME:Interest";
    if (monarchCat === "Reimbursements") return "INCOME:Reimbursement";
    if (monarchCat === "Transfer" || monarchCat === "Credit Card Payment") return "TRANSFER";
    return "INCOME:Other";
  }

  if (monarchCat === "Transfer" || monarchCat === "Credit Card Payment") return "TRANSFER";

  // Check categorization rules from Grant
  if (merchant.startsWith("Check #")) {
    const absAmt = Math.abs(amt);
    if (absAmt >= 1100 && absAmt <= 1250) return "Mortgage";
    if (absAmt >= 380 && absAmt <= 750 && absAmt !== 400 && absAmt !== 600) return "In-Laws (Rent/Phone/Etc)";
    if (absAmt === 200 || absAmt === 400 || absAmt === 600 || absAmt === 800) return "Tithe";
    if (absAmt >= 15 && absAmt <= 25) {
      if (absAmt === 20) return "Haircut";
      return "Milk";
    }
    if (absAmt < 15) return "Milk";
    if (absAmt >= 1000 && absAmt <= 1100) return "In-Laws (Rent/Phone/Etc)";
    return "Checks (Other)";
  }

  // Merchant lookup
  for (const [key, cat] of Object.entries(MERCHANT_MAP)) {
    if (merchant.toLowerCase().includes(key.toLowerCase()) ||
        stmt.toLowerCase().includes(key.toLowerCase())) {
      return cat;
    }
  }

  if (merchant === "Costco" && stmt.includes("GAS")) return "Gas";
  if (merchant === "Apple") return Math.abs(amt) < 20 ? "Subscriptions" : "Apple (Mixed)";

  return "Other";
}

// ── Analysis ──
function analyze(txns) {
  const categorized = txns.map(t => ({
    ...t,
    cat: categorize(t.Merchant, t["Original Statement"], t.Amount, t.Category),
    amt: parseFloat(t.Amount),
  }));

  // 2025 only (Jan 2025 – Dec 2025)
  const year = categorized.filter(t => t.Date >= "2025-01-01" && t.Date <= "2025-12-31");
  const transfers = year.filter(t => t.cat === "TRANSFER");
  const income = year.filter(t => t.cat.startsWith("INCOME:"));
  const expenses = year.filter(t => !t.cat.startsWith("INCOME:") && t.cat !== "TRANSFER" && t.amt < 0);

  // Income by source
  const incBySource = {};
  income.forEach(t => {
    const src = t.cat.replace("INCOME:", "");
    incBySource[src] = (incBySource[src] || 0) + t.amt;
  });

  // Expenses by category
  const expByCat = {};
  expenses.forEach(t => {
    if (!expByCat[t.cat]) expByCat[t.cat] = { total: 0, count: 0 };
    expByCat[t.cat].total += t.amt;
    expByCat[t.cat].count++;
  });

  // Monthly
  const byMonth = {};
  [...income, ...expenses].forEach(t => {
    const m = t.Date.substring(0, 7);
    if (!byMonth[m]) byMonth[m] = { income: 0, expenses: 0 };
    if (t.amt > 0) byMonth[m].income += t.amt;
    else byMonth[m].expenses += t.amt;
  });

  // Top merchants
  const byMerchant = {};
  expenses.forEach(t => {
    const m = t.Merchant;
    if (!byMerchant[m]) byMerchant[m] = { total: 0, count: 0, cat: t.cat };
    byMerchant[m].total += t.amt;
    byMerchant[m].count++;
  });

  const totalInc = income.reduce((s, t) => s + t.amt, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amt, 0);

  return { incBySource, expByCat, byMonth, byMerchant, totalInc, totalExp, year, expenses };
}

function fmt(n) {
  return "$" + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtC(n) {
  return "$" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── HTML Report ──
function buildHTML(data) {
  const { incBySource, expByCat, byMonth, byMerchant, totalInc, totalExp } = data;
  const net = totalInc + totalExp;
  const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
  const catSorted = Object.entries(expByCat).sort((a, b) => a[1].total - b[1].total);
  const incSorted = Object.entries(incBySource).sort((a, b) => b[1] - a[1]);
  const merchantSorted = Object.entries(byMerchant).sort((a, b) => a[1].total - b[1].total).slice(0, 15);

  // Consolidate merchants — group check-based categories together
  const consolidatedMerchants = {};
  Object.entries(byMerchant).forEach(([m, d]) => {
    // Group individual checks by their category instead of check number
    const key = m.startsWith("Check #") ? d.cat : m;
    if (!consolidatedMerchants[key]) consolidatedMerchants[key] = { total: 0, count: 0, cat: d.cat };
    consolidatedMerchants[key].total += d.total;
    consolidatedMerchants[key].count += d.count;
  });
  const merchantSorted2 = Object.entries(consolidatedMerchants)
    .filter(([m]) => m !== "Mortgage" && m !== "Tithe" && m !== "In-Laws (Rent/Phone/Etc)" && m !== "Checks (Other)" && m !== "Milk" && m !== "Haircut")
    .sort((a, b) => a[1].total - b[1].total).slice(0, 12);

  const maxMonthly = Math.max(...months.map(([, d]) => Math.max(d.income, Math.abs(d.expenses))));
  const monthNames = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };

  // Font paths for Libertinus
  const fontDir = "/Users/grantwiley/Library/Fonts";

  return `<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: 'Libertinus Serif';
    src: url('file://${fontDir}/LibertinusSerif-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Libertinus Serif';
    src: url('file://${fontDir}/LibertinusSerif-Semibold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
  }
  @font-face {
    font-family: 'Libertinus Serif';
    src: url('file://${fontDir}/LibertinusSerif-Bold.otf') format('opentype');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'Libertinus Serif';
    src: url('file://${fontDir}/LibertinusSerif-Italic.otf') format('opentype');
    font-weight: 400;
    font-style: italic;
  }
  @font-face {
    font-family: 'Libertinus Sans';
    src: url('file://${fontDir}/LibertinusSans-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Libertinus Sans';
    src: url('file://${fontDir}/LibertinusSans-Bold.otf') format('opentype');
    font-weight: 700;
    font-style: normal;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page { size: letter; margin: 0; }

  body {
    font-family: 'Libertinus Serif', Georgia, 'Times New Roman', serif;
    background: #f5f2eb;
    color: #2d2d2d;
    font-size: 10.5pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 8.5in;
    height: 11in;
    padding: 0.75in 0.9in 0.65in;
    background: #f5f2eb;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .page::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0.6in;
    right: 0.6in;
    height: 2.5px;
    background: linear-gradient(90deg, transparent, #1a3d2e, #4a7c59, #1a3d2e, transparent);
  }

  h1 {
    font-family: 'Libertinus Serif', Georgia, serif;
    font-size: 26pt;
    font-weight: 600;
    color: #1a3d2e;
    margin-bottom: 2pt;
    letter-spacing: 0.01em;
  }

  .subtitle {
    font-family: 'Libertinus Sans', 'Helvetica Neue', sans-serif;
    font-size: 8.5pt;
    color: #4a7c59;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 400;
    margin-bottom: 16pt;
  }

  h2 {
    font-family: 'Libertinus Serif', Georgia, serif;
    font-size: 15pt;
    font-weight: 600;
    color: #1a3d2e;
    margin: 14pt 0 7pt;
    padding-bottom: 3pt;
    border-bottom: 1.5px solid #4a7c59;
  }
  h2:first-child { margin-top: 0; }

  .summary-row {
    display: flex;
    gap: 12pt;
    margin: 12pt 0 14pt;
  }
  .summary-card {
    flex: 1;
    background: white;
    border: 1px solid #d4cfbe;
    border-radius: 5px;
    padding: 10pt 12pt;
    text-align: center;
  }
  .summary-card .label {
    font-family: 'Libertinus Sans', sans-serif;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #4a7c59;
  }
  .summary-card .value {
    font-size: 20pt;
    font-weight: 700;
    color: #1a3d2e;
    margin-top: 2pt;
  }
  .summary-card .sub {
    font-family: 'Libertinus Sans', sans-serif;
    font-size: 7.5pt;
    color: #999;
    margin-top: 1pt;
  }
  .surplus .value { color: #2e7d32; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 5pt 0;
    font-size: 9.5pt;
  }
  th {
    font-family: 'Libertinus Sans', sans-serif;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #4a7c59;
    font-weight: 700;
    text-align: left;
    padding: 4pt 6pt;
    border-bottom: 1.5px solid #4a7c59;
  }
  th.right, td.right { text-align: right; }
  td {
    padding: 3.5pt 6pt;
    border-bottom: 0.5px solid #e8e4da;
    vertical-align: top;
  }
  tr:last-child td { border-bottom: none; }
  .total-row td {
    font-weight: 700;
    border-top: 1.5px solid #1a3d2e;
    border-bottom: none;
    color: #1a3d2e;
    padding-top: 5pt;
  }

  .bar-chart { margin: 5pt 0; }
  .bar-row {
    display: flex;
    align-items: center;
    margin: 2pt 0;
  }
  .bar-label {
    width: 28pt;
    font-family: 'Libertinus Sans', sans-serif;
    font-weight: 400;
    font-size: 7.5pt;
    color: #666;
  }
  .bar-container {
    flex: 1;
    display: flex;
    gap: 1.5pt;
    height: 13pt;
  }
  .bar-income {
    background: #4a7c59;
    border-radius: 1.5px;
    height: 100%;
  }
  .bar-expense {
    background: #c17c53;
    border-radius: 1.5px;
    height: 100%;
    opacity: 0.85;
  }
  .bar-net {
    font-family: 'Libertinus Sans', sans-serif;
    font-size: 7.5pt;
    width: 48pt;
    text-align: right;
    color: #666;
  }
  .bar-net.positive { color: #2e7d32; }
  .bar-net.negative { color: #c0392b; }

  .legend {
    display: flex;
    gap: 14pt;
    margin: 4pt 0 2pt;
    font-family: 'Libertinus Sans', sans-serif;
    font-size: 7.5pt;
    color: #666;
  }
  .legend-item { display: flex; align-items: center; gap: 3pt; }
  .legend-dot { width: 8pt; height: 8pt; border-radius: 1.5px; }

  .footer {
    position: absolute;
    bottom: 0.45in;
    left: 0.9in;
    right: 0.9in;
    text-align: center;
    font-family: 'Libertinus Sans', sans-serif;
    font-size: 6.5pt;
    color: #bbb;
    border-top: 0.5px solid #ddd;
    padding-top: 4pt;
  }

  .obs-item { margin-bottom: 6pt; }
  .obs-label {
    font-weight: 700;
    color: #1a3d2e;
  }
  .obs-text {
    color: #555;
    font-size: 9.5pt;
  }
</style>
</head>
<body>

<!-- PAGE 1: Overview + Income -->
<div class="page">
  <h1>2025 Financial Overview</h1>
  <div class="subtitle">Grant & Carter Wiley · Rockingham County, VA</div>

  <div class="summary-row">
    <div class="summary-card">
      <div class="label">Total Income</div>
      <div class="value">${fmt(totalInc)}</div>
      <div class="sub">${fmt(totalInc / 12)}/mo average</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Expenses</div>
      <div class="value">${fmt(totalExp)}</div>
      <div class="sub">${fmt(totalExp / 12)}/mo average</div>
    </div>
    <div class="summary-card surplus">
      <div class="label">Net Surplus</div>
      <div class="value">+${fmt(net)}</div>
      <div class="sub">+${fmt(net / 12)}/mo average</div>
    </div>
  </div>

  <h2>Monthly Cash Flow</h2>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#4a7c59"></div> Income</div>
    <div class="legend-item"><div class="legend-dot" style="background:#c17c53"></div> Expenses</div>
  </div>
  <div class="bar-chart">
    ${months.map(([m, d]) => {
      const mn = monthNames[m.split("-")[1]];
      const incW = (d.income / maxMonthly) * 100;
      const expW = (Math.abs(d.expenses) / maxMonthly) * 100;
      const n = d.income + d.expenses;
      return `<div class="bar-row">
        <div class="bar-label">${mn}</div>
        <div class="bar-container">
          <div class="bar-income" style="width:${incW}%"></div>
          <div class="bar-expense" style="width:${expW}%"></div>
        </div>
        <div class="bar-net ${n >= 0 ? 'positive' : 'negative'}">${n >= 0 ? '+' : '-'}${fmt(Math.abs(n))}</div>
      </div>`;
    }).join("\n")}
  </div>

  <h2>Income Sources</h2>
  <table>
    <tr><th>Source</th><th class="right">Annual</th><th class="right">Monthly</th><th class="right">Share</th></tr>
    ${incSorted.map(([src, total]) =>
      `<tr><td>${src}</td><td class="right">${fmtC(total)}</td><td class="right">${fmt(total / 12)}</td><td class="right">${(total / totalInc * 100).toFixed(0)}%</td></tr>`
    ).join("\n")}
    <tr class="total-row"><td>Total</td><td class="right">${fmtC(totalInc)}</td><td class="right">${fmt(totalInc / 12)}</td><td class="right">100%</td></tr>
  </table>

  <div class="footer">Generated by Rector · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<!-- PAGE 2: Expense Breakdown -->
<div class="page">
  <h2>Expense Breakdown</h2>
  <table>
    <tr><th>Category</th><th class="right">Annual</th><th class="right">Monthly</th><th class="right">Txns</th><th class="right">Share</th></tr>
    ${catSorted.map(([cat, d]) =>
      `<tr><td>${cat}</td><td class="right">${fmtC(d.total)}</td><td class="right">${fmt(d.total / 12)}</td><td class="right">${d.count}</td><td class="right">${(d.total / totalExp * 100).toFixed(1)}%</td></tr>`
    ).join("\n")}
    <tr class="total-row"><td>Total</td><td class="right">${fmtC(totalExp)}</td><td class="right">${fmt(totalExp / 12)}</td><td class="right">${catSorted.reduce((s, [, d]) => s + d.count, 0)}</td><td class="right">100%</td></tr>
  </table>

  <div class="footer">Generated by Rector · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<!-- PAGE 3: Top Merchants + Monthly Detail -->
<div class="page">
  <h2>Top Merchants</h2>
  <table>
    <tr><th>Merchant</th><th>Category</th><th class="right">Annual</th><th class="right">Txns</th></tr>
    ${merchantSorted2.map(([m, d]) =>
      `<tr><td>${m}</td><td>${d.cat}</td><td class="right">${fmtC(d.total)}</td><td class="right">${d.count}</td></tr>`
    ).join("\n")}
  </table>

  <h2>Monthly Detail</h2>
  <table>
    <tr><th>Month</th><th class="right">Income</th><th class="right">Expenses</th><th class="right">Net</th><th class="right">Savings Rate</th></tr>
    ${months.map(([m, d]) => {
      const n = d.income + d.expenses;
      const rate = d.income > 0 ? (n / d.income * 100).toFixed(0) : "—";
      return `<tr><td>${monthNames[m.split("-")[1]]} 2025</td><td class="right">${fmtC(d.income)}</td><td class="right">${fmtC(d.expenses)}</td><td class="right" style="color:${n >= 0 ? '#2e7d32' : '#c0392b'}">${n >= 0 ? '+' : '-'}${fmtC(Math.abs(n))}</td><td class="right">${rate}%</td></tr>`;
    }).join("\n")}
    <tr class="total-row">
      <td>Total</td>
      <td class="right">${fmtC(totalInc)}</td>
      <td class="right">${fmtC(totalExp)}</td>
      <td class="right" style="color:#2e7d32">+${fmtC(net)}</td>
      <td class="right">${(net / totalInc * 100).toFixed(0)}%</td>
    </tr>
  </table>

  <div class="footer">Generated by Rector · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<!-- PAGE 4: Key Observations -->
<div class="page">
  <h2>Key Observations</h2>

  <div class="obs-item">
    <span class="obs-label">Surplus: </span>
    <span class="obs-text">+${fmt(net)}/yr (+${fmt(net / 12)}/mo) at a ${(net / totalInc * 100).toFixed(0)}% savings rate. This is strong — enough to build an emergency fund and begin investing if directed intentionally.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Amazon: </span>
    <span class="obs-text">${fmt(Math.abs(expByCat["Amazon"]?.total || 0))}/yr (${fmt(Math.abs((expByCat["Amazon"]?.total || 0) / 12))}/mo) across ${expByCat["Amazon"]?.count || 0} orders, averaging ~$${Math.abs((expByCat["Amazon"]?.total || 0) / (expByCat["Amazon"]?.count || 1)).toFixed(0)}/order. A mix of household essentials and discretionary spending — hard to separate without item-level data. A monthly cap of $400–500 would save $1,500–2,800/yr.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Tithe & Giving: </span>
    <span class="obs-text">${fmt(Math.abs((expByCat["Tithe"]?.total || 0) + (expByCat["Giving (Church)"]?.total || 0)))}/yr combined — ${fmt(Math.abs(expByCat["Tithe"]?.total || 0))} via weekly $200 checks${expByCat["Giving (Church)"]?.total ? ` plus ${fmt(Math.abs(expByCat["Giving (Church)"]?.total))} in direct church giving` : ""}. Consistent and intentional.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Groceries: </span>
    <span class="obs-text">${fmt(Math.abs(expByCat["Groceries"]?.total || 0))}/yr (${fmt(Math.abs((expByCat["Groceries"]?.total || 0) / 12))}/mo) across Kroger, Costco, City Food Co-Op, Food Lion, and others. Costco bulk runs inflate some months. Reasonable for two people, but some Costco trips may include non-food items.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Housing: </span>
    <span class="obs-text">Mortgage (${fmt(Math.abs(expByCat["Mortgage"]?.total || 0))}/yr) plus in-laws payment (${fmt(Math.abs(expByCat["In-Laws (Rent/Phone/Etc)"]?.total || 0))}/yr) totals ~${fmt(Math.abs((expByCat["Mortgage"]?.total || 0) + (expByCat["In-Laws (Rent/Phone/Etc)"]?.total || 0)))}/yr in housing costs, or about ${(Math.abs((expByCat["Mortgage"]?.total || 0) + (expByCat["In-Laws (Rent/Phone/Etc)"]?.total || 0)) / totalInc * 100).toFixed(0)}% of gross income.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Uncategorized: </span>
    <span class="obs-text">${fmt(Math.abs(expByCat["Other"]?.total || 0))}/yr (${expByCat["Other"]?.count || 0} transactions) still lack proper categorization. These are one-off merchants not yet mapped — continued cleanup will sharpen the picture.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Strongest months: </span>
    <span class="obs-text">${months.filter(([, d]) => d.income + d.expenses > 3000).map(([m]) => monthNames[m.split("-")[1]]).join(", ") || "None"} — driven by extra paychecks or lower-than-usual spending.</span>
  </div>

  <div class="obs-item">
    <span class="obs-label">Tightest months: </span>
    <span class="obs-text">${months.filter(([, d]) => d.income + d.expenses < 1000).map(([m]) => monthNames[m.split("-")[1]]).join(", ") || "None"} — typically months with travel, large home purchases, or irregular expenses.</span>
  </div>

  <div class="footer">Generated by Rector · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

</body></html>`;
}

// ── Main ──
async function main() {
  console.log("Parsing transactions...");
  const txns = parseCSV(fs.readFileSync(CSV_PATH, "utf-8"));

  console.log("Analyzing 2025 data...");
  const data = analyze(txns);

  console.log("Generating HTML...");
  const html = buildHTML(data);

  // Write HTML for debugging
  const htmlPath = path.resolve(__dirname, "..", "data", "2025-report.html");
  fs.writeFileSync(htmlPath, html);

  console.log("Rendering PDF...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: OUTPUT_PDF,
    format: "letter",
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await browser.close();

  console.log(`\nPDF saved to: ${OUTPUT_PDF}`);
}

main().catch(err => { console.error(err); process.exit(1); });
