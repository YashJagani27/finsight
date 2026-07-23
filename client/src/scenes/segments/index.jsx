import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { PeopleAltOutlined } from "@mui/icons-material";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import Header from "components/Header";
import StatBox from "components/StatBox";
import { useGetCustomerSegmentsQuery } from "state/api";

// distinct, dark-background-friendly colors for the three clusters
const CLUSTER_COLORS = ["#ffd166", "#06d6a0", "#ef476f"];

const Segments = () => {
  const theme = useTheme();
  const { data, isLoading } = useGetCustomerSegmentsQuery();

  const scatterData = useMemo(() => {
    if (!data) return [];
    // one series per segment so each cluster gets its own color
    return data.segments.map((seg) => ({
      id: seg.segment,
      data: data.points
        .filter((p) => p.segment === seg.segment)
        .map((p) => ({ x: p.avgOrderValue, y: p.totalSpend })),
    }));
  }, [data]);

  return (
    <Box m="1.5rem 2.5rem">
      <Header
        title="CUSTOMER SEGMENTS"
        subtitle="K-Means clustering — grouping customers by spending behavior"
      />

      {data && !isLoading ? (
        <>
          <Box
            mt="20px"
            display="grid"
            gridTemplateColumns="repeat(3, minmax(0, 1fr))"
            gap="20px"
          >
            {data.segments.map((seg, i) => (
              <StatBox
                key={seg.segment}
                title={`${seg.segment} customers`}
                value={seg.size}
                increase={`$${seg.avgOrderValue.toLocaleString()}`}
                description={`avg order · ${seg.avgTxns} orders each`}
                icon={
                  <PeopleAltOutlined
                    sx={{ color: CLUSTER_COLORS[i], fontSize: "26px" }}
                  />
                }
              />
            ))}
          </Box>

          <Box height="58vh" mt="20px">
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
                tooltip: { container: { color: theme.palette.primary.main } },
              }}
              colors={CLUSTER_COLORS}
              margin={{ top: 20, right: 140, bottom: 70, left: 90 }}
              xScale={{ type: "linear", min: 0, max: "auto" }}
              yScale={{ type: "linear", min: 0, max: "auto" }}
              blendMode="normal"
              nodeSize={8}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                legend: "Average Order Value ($)",
                legendPosition: "middle",
                legendOffset: 46,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                legend: "Total Spend ($)",
                legendPosition: "middle",
                legendOffset: -70,
              }}
              legends={[
                {
                  anchor: "right",
                  direction: "column",
                  translateX: 130,
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

          <Typography
            mt="10px"
            fontSize="0.8rem"
            sx={{ color: theme.palette.secondary[300] }}
          >
            Unsupervised learning: K-Means was given each customer's average
            order value and total spend (with no labels) and grouped all{" "}
            {data.model.totalCustomers} customers into {data.model.k} segments on
            its own. These map naturally onto budget, regular, and premium
            spenders — the kind of segmentation used to target marketing.
          </Typography>
        </>
      ) : (
        <>Loading...</>
      )}
    </Box>
  );
};

export default Segments;
