import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { ShowChartOutlined, FunctionsOutlined, TimelineOutlined } from "@mui/icons-material";
import { ResponsiveLine } from "@nivo/line";
import Header from "components/Header";
import StatBox from "components/StatBox";
import { useGetSalesForecastQuery } from "state/api";

const Forecast = () => {
  const theme = useTheme();
  const { data, isLoading } = useGetSalesForecastQuery();

  const [formattedData] = useMemo(() => {
    if (!data) return [];

    const { historical, forecast } = data;
    const lastActual = historical[historical.length - 1];

    const actualLine = {
      id: "Actual Sales",
      color: theme.palette.secondary.main,
      data: historical.map(({ month, totalSales }) => ({
        x: month,
        y: totalSales,
      })),
    };

    const forecastLine = {
      id: "Forecasted Sales",
      color: "#06d6a0",
      data: [
        { x: lastActual.month, y: lastActual.totalSales },
        ...forecast.map(({ month, predictedSales }) => ({
          x: month,
          y: predictedSales,
        })),
      ],
    };

    return [[actualLine, forecastLine]];
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box m="1.5rem 2.5rem">
      <Header
        title="SALES FORECAST"
        subtitle="Basic linear-regression prediction of future monthly sales"
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
              title="Next Month Forecast"
              value={`$${data.forecast[0].predictedSales.toLocaleString()}`}
              description="Predicted total sales"
              icon={
                <ShowChartOutlined
                  sx={{ color: theme.palette.secondary[300], fontSize: "26px" }}
                />
              }
            />
            <StatBox
              title="Model Fit (R²)"
              value={data.model.r2}
              description="0 = no fit, 1 = perfect fit"
              icon={
                <FunctionsOutlined
                  sx={{ color: theme.palette.secondary[300], fontSize: "26px" }}
                />
              }
            />
            <StatBox
              title="Trend"
              value={`$${data.model.slope.toLocaleString()}/mo`}
              description="Regression slope"
              icon={
                <TimelineOutlined
                  sx={{ color: theme.palette.secondary[300], fontSize: "26px" }}
                />
              }
            />
          </Box>

          <Box height="60vh" mt="20px">
            <ResponsiveLine
              data={formattedData}
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
              colors={{ datum: "color" }}
              margin={{ top: 50, right: 50, bottom: 70, left: 70 }}
              xScale={{ type: "point" }}
              yScale={{
                type: "linear",
                min: "auto",
                max: "auto",
                stacked: false,
                reverse: false,
              }}
              yFormat=" >-.2f"
              curve="catmullRom"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                orient: "bottom",
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 45,
                legend: "Month",
                legendOffset: 60,
                legendPosition: "middle",
              }}
              axisLeft={{
                orient: "left",
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Total Sales",
                legendOffset: -60,
                legendPosition: "middle",
              }}
              enableGridX={false}
              enableGridY={false}
              pointSize={10}
              pointColor={{ theme: "background" }}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointLabelYOffset={-12}
              useMesh={true}
              legends={[
                {
                  anchor: "top-right",
                  direction: "column",
                  justify: false,
                  translateX: 0,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemDirection: "left-to-right",
                  itemWidth: 120,
                  itemHeight: 20,
                  itemOpacity: 0.85,
                  symbolSize: 12,
                  symbolShape: "circle",
                  effects: [
                    {
                      on: "hover",
                      style: { itemOpacity: 1 },
                    },
                  ],
                },
              ]}
            />
          </Box>

          <Typography
            mt="10px"
            fontSize="0.8rem"
            sx={{ color: theme.palette.secondary[300] }}
          >
            Proof of concept only: a simple linear regression fit over this
            year's 12 monthly sales totals, projected forward 6 months. Not a
            production-grade forecasting model.
          </Typography>
        </>
      ) : (
        <>Loading...</>
      )}
    </Box>
  );
};

export default Forecast;
