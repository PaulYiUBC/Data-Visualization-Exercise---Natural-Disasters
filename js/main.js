
//Load data from CSV file asynchronously and render chart
d3.csv("data/disaster_costs.csv").then(ready);

function ready(data) {
  //convert data type
  data.forEach((d) => {
    d.cost = toNumber(d.cost);
    d.year = toNumber(d.year);
    d.date = parseTime(d.mid);
  });

  //Coloring Scheme
  const coloringScheme = [
    {
      title: "Winter storms, freezing", category: "winter-storm-freeze", "hex-code": "#ccc",
    },
    {
      title: "Drought and wildfire", category: "drought-wildfire", "hex-code": "#ffffd9",
    },
    {
      title: "Flooding", category: "flooding", "hex-code": "#41b6c4"
    },
    {
      title: "Tropical cyclones", category: "tropical-cyclone", "hex-code": "#081d58",
    },
    {
      title: "Severe storms", category: "severe-storm", "hex-code": "#c7e9b4",
    },
  ];

// | title                   | category            | hex code |
//   |-------------------------|---------------------|----------|
//   | Winter storms, freezing | winter-storm-freeze | #ccc     |
//   | Drought and wildfire    | drought-wildfire    | #ffffd9  |
//   | Flooding                | flooding            | #41b6c4  |
//   | Tropical cyclones       | tropical-cyclone    | #081d58  |
//   | Severe storms           | severe-storm        | #c7e9b4  |



  const timeline = new Timeline(
      {
        parentElement: "#vis",
        coloringScheme,
      },
      data
  );
}

// Initialize helper function to convert date strings to date objects
function parseTime(value) {
  const parser = d3.timeParse("%Y-%m-%d");
  const date = parser(value);
  return date;
}

//Initialize helper function to check if a value is a valid number
function isNumerical(value) {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  return !isNaN(value) && !isNaN(parseFloat(value));
}

//Initialize helper function to convert a value to number
function toNumber(value) {
  //if a value is valid number, convert it to type number
  //otherwise return null
  return isNumerical(value) ? value * 1 : null;
}