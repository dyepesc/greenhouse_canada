// Time Series Visualization using D3.js
const chartWidth = 960;
const chartHeight = 500;

const svg_time = d3
  .select("#time-container")
  .append("svg")
  .attr("width", chartWidth)
  .attr("height", chartHeight);

const renderEmissionsChart = (data) => {
  const margin = { top: 60, right: 40, bottom: 90, left: 150 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const xValue = (d) => d.year; // Use the year as the x-axis value
  const yValue = (d) => d.totalEmissions; // Use the total emissions as the y-axis value

  const xScale = d3
    .scaleLinear() // Use a linear scale for years
    .domain(d3.extent(data, xValue)) // Use the extent of the years in the data
    .range([0, innerWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, yValue)]) // Scale based on total emissions
    .range([innerHeight, 0])
    .nice();

  const g = svg_time
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xAxis = d3.axisBottom(xScale).tickSize(-innerHeight).tickPadding(15);
  const yAxis = d3.axisLeft(yScale).tickSize(-innerWidth).tickPadding(10);

  g.append("g").call(yAxis).selectAll(".domain").remove();

const xAxisG = g
    .append("g")
    .call(xAxis) // Call the x-axis function to create the axis under the xAxis group
    .attr("transform", `translate(0,${innerHeight})`);

     // Remove the default domain line and add a label
  xAxisG.select(".domain").remove();
  xAxisG
    .append("text")
    .attr("class", "axis-label")
    .attr("y", 60)
    .attr("x", innerWidth / 2)
    .attr("fill", "black")
    .text("Year");

  g.append("path")
    .datum(data)
    .attr("class", "line-path")
    .attr(
      "d",
      d3
        .line()
        .x((d) => xScale(xValue(d)))
        .y((d) => yScale(yValue(d)))
        .curve(d3.curveBasis)
    )
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2);

  g.append("text")
    .attr("class", "title")
    .attr("y", -10)
    // .text("Total Emissions by Year");
};

// Wait for cleanedData to be available
const waitForCleanedData = setInterval(() => {
  if (typeof cleanedData !== "undefined") {
    clearInterval(waitForCleanedData);

    // Process the cleanedData for the line chart
    const emissionsByYear = sumEmissionsByYear(cleanedData);

    // Convert the emissionsByYear object into an array of { year, totalEmissions } objects
    const emissionsData = Object.entries(emissionsByYear)
      .map(([year, totalEmissions]) => ({
        year: +year, 
        totalEmissions: +totalEmissions, 
      }))
      .filter((d) => !isNaN(d.year) && !isNaN(d.totalEmissions)); 

    // console.log("Processed Emissions Data for Line Chart:", emissionsData); 

    // Render the emissions chart
    renderEmissionsChart(emissionsData);
  }
}, 100);