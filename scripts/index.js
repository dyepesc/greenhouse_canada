// Declaring global variables
let cleanedCsv;
let cleanedData;
let emissionsByProvince;

//******************************************************************************************** */
// Function to clean headers
function cleanHeaders(data) {
  const headers = Object.keys(data[0]);
  const headerMap = {};
  headers.forEach((header) => {
    const slashIndex = header.indexOf('/');
    let cleanHeader = slashIndex !== -1 ? header.substring(0, slashIndex).trim() : header;

    if (cleanHeader === "Facility City or District or Municipality") {
      cleanHeader = "City";
    } else if (cleanHeader === "Facility Province or Territory") {
      cleanHeader = "Province";
    } else if (cleanHeader === "English Facility NAICS Code Description") {
      cleanHeader = "Facility Type";
    } else if (cleanHeader === "Reference Year") {
      cleanHeader = "Year";
    } else if (cleanHeader === "Total Emissions (tonnes CO2e)") {
      cleanHeader = "TotalEmissions";
    }

    headerMap[header] = cleanHeader;
  });

  return data.map((row) => {
    const cleanedRow = {};
    Object.entries(row).forEach(([key, value]) => {
      cleanedRow[headerMap[key]] = value;
    });
    return cleanedRow;
  });
}
//******************************************************************************************** */
// Function to parse CSV into an array of objects
function parseCSV(csvText) {
  const rows = csvText.split('\n').map((row) => row.split(','));
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    row.forEach((value, index) => {
      obj[headers[index]] = value;
    });
    return obj;
  });
}
//******************************************************************************************** */
// Function to convert an array of objects back to CSV
function convertToCSV(data) {
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => row[header]).join(','));
  return [headers.join(','), ...rows].join('\n');
}
//******************************************************************************************** */
// Function to sum TotalEmissions by Province
function sumEmissionsByProvince(data) {
  const emissionsByProvince = {};

  data.forEach((row) => {
    const province = row.Province;
    const emissions = parseFloat(row.TotalEmissions) || 0; // Ensure emissions is a number

    if (!emissionsByProvince[province]) {
      emissionsByProvince[province] = 0;
    }

    emissionsByProvince[province] += emissions;
  });

  return emissionsByProvince;
}
//******************************************************************************************** */
// Function to sum TotalEmissions by Year
function sumEmissionsByYear(data) {
  const emissionsByYear = {};

  data.forEach(row => {
      const year = row.Year;
      const emissions = parseFloat(row.TotalEmissions) || 0; // Ensure emissions is a number

      if (!emissionsByYear[year]) {
          emissionsByYear[year] = 0;
      }

      emissionsByYear[year] += emissions;
  });

  return emissionsByYear;
}
//******************************************************************************************** */
// Define the dimensions of the map SVG
const mapWidth = 960; // Width of the map
const mapHeight = 500; // Height of the map

// Create the SVG element for the map
const svg_map = d3
  .select("#map-container") 
  .append("svg")
  .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet") // Preserve the aspect ratio of the SVG to be middle aligned and meet the container size
  .attr("width", "100%") // Set width to 100% of the container
  .attr("height", mapHeight);

// Define the name of the TopoJSON object
const provinceName = "provinces";

// Define the geographic projection
const projection = d3.geoAlbers()
  .rotate([100, 0, 0])
  .center([5, 60])
  .scale(1000)
  .translate([mapWidth / 2, mapHeight / 2]);

// Define the path generator
const pathGenerator = d3.geoPath().projection(projection);

//******************************************************************************************** */
// Load and process the CSV file
fetch('../data/PDGES-GHGRP-GHGEmissionsGES-2004-Present.csv')
  .then((response) => response.text())
  .then((csvText) => {
    // Parse the CSV
    const data = parseCSV(csvText);

    // Clean the headers
    cleanedData = cleanHeaders(data);

    // Convert cleaned data back to CSV
    cleanedCsv = convertToCSV(cleanedData); // Assign the cleaned CSV to the higher-scope variable

    emissionsByProvince = sumEmissionsByProvince(cleanedData); // Assign to the global variable
  })
  .then(() => {
    // Use cleanedCsv in Promise.all
    return Promise.all([
      d3.json("../data/canada.json"),
      Promise.resolve(d3.csvParse(cleanedCsv)), // Parse the cleaned CSV string
    ]);
  })
  .then(([data, totalEmission]) => {
    // Check if the expected structure exists
    if (!data || !data.objects || !data.objects[provinceName]) {
      throw new Error(
        `Invalid TopoJSON structure or object name mismatch. Expected 'objects.${provinceName}' in canada.json.`
      );
    }

    // Convert TopoJSON to GeoJSON
    const canadaGeoJSON = topojson.feature(data, data.objects[provinceName]);

    // Fit the projection to the GeoJSON data
    projection.fitSize([mapWidth, mapHeight], canadaGeoJSON);

    // Create a tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #000")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Calculate total emissions by province
    const maxValue = d3.max(Object.values(emissionsByProvince));
    const minValue = d3.min(Object.values(emissionsByProvince));

    // Create a color scale for the emissions
    const colorScale = d3
      // .scaleSequential(d3.interpolateYlOrRd) // Yellow to Red gradient
      .scaleSequential(d3.interpolateGreens) // White to Blue gradient 
      .domain([minValue, maxValue]);

    // Draw the map for Canada
    svg_map
      .append("g")
      .selectAll("path")
      .data(canadaGeoJSON.features)
      .enter()
      .append("path")
      .attr("d", pathGenerator)
      .attr("fill", (d) => {
        const provinceName = d.properties.NAME || "Unknown";
        const totalEmissions = emissionsByProvince[provinceName];
        return totalEmissions ? colorScale(totalEmissions) : "#ccc"; // Gray if no data
      })
      .attr("stroke", "#000") // Add a stroke for better visibility
      .attr("stroke-width", 0.5)
      .on("mouseover", function (event, d) {
        const provinceName = d.properties.NAME || "Unknown";
        const totalEmissions = emissionsByProvince[provinceName] || "No data";

        tooltip
          .style("opacity", 1)
          .html(
            `<strong>Province:</strong> ${provinceName}<br><strong>Total Emissions:</strong> ${totalEmissions.toLocaleString()} tonnes`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    // Create a gradient legend
    const legendWidth = 200;
    const legendHeight = 20;

    const legendGroup = svg_map
      .append("g")
      .attr(
        "transform",
        `translate(${mapWidth - legendWidth - 20}, ${mapHeight - 60})`
      );

    // Add a semi-transparent background to improve readability
    legendGroup
      .append("rect")
      .attr("x", -10)
      .attr("y", -30)
      .attr("width", legendWidth + 20)
      .attr("height", legendHeight + 50)
      .attr("fill", "white")
      .attr("opacity", 0.7)
      .attr("rx", 5)
      .attr("ry", 5);

    // Create a gradient definition for the color scale
    const defs = svg_map.append("defs");

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "emissions-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    linearGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(minValue));

    linearGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(maxValue));

    legendGroup
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#emissions-gradient)");

    const legendScale = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .tickSize(legendHeight + 5)
      .tickValues([minValue, (maxValue - minValue) / 2 + minValue, maxValue]);

    legendGroup.append("g").call(legendAxis);

    legendGroup
      .append("text")
      .attr("class", "legend-title")
      .attr("x", legendWidth / 2)
      .attr("y", -10)
      .style("text-anchor", "middle")
      .text("Total Emissions (tonnes)");
  })
  .catch((error) => {
    console.error("Error loading or processing the data:", error);
    d3.select("#map-container")
      .append("p")
      .style("color", "red")
      .text("Error loading map data. Check the console for details.");
  });