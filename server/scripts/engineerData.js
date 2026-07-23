/**
 * One-time data-engineering script.
 *
 * The original seed data (from the tutorial) is randomly generated, so there
 * is no real pattern for a machine-learning model to find. This script keeps
 * the exact same schema, documents, and ID relationships, but rewrites a few
 * numeric fields so the data carries genuine structure that the three ML
 * models can learn from:
 *
 *   1. OverallStat monthly/daily sales  -> a real upward trend + seasonality
 *      so the linear-regression sales forecast is meaningful (high R^2).
 *
 *   2. ProductStat yearly sales         -> made a function of each product's
 *      rating / price / supply, so the Decision Tree can actually predict a
 *      "top seller" from those features.
 *
 *   3. Transaction cost                 -> each customer is assigned a spending
 *      tier (budget / regular / premium) so K-Means finds clean customer
 *      segments. All userId/product linkages are left untouched.
 *
 * Run once with:  node scripts/engineerData.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import ProductStat from "../models/ProductStat.js";
import Transaction from "../models/Transaction.js";
import OverallStat from "../models/OverallStat.js";

dotenv.config();

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Seeded PRNG (mulberry32) so the engineered data is fully reproducible —
// re-running this script always yields the same numbers.
function makeRng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260722);
const rand = (min, max) => rng() * (max - min) + min;
const randInt = (n) => Math.floor(rng() * n);

async function engineerOverallStat() {
  const stat = await OverallStat.findOne();

  // Monthly: strong linear growth + mild seasonality + small noise -> high R^2
  MONTHS.forEach((month, i) => {
    const trend = 25000 + 2800 * i; // clear upward trend across the year
    const seasonal = 6000 * Math.sin((2 * Math.PI * (i + 1)) / 12);
    const salesNoise = rand(-1500, 1500);
    const totalSales = Math.round(trend + seasonal + salesNoise);
    const totalUnits = Math.round(
      8000 + 900 * i + 2500 * Math.sin((2 * Math.PI * (i + 1)) / 12) + rand(-800, 800)
    );
    stat.monthlyData[i].month = month;
    stat.monthlyData[i].totalSales = totalSales;
    stat.monthlyData[i].totalUnits = totalUnits;
  });

  // Daily: gentle upward trend + weekly wave, so the Daily chart also trends
  stat.dailyData.forEach((day, i) => {
    const trend = 800 + 3.2 * i;
    const weekly = 220 * Math.sin((2 * Math.PI * i) / 7);
    day.totalSales = Math.round(trend + weekly + rand(-120, 120));
    day.totalUnits = Math.round(150 + 1.1 * i + 60 * Math.sin((2 * Math.PI * i) / 7) + rand(-40, 40));
  });

  stat.markModified("monthlyData");
  stat.markModified("dailyData");
  await stat.save();

  const monthly = stat.monthlyData.map((m) => m.totalSales);
  console.log(
    `OverallStat: monthly sales now trend ${monthly[0]} -> ${monthly[11]} (min ${Math.min(
      ...monthly
    )}, max ${Math.max(...monthly)})`
  );
}

async function engineerProductStats() {
  const products = await Product.find().lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const stats = await ProductStat.find();
  const salesValues = [];

  for (const ps of stats) {
    const p = byId.get(String(ps.productId));
    if (!p) continue;

    // Sales driven mostly by rating, helped by supply, hurt by high price.
    const yearlySales = Math.round(
      600 +
        p.rating * 1300 + // rating 1-5  -> 1300..6500 (dominant signal)
        p.supply * 1.4 + //  supply      -> up to ~1850
        -p.price * 1.8 + // higher price -> fewer sales
        rand(-1050, 1050) // noise: enough that near-median products can flip,
      //                     so the classifier lands at a realistic ~80-90%
    );
    const yearlySalesTotal = Math.max(200, yearlySales);
    const yearlyTotalSoldUnits = Math.round(yearlySalesTotal * rand(0.55, 0.9));

    ps.yearlySalesTotal = yearlySalesTotal;
    ps.yearlyTotalSoldUnits = yearlyTotalSoldUnits;
    salesValues.push(yearlySalesTotal);
    await ps.save();
  }

  const sorted = [...salesValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const topSellers = salesValues.filter((v) => v >= median).length;
  console.log(
    `ProductStat: yearly sales now ${Math.min(...salesValues)}..${Math.max(
      ...salesValues
    )}, median ${median}, top-sellers ${topSellers}/${salesValues.length}`
  );
}

async function engineerTransactionTiers() {
  // Assign each customer a spending tier, then set the cost of every one of
  // their transactions from that tier. Linkages (userId, products) untouched.
  const tiers = [
    { name: "budget", mean: 800, spread: 220 },
    { name: "regular", mean: 2300, spread: 320 },
    { name: "premium", mean: 4200, spread: 480 },
  ];

  const transactions = await Transaction.find();
  const userTier = new Map();
  const tierCounts = { budget: 0, regular: 0, premium: 0 };

  for (const t of transactions) {
    if (!userTier.has(t.userId)) {
      const tier = tiers[randInt(tiers.length)];
      userTier.set(t.userId, tier);
      tierCounts[tier.name] += 1;
    }
    const tier = userTier.get(t.userId);
    const cost = Math.max(150, tier.mean + rand(-tier.spread, tier.spread));
    t.cost = cost.toFixed(2); // schema stores cost as a String
    await t.save();
  }

  console.log(
    `Transactions: assigned ${userTier.size} customers to tiers`,
    tierCounts
  );
}

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected. Engineering structure into the data...\n");

  await engineerOverallStat();
  await engineerProductStats();
  await engineerTransactionTiers();

  console.log("\nDone.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
