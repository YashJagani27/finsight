import regression from "regression";
import { kmeans } from "ml-kmeans";
import pkg from "ml-cart";
import OverallStat from "../models/OverallStat.js";
import Transaction from "../models/Transaction.js";
import Product from "../models/Product.js";
import ProductStat from "../models/ProductStat.js";

const { DecisionTreeClassifier } = pkg;

const monthOrder = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const getSalesForecast = async (req, res) => {
  try {
    const overallStats = await OverallStat.find();
    const { monthlyData } = overallStats[0];

    const historical = monthOrder
      .map((month) => monthlyData.find((entry) => entry.month === month))
      .filter(Boolean)
      .map((entry) => ({ month: entry.month, totalSales: entry.totalSales }));

    const dataPoints = historical.map((entry, index) => [
      index,
      entry.totalSales,
    ]);

    const result = regression.linear(dataPoints);
    const [slope, intercept] = result.equation;

    const monthsToForecast = 6;
    const forecast = Array.from({ length: monthsToForecast }, (_, i) => {
      const x = historical.length + i;
      const predictedSales = Math.max(0, Math.round(result.predict(x)[1]));
      return { month: `+${i + 1}mo`, predictedSales };
    });

    res.status(200).json({
      historical,
      forecast,
      model: {
        type: "linear regression",
        slope: Number(slope.toFixed(2)),
        intercept: Number(intercept.toFixed(2)),
        r2: Number(result.r2.toFixed(3)),
      },
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/* ------------------------------------------------------------------ */
/*  Model 2 — K-Means clustering: customer segmentation               */
/* ------------------------------------------------------------------ */

// z-score standardize each column so K-Means isn't dominated by the
// largest-scale feature (total spend would otherwise swamp txn count).
const standardize = (matrix) => {
  const cols = matrix[0].length;
  const means = new Array(cols).fill(0);
  const stds = new Array(cols).fill(0);
  matrix.forEach((row) => row.forEach((v, c) => (means[c] += v)));
  means.forEach((_, c) => (means[c] /= matrix.length));
  matrix.forEach((row) => row.forEach((v, c) => (stds[c] += (v - means[c]) ** 2)));
  stds.forEach((_, c) => (stds[c] = Math.sqrt(stds[c] / matrix.length) || 1));
  return matrix.map((row) => row.map((v, c) => (v - means[c]) / stds[c]));
};

export const getCustomerSegments = async (req, res) => {
  try {
    const transactions = await Transaction.find();

    // Build per-customer behaviour: how often they buy and how much they spend.
    const byUser = new Map();
    for (const t of transactions) {
      const spend = Number(t.cost) || 0;
      const cur = byUser.get(t.userId) || { txnCount: 0, totalSpend: 0 };
      cur.txnCount += 1;
      cur.totalSpend += spend;
      byUser.set(t.userId, cur);
    }

    const customers = [...byUser.entries()].map(([userId, v]) => ({
      userId,
      txnCount: v.txnCount,
      totalSpend: Math.round(v.totalSpend),
      avgOrderValue: Math.round(v.totalSpend / v.txnCount),
    }));

    const features = customers.map((c) => [c.avgOrderValue, c.totalSpend]);
    const k = 3;
    const { clusters, centroids } = kmeans(standardize(features), k, {
      seed: 42,
    });

    // Describe each raw cluster, then name them by average order value.
    const summary = Array.from({ length: k }, () => ({
      size: 0,
      avgOrderValue: 0,
      avgSpend: 0,
      avgTxns: 0,
    }));
    customers.forEach((c, i) => {
      const s = summary[clusters[i]];
      s.size += 1;
      s.avgOrderValue += c.avgOrderValue;
      s.avgSpend += c.totalSpend;
      s.avgTxns += c.txnCount;
    });
    summary.forEach((s) => {
      if (s.size) {
        s.avgOrderValue = Math.round(s.avgOrderValue / s.size);
        s.avgSpend = Math.round(s.avgSpend / s.size);
        s.avgTxns = Number((s.avgTxns / s.size).toFixed(1));
      }
    });

    const order = summary
      .map((s, idx) => ({ idx, avgOrderValue: s.avgOrderValue }))
      .sort((a, b) => a.avgOrderValue - b.avgOrderValue);
    const names = ["Budget", "Regular", "Premium"];
    const labelByCluster = {};
    order.forEach((o, rank) => (labelByCluster[o.idx] = names[rank] || `Segment ${o.idx}`));

    const points = customers.map((c, i) => ({
      ...c,
      cluster: clusters[i],
      segment: labelByCluster[clusters[i]],
    }));

    const segments = summary
      .map((s, idx) => ({ segment: labelByCluster[idx], ...s }))
      .sort((a, b) => a.avgOrderValue - b.avgOrderValue);

    res.status(200).json({
      points,
      segments,
      model: {
        type: "k-means clustering",
        k,
        features: ["avgOrderValue", "totalSpend"],
        totalCustomers: customers.length,
        iterations: centroids.length,
      },
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/* ------------------------------------------------------------------ */
/*  Model 3 — Decision Tree: predict a "top seller" product           */
/* ------------------------------------------------------------------ */

export const getProductClassification = async (req, res) => {
  try {
    const products = await Product.find().lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const stats = await ProductStat.find().lean();

    // Join each product to its yearly sales, keep the features we classify on.
    const rows = stats
      .map((ps) => {
        const p = byId.get(String(ps.productId));
        if (!p) return null;
        return {
          name: p.name,
          category: p.category,
          price: p.price,
          rating: p.rating,
          supply: p.supply,
          sales: ps.yearlySalesTotal,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name)); // deterministic order

    // Label: is this product a top seller (sales at/above the median)?
    const sortedSales = [...rows.map((r) => r.sales)].sort((a, b) => a - b);
    const median = sortedSales[Math.floor(sortedSales.length / 2)];
    rows.forEach((r) => (r.actual = r.sales >= median ? 1 : 0));

    // Deterministic 70/30 train/test split (every 3rd item -> test).
    const train = [];
    const test = [];
    rows.forEach((r, i) => (i % 3 === 0 ? test : train).push(r));

    const toX = (r) => [r.price, r.rating, r.supply];
    const clf = new DecisionTreeClassifier({ maxDepth: 4, minNumSamples: 2 });
    clf.train(train.map(toX), train.map((r) => r.actual));

    // Evaluate on the held-out test set.
    const testPreds = clf.predict(test.map(toX));
    let correct = 0;
    const confusion = { tp: 0, tn: 0, fp: 0, fn: 0 };
    test.forEach((r, i) => {
      const pred = testPreds[i];
      if (pred === r.actual) correct += 1;
      if (pred === 1 && r.actual === 1) confusion.tp += 1;
      else if (pred === 0 && r.actual === 0) confusion.tn += 1;
      else if (pred === 1 && r.actual === 0) confusion.fp += 1;
      else confusion.fn += 1;
    });
    const accuracy = Number((correct / test.length).toFixed(2));

    // Predict on every product for the scatter plot.
    const allPreds = clf.predict(rows.map(toX));
    const points = rows.map((r, i) => ({
      name: r.name,
      category: r.category,
      price: r.price,
      rating: r.rating,
      supply: r.supply,
      sales: r.sales,
      actual: r.actual,
      predicted: allPreds[i],
    }));

    res.status(200).json({
      points,
      confusion,
      model: {
        type: "decision tree",
        features: ["price", "rating", "supply"],
        target: "top seller (sales >= median)",
        medianSales: median,
        trainSize: train.length,
        testSize: test.length,
        accuracy,
      },
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
