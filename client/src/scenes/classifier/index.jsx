import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  CheckCircleOutline,
  DataUsageOutlined,
  SellOutlined,
} from "@mui/icons-material";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import Header from "components/Header";
import StatBox from "components/StatBox";
import FlexBetween from "components/FlexBetween";
import { useGetProductClassificationQuery } from "state/api";

const TOP_COLOR = "#06d6a0";
const REG_COLOR = "#ef476f";

const Classifier = () => {
  const theme = useTheme();
  const { data, isLoading } = useGetProductClassificationQuery();

  const scatterData = useMemo(() => {
    if (!data) return [];
    // plot each product by rating vs price, split into the two true classes
    const mk = (label, actual) => ({
      id: label,
      data: data.points
        .filter((p) => p.actual === actual)
        .map((p) => ({ x: p.rating, y: p.price, name: p.name })),
    });
    return [mk("Top Seller", 1), mk("Regular", 0)];
  }, [data]);

  const cell = (label, value, highlight) => (
    <Box
      p="0.75rem"
      textAlign="center"
      backgroundColor={
        highlight ? theme.palette.background.default : theme.palette.background.alt
      }
      borderRadius="0.35rem"
    >
      <Typography variant="h4" fontWeight="bold" color={theme.palette.secondary[100]}>
        {value}
      </Typography>
      <Typography fontSize="0.7rem" color={theme.palette.secondary[300]}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Box m="1.5rem 2.5rem">
      <Header
        title="PRODUCT CLASSIFIER"
        subtitle="Decision Tree — predicting a top-selling product from its attributes"
      />

      {data && !isLoading ? (
        <>
          <Box
            mt="20px"
            display="grid"
            gridTemplateColumns="repeat(3, minmax(0, 1fr))"
            gap="20px"
          >
            <StatBox
              title="Test Accuracy"
              value={`${Math.round(data.model.accuracy * 100)}%`}
              increase={`${data.model.testSize} test items`}
              description="held-out products classified correctly"
              icon={
                <CheckCircleOutline
                  sx={{ color: TOP_COLOR, fontSize: "26px" }}
                />
              }
            />
            <StatBox
              title="Train / Test Split"
              value={`${data.model.trainSize} / ${data.model.testSize}`}
              increase="70 / 30"
              description="products used to train vs. evaluate"
              icon={
                <DataUsageOutlined
                  sx={{ color: theme.palette.secondary[300], fontSize: "26px" }}
                />
              }
            />
            <StatBox
              title="Top-Seller Threshold"
              value={`$${data.model.medianSales.toLocaleString()}`}
              increase="median"
              description="yearly sales at/above = top seller"
              icon={
                <SellOutlined
                  sx={{ color: theme.palette.secondary[300], fontSize: "26px" }}
                />
              }
            />
          </Box>

          <Box
            mt="20px"
            display="grid"
            gridTemplateColumns="1.4fr 1fr"
            gap="20px"
          >
            {/* scatter: the pattern the tree learns */}
            <Box
              height="52vh"
              backgroundColor={theme.palette.background.alt}
              borderRadius="0.55rem"
              p="1rem"
            >
              <Typography
                variant="h6"
                mb="0.5rem"
                color={theme.palette.secondary[100]}
              >
                Products by rating &amp; price
              </Typography>
              <Box height="calc(52vh - 3rem)">
                <ResponsiveScatterPlot
                  data={scatterData}
                  theme={{
                    axis: {
                      domain: { line: { stroke: theme.palette.secondary[200] } },
                      legend: { text: { fill: theme.palette.secondary[200] } },
                      ticks: {
                        line: {
                          stroke: theme.palette.secondary[200],
                          strokeWidth: 1,
                        },
                        text: { fill: theme.palette.secondary[200] },
                      },
                    },
                    legends: { text: { fill: theme.palette.secondary[200] } },
                    tooltip: {
                      container: { color: theme.palette.primary.main },
                    },
                  }}
                  colors={[TOP_COLOR, REG_COLOR]}
                  margin={{ top: 10, right: 130, bottom: 60, left: 70 }}
                  xScale={{ type: "linear", min: 0, max: 5 }}
                  yScale={{ type: "linear", min: 0, max: "auto" }}
                  nodeSize={9}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    legend: "Rating",
                    legendPosition: "middle",
                    legendOffset: 46,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    legend: "Price ($)",
                    legendPosition: "middle",
                    legendOffset: -60,
                  }}
                  legends={[
                    {
                      anchor: "right",
                      direction: "column",
                      translateX: 120,
                      itemWidth: 100,
                      itemHeight: 24,
                      itemsSpacing: 4,
                      symbolSize: 12,
                      symbolShape: "circle",
                      itemTextColor: theme.palette.secondary[200],
                    },
                  ]}
                />
              </Box>
            </Box>

            {/* confusion matrix */}
            <Box
              backgroundColor={theme.palette.background.alt}
              borderRadius="0.55rem"
              p="1.25rem"
            >
              <Typography
                variant="h6"
                color={theme.palette.secondary[100]}
                mb="0.25rem"
              >
                Confusion Matrix
              </Typography>
              <Typography
                fontSize="0.75rem"
                color={theme.palette.secondary[300]}
                mb="1rem"
              >
                on the {data.model.testSize} held-out products
              </Typography>
              <Box
                display="grid"
                gridTemplateColumns="repeat(2, 1fr)"
                gap="0.6rem"
              >
                {cell("True Top Seller", data.confusion.tp, true)}
                {cell("Missed (False Neg)", data.confusion.fn)}
                {cell("False Positive", data.confusion.fp)}
                {cell("True Regular", data.confusion.tn, true)}
              </Box>
              <FlexBetween mt="1.25rem">
                <Typography fontSize="0.8rem" color={theme.palette.secondary[200]}>
                  Correct
                </Typography>
                <Typography fontSize="0.8rem" color={TOP_COLOR} fontWeight="bold">
                  {data.confusion.tp + data.confusion.tn} / {data.model.testSize}
                </Typography>
              </FlexBetween>
              <FlexBetween mt="0.35rem">
                <Typography fontSize="0.8rem" color={theme.palette.secondary[200]}>
                  Misclassified
                </Typography>
                <Typography fontSize="0.8rem" color={REG_COLOR} fontWeight="bold">
                  {data.confusion.fp + data.confusion.fn} / {data.model.testSize}
                </Typography>
              </FlexBetween>
            </Box>
          </Box>

          <Typography
            mt="14px"
            fontSize="0.8rem"
            sx={{ color: theme.palette.secondary[300] }}
          >
            Supervised learning: the tree was trained on{" "}
            {data.model.trainSize} products — learning that highly-rated,
            well-stocked products tend to be top sellers — then tested on{" "}
            {data.model.testSize} it had never seen, getting{" "}
            {Math.round(data.model.accuracy * 100)}% right. The few misses are
            products sitting right at the sales threshold, which is exactly where
            a model is expected to be least certain.
          </Typography>
        </>
      ) : (
        <>Loading...</>
      )}
    </Box>
  );
};

export default Classifier;
