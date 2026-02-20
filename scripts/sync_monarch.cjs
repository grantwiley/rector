#!/usr/bin/env node
/**
 * Pull transactions and account data from Monarch Money and store locally.
 *
 * First run:  will prompt for email, password, and MFA code.
 * Subsequent: uses saved session.
 *
 * Usage:
 *   node scripts/sync_monarch.cjs                  # last 30 days
 *   node scripts/sync_monarch.cjs --days 90        # last 90 days
 *   node scripts/sync_monarch.cjs --all            # everything
 *   node scripts/sync_monarch.cjs --login          # force re-login
 */

const { MonarchClient } = require("monarchmoney");
const { writeFileSync, mkdirSync } = require("fs");
const { resolve } = require("path");
const { parseArgs } = require("util");

const DATA_DIR = resolve(__dirname, "..", "data");

const { values: args } = parseArgs({
  options: {
    days: { type: "string", default: "30" },
    all: { type: "boolean", default: false },
    login: { type: "boolean", default: false },
  },
});

function writeJson(filename, data) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

async function main() {
  const client = MonarchClient.create();

  if (args.login) {
    client.deleteSession();
  }

  // Try loading saved session first
  if (!args.login && client.loadSession()) {
    console.log("Using saved session.");
  } else {
    // Interactive login — prompts for email, password, MFA
    await client.interactiveLogin({ saveSession: true });
    console.log("Logged in and session saved.");
  }

  // Pull accounts
  console.log("Fetching accounts...");
  const accounts = await client.accounts.getAll();
  writeJson("accounts.json", accounts);
  console.log(`  Saved ${Array.isArray(accounts) ? accounts.length : "?"} accounts`);

  // Pull transactions
  const days = args.all ? null : parseInt(args.days, 10);
  let startDate;
  if (days !== null) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    startDate = d.toISOString().split("T")[0];
    console.log(`Fetching transactions since ${startDate}...`);
  } else {
    console.log("Fetching all transactions...");
  }

  const allTxns = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const result = await client.transactions.getTransactions({
      limit,
      offset,
      ...(startDate ? { startDate } : {}),
    });
    const txns = result.transactions || [];
    const total = result.totalCount || 0;
    allTxns.push(...txns);
    console.log(`  Fetched ${allTxns.length}/${total} transactions...`);

    if (allTxns.length >= total || txns.length < limit) break;
    offset += limit;
  }

  writeJson("transactions.json", allTxns);
  console.log(`  Saved ${allTxns.length} transactions`);

  // Pull categories
  console.log("Fetching categories...");
  const categories = await client.transactions.getTransactionCategories();
  writeJson("categories.json", categories);
  console.log("  Saved categories");

  console.log(`\nDone. Data written to ${DATA_DIR}/`);
  await client.close();
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
