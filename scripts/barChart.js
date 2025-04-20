(() => {
    // Bar Chart Visualization using D3.js
    const chartWidth = 950;
    const chartHeight = 500;
  
    const svg_bar = d3
      .select("#bar-container")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight);
  
    const renderBarChart = (data) => {
      const margin = { top: 60, right: 40, bottom: 90, left: 150 };
      const innerWidth = chartWidth - margin.left - margin.right;
      const innerHeight = chartHeight - margin.top - margin.bottom;
  
      const xValue = (d) => d.totalEmissions; // Use total emissions as the x-axis value
      const yValue = (d) => d.province; // Use the province as the y-axis value
  
      const xScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, xValue)]) // Scale based on total emissions
        .range([0, innerWidth])
        .nice();
  
      const yScale = d3
        .scaleBand()
        .domain(data.map(yValue)) // Map provinces to the y-axis
        .range([0, innerHeight])
        .padding(0.2);
  
      const g = svg_bar
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Create the x-axis tick format, 3 significant figures
    // and replace 'G' with 'B' for billions
    const xAxisTickFormat = (number) =>
        d3.format(".3s")(number).replace("G", "B");

      const xAxis = d3
        .axisBottom(xScale)
        .tickPadding(10)
        .tickFormat(xAxisTickFormat);

      const yAxis = d3.axisLeft(yScale).tickPadding(10);
  
      g.append("g")
        .call(yAxis)
        .selectAll(".domain")
        .remove();

      const xAxisG =  g 
        .append("g")
        .call(xAxis)
        .attr("transform", `translate(0,${innerHeight})`);
      
        // Remove the default domain line and add a label
  xAxisG.select(".domain").remove();
  xAxisG
    .append("text")
    .attr("class", "axis-label")
    .attr("y", 60)
    .attr("x", innerWidth / 2)
    .attr("fill", "black")
    .text("Total Emissions (tonnes)")
  
      g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", (d) => yScale(yValue(d))) // Position bars based on the y-axis (provinces)
        .attr("x", 0) // Start bars at x = 0
        .attr("height", yScale.bandwidth()) // Set bar height based on yScale bandwidth
        .attr("width", (d) => xScale(xValue(d))) // Set bar width based on total emissions
        .attr("fill", "steelblue");
  
      g.append("text")
        .attr("class", "title")
        .attr("y", -10)
        // .text("Top 5 Provinces by Total Emissions");
    };
  
    // Wait for emissionsByProvince to be available
    const waitForEmissionsData = setInterval(() => {
      if (typeof emissionsByProvince !== "undefined") {
        clearInterval(waitForEmissionsData);
  
        // Convert the emissionsByProvince object into an array of { province, totalEmissions } objects
        const emissionsData = Object.entries(emissionsByProvince)
          .map(([province, totalEmissions]) => ({
            province,
            totalEmissions,
          }))
          .sort((a, b) => b.totalEmissions - a.totalEmissions) // Sort by totalEmissions in descending order
          .slice(0, 5); // Take the top 5 entries
  
        console.log("Top 5 Emissions Data for Bar Chart:", emissionsData); // Debugging
  
        // Render the bar chart
        renderBarChart(emissionsData);
      }
    }, 100);
  })();