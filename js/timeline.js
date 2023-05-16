class Timeline {
  /**
   * Class constructor with initial configuration
   * @param {Object} - config
   * @param {Array} - raw data
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      //add coloring scheme in main.js
      coloringScheme: _config.coloringScheme,
      containerWidth: 800,
      containerHeight: 900,
      margin: { top: 120, right: 20, bottom: 20, left: 45 },
    };


    this.data = _data;


    this.initVis();
  }

  /**
   * We initialize the arc generator, scales, axes, and append static elements
   */
  initVis() {
    const vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
        vis.config.containerWidth -
        vis.config.margin.left -
        vis.config.margin.right;

    vis.height =
        vis.config.containerHeight -
        vis.config.margin.top -
        vis.config.margin.bottom;

    //Initialize scales and axes
    vis.dateGetRidOfYear = (d) => {
      const date = new Date(d.getTime());
      date.setFullYear(0);
      return date;
    };

    //the scale function for no-year date to x coordinate
    vis.xScaleTime = d3.scaleTime()
        .domain(d3.extent(vis.data, (d) => vis.dateGetRidOfYear(d.date)))
        .nice()
        .range([0, vis.width]);

    //the scale function for date to x coordinate
    vis.xScale = (date) => vis.xScaleTime(vis.dateGetRidOfYear(date));

    //the scale function for year value to y coordinate
    vis.yScale = d3.scaleLinear()
        .domain(d3.extent(vis.data, (d) => d.year))
        .range([vis.height, 0]);

    //the scale function for value cost to radius
    vis.radiusScale = d3.scaleSqrt()
        .domain(d3.extent(vis.data, (d) => d.cost))
        .range([4, 120]);

    //
    const coloringScheme = vis.config.coloringScheme;
    vis.color = d3.scaleOrdinal()
        .domain(coloringScheme.map((d) => d.category))
        .range(coloringScheme.map((d) => d["hex-code"]));

    // Initialize arc generator that we use to create the SVG path for the half circles.
    vis.arcGenerator = d3
        .arc()
        .outerRadius((d) => vis.radiusScale(d))
        .innerRadius(0)
        .startAngle(-Math.PI / 2)
        .endAngle(Math.PI / 2);

    const container = d3.select(vis.config.parentElement);

    // Define size of SVG drawing area
    vis.svg = container.append("svg")
        .attr("width", vis.config.containerWidth)
        .attr("height", vis.config.containerHeight);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chartArea = vis.svg.append("g").attr("transform",
            `translate(${vis.config.margin.left},${vis.config.margin.top})`
        );

    //Append axis groups
    vis.yAxis = vis.chartArea.append("g").attr("class", "y-axis");

    vis.xAxis = vis.chartArea.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(${0},${-20})`);

    // Initialize clipping mask that covers the whole chart
    vis.chartArea.append("defs")
        .append("clipPath")
        .attr("id", "chart-mask")
        .append("rect")
        .attr("width", vis.width)
        .attr("y", -vis.config.margin.top)
        .attr("height", vis.config.containerHeight);

    // Apply clipping mask to 'vis.chart' to clip semicircles at the very beginning and end of a year
    vis.chart = vis.chartArea.append("g").attr("clip-path", "url(#chart-mask)");

    //
    vis.renderXAxis();
    vis.renderYAxis();
    vis.updateVis();
  }

  /**
   * Prepare the data and scales before we render it.
   */
  updateVis() {
    const vis = this;
    vis.renderVis();
  }

  /**
   * Bind data to visual elements (enter-update-exit) and update axes
   */
  renderVis() {
    const vis = this;

    // TO DO: set up filter function for the interactive legend
    const dataFiltered = vis.data;

    //group the data by year
    const dataToUse = d3.groups(dataFiltered, (d) => d.year);

    dataToUse.forEach((oneyear) => {
      /// for each year find the disaster with the highest cost of the year
      const highestCost = d3.greatest(oneyear[1], (d) => d.cost);
      oneyear[1].forEach((d) => {
        //assign isCostliest as true if the disaster is costliest
        d.isCostliest = d.cost == highestCost.cost;
      });
    });

    // Binding level 1 year data
    // key is year
    const yearGroup = vis.chart
        .selectAll("g.year")
        .data(dataToUse, (d) => d[0]);
    //Enter
    const yearGroupEnter = yearGroup.enter().append("g").attr("class", "year");
    //Merge update
    const yearGroupUpdate = yearGroup.merge(yearGroupEnter);
    //Exit
    yearGroup.exit().remove();

    //set y scale position for yearGroupEnter
    yearGroupEnter.attr("transform", (d) => `translate(${0},${vis.yScale(d[0])})`);

    //bind level 2 disaster group
    //key is name
    const disasterGroup = yearGroupUpdate.selectAll("g.disaster").data((d) => d[1], (d) => d.name);
    //Enter
    const disasterGroupEnter = disasterGroup.enter().append("g").attr("class", "disaster");
    //Merge update
    const disasterGroupUpdate = disasterGroup.merge(disasterGroupEnter);
    //Exit
    disasterGroup.exit().remove();

    // set x scale position for disasterGroupEnter
    disasterGroupEnter.attr("transform", (d) => `translate(${vis.xScale(d.date)},${0})`);

    ///append disasterGroupEnter
    disasterGroupEnter.append("path")
        .attr("class", "mark")
        .attr("fill", (d) => vis.color(d.category))
        .attr("d", (d) => vis.arcGenerator(d.cost));

    //disaster annotations
    //hint: .attr('text-anchor', 'middle')
    //if disaster is highest cost then bind data [d]
    //if not then remove text annotation
    const annotation = disasterGroupUpdate.selectAll("text.annotation").data((d) => (d.isCostliest ? [d] : []));
    //Enter
    const annotationEnter = annotation.enter().append("text").attr("class", "annotation");
    //Merge update
    const annotationUpdate = annotation.merge(annotationEnter);
    //Exit
    annotation.exit().remove();

    //The labels should be positioned below each semicircle and centered (hint: .attr('text-anchor', 'middle')).
    annotationEnter.attr("dominant-baseline", "hanging") //the vertical anchor type
        .attr("text-anchor", "middle") //the horizonal anchor type
        .attr("fill", "black")
        .attr("font-size", 11)
        .attr("y", 2)
        .text((d) => d.display_name);
  }

  // render the x month axis
  renderXAxis() {
    const vis = this;

    //Use d3.axisTop() with d3.scaleTime() to show the x-axis with month labels at the top.
    const axis = d3.axisTop(vis.xScaleTime).tickFormat(d3.timeFormat("%b"));

    //apply axis to group element vis.xAxis
    vis.xAxis.call(axis);

  }

  // render the y - year axis
  //Show all years between 1980 and 2017 on the y-axis,
  //hint: you can create grid lines by using d3.axisLeft(vis.yScale).tickSize(-vis.width)).
  renderYAxis() {
    const vis = this;

    //generate an array of tick values
    const [yMin, yMax] = vis.yScale.domain();
    const tickValues = d3.range(yMin, yMax + 1);

    //the axis function
    const axis = d3.axisLeft(vis.yScale) //set scale
        .tickFormat((v) => v) //set tickFormat, show the tick text like the original value
        .tickValues(tickValues) //set tick values
        .tickSize(-vis.width);

    //apply axis to group element vis.yAxis
    vis.yAxis.call(axis);

  }

  // TO DO: Create legend

  // TO DO: Create tooltip

}
