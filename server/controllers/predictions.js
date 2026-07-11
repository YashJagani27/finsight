import regression from "regression";
import OverallStat from "../models/OverallStat.js";

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
