'use strict';

let highlighted = []
let margin = { top: 0, left: 0, bottom: 0, right: 0 }
let inset = { width: 600, height: 600 }
let france = { margin: margin,
               inset: inset,
               width: inset.width + margin.left + margin.right,
               height: inset.height + margin.top + margin.bottom,
               src: 'data/france.tsv',
               dataset: null,
               histo: { 
                   height: inset.height / 4,
               },
               popCurve: {
                   height: inset.height / 4,
               }
             };

france.map = d3.select('body')
               .append('svg')
                    .attr('class', 'map')
                    .attr('width', france.width)
                    .attr('height', france.height)

france.map.canvas = france.map.append('g')
                              .attr('transform', `translate(${france.margin.left}, ${france.margin.top})`)

france.histo.canvas = d3.select('body')
                     .append('svg').attr('id', 'pop-histo')
                     .attr('width', france.width)
                     .attr('height', france.histo.height)
                    //  .style('padding', 45)

france.popCurve.canvas = d3.select('body')
    .append('svg').attr('id', 'pop-curve')
    .attr('width', france.width)
    .attr('height', france.popCurve.height)
    // .style('padding', 55)

d3.selectAll('svg')
    .style('padding-left', 55)
    .style('padding-bottom', 30)
    .style('padding-top', 10)

let tooltip = d3.select('body')
                .append('div')
                .attr('id', 'tooltip')
                .style('visibility', 'hidden')
                .style('position', 'absolute')
                .style("background-color", d3.hsl(40, 0.4, 0.9).toString())
                .style("border", "solid 1px black")
                .style("opacity", 0.8)
                .style("padding", "5px")
                .style("border-radius", "4px")

d3.tsv(france.src)
    .row( (d, i) => {
        if (isNaN(+d.x) || isNaN(+d.y)) return null;
        return {
            codePostal: +d["Postal Code"],
            inseeCode: +d.inseecode,
            place: d.place,
            longitude: +d.x,
            latitude: +d.y,
            population: +d.population,
            density: +d.density,
            highlighted: false,
        }
    })
    .get( (error, rows) => {
        if (error) {
            console.log(`Error! ${error}.`);
            return;
        }
        console.log(`Loaded ${rows.length} rows.`);
        if (rows.length > 0) {
            console.log("First row: ", rows[0]);
            console.log("Last row: ", rows[rows.length-1]);
        }

        france.x = d3.scaleLinear()
                     .domain(d3.extent(rows, row => row.longitude ))
                     .range([0, france.inset.width]);
        france.y = d3.scaleLinear()
                     .domain(d3.extent(rows, row => row.latitude))
                     .range([france.inset.height, 0]);
        france.popScale = d3.scalePow()
            .domain(d3.extent(rows, row => row.population))
            .range([1, 20])
        france.densityScale = d3.scalePow()
            .domain(d3.extent(rows, row => row.density))
            .range([.5, .8])
        
        // xAxis = d3.svg.axis().scale(x).orient("bottom");
        // yAxis = d3.svg.axis().scale(y).orient("left");
        france.histo.x = d3.scaleLinear()
            .domain(d3.extent(rows, row => Math.sqrt(row.population)))
            .rangeRound([0, france.inset.width])
        france.histo.xAxis = d3.axisBottom(
            d3.scaleSqrt()
                .domain(d3.extent(rows, row=> row.population))
                .rangeRound([0, france.inset.width]))
        france.histo.bins = d3.histogram()
            .value(d => Math.sqrt(d.population))
            .domain(france.histo.x.domain())
            .thresholds(100)(rows.filter(row => row.population > 0))
        france.histo.y = d3.scalePow().exponent(0.3)
            .domain([0, d3.max(france.histo.bins, d => 
                d.length)])
            .range([france.histo.height, 0])
        france.histo.yAxis = d3.axisLeft(france.histo.y)

        france.popCurve.data = rows.filter( d => d.population > 0 )
            .sort( (a, b) => a.population - b.population)
        france.popCurve.x = d3.scaleLinear()
            .domain([0, france.popCurve.data.length])
            .range([0, france.width])
        france.popCurve.y = d3.scalePow().exponent(0.25)
            .domain(d3.extent(france.popCurve.data, d => d.population))
            .range([france.popCurve.height, 0])
        france.popCurve.line = d3.line()
            .x( (d, i) => france.popCurve.x(i) )
            .y( d => france.popCurve.y(d.population) )
        france.popCurve.xAxis = d3.axisBottom(france.popCurve.x).ticks(0)
        france.popCurve.yAxis = d3.axisLeft(france.popCurve.y).ticks(6)

        france.dataset = rows;
        draw(france.dataset);
        drawAxes();
    });

function draw(dataset) {
    drawMap(dataset)
    drawHistogram()
    drawPopCurve()
}

function drawMap(dataset) {
    let places = france.map.canvas.selectAll("circle").data(dataset)
    places.exit().remove()
    places.enter()
            .append("circle")
                .attr("width", 1)
                .attr("height", 1)
                .attr('r', d => france.popScale(d.population))
                .attr("cx", d => france.x(d.longitude) )
                .attr("cy", d => france.y(d.latitude) )
                // .attr('opacity', d => france.densityScale(d.density))
                // .attr("fill", "steelblue")
                .attr('fill', d => {
                    let color = d3.hsl("steelblue")
                    color.opacity = france.densityScale(d.density)
                    return color
                })
                .on('mouseover', showPlaceInTooltip)
}

function drawHistogram() {
    france.histo.canvas.selectAll('rect')
        .data(france.histo.bins)
        .attr('fill', d => d.map( place => place.highlighted ).reduce( (result, i) => result || i, false ) ? 'orange' : 'steelblue')
        .enter()
            .append('rect')
            .attr('x', d => france.histo.x(d.x0)) // magique, définie par d3.histogram
            .attr('y', d => france.histo.y(d.length))
            .attr('width', d => Math.max(france.histo.x(d.x1) - france.histo.x(d.x0), 1))
            .attr('height', d => france.histo.height - france.histo.y(d.length))
            .attr('fill', 'steelblue')
            .on('mouseover', selectPlaces)
            .on('mouseout', deselectPlaces)
}

function drawPopCurve() {
    france.popCurve.canvas.append('path')
        .attr('d', france.popCurve.line(france.popCurve.data))
        .attr('fill', 'none')
        .attr('stroke', 'blue')
}

function drawAxes() {
    france.map.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(${france.margin.left}, ${france.inset.height})`) // ^1
            .call(d3.axisBottom(france.x))
        .append("text")
            .text("Latitude")

    france.map.append("g")
        .attr("class", "y axis")
        .attr("transform", `translate(${france.margin.left}, 0)`)
        .call(d3.axisLeft(france.y))

        /* ^1: axes are always positioned at the origin.  The Right/Left/Top/Bottom indicated where the text is relative to the axis
        */
    
    france.histo.canvas.append('g')
       .attr('class', "population histogram x axis")
       .attr('transform', `translate(0, ${france.histo.height})`)
       .call(france.histo.xAxis)
    france.histo.canvas.append('g')
        .attr('class', 'population histogram y axis')
        .call(france.histo.yAxis)
    france.histo.canvas.selectAll('.x.axis g.tick:nth-child(even) text').attr('y', 20)
    france.histo.canvas.selectAll('.x.axis g.tick:nth-child(even) line').attr('y2', 17)

    france.popCurve.canvas.append('g')
        .attr('class', 'population curve x axis')
        .attr('transform', `translate(0, ${france.popCurve.height})`)
        .call(france.popCurve.xAxis)
    france.popCurve.canvas.append('g')
        .attr('class', 'population curve y axis')
        .call(france.popCurve.yAxis)
}

function showPlaceInTooltip(d) {
    d3.selectAll('.map .highlighted').classed('unhighlighted', true)
    highlighted = [d]
    d.highlighted = true
    tooltip.text('') // reset tooltip contents
           .append('b').text(d.place)
    tooltip.append('span').text(` (${d.codePostal})`).append('br')
    tooltip.append('b').text('Population: ')
    tooltip.append('span').text(d.population).append('br')
    tooltip.append('b').text('Density: ')
    tooltip.append('span').text(d.density).append('br')

    tooltip.style('visibility', 'visible')
           .style('top', d3.event.y + 'px')
           .style('left', (d3.event.x + 25) + 'px')
    this.classList.add('highlighted')
    updateHighlights()
}

function hideTooltip(d) {
    tooltip.style('visibility', 'hidden');
    this.classList.remove('highlighted')
    this.classList.add('unhighlight')
    highlighted = []
}

function selectPlaces(d, i) {
    highlighted.forEach( place => place.highlighted = false ) // remove old selection
    highlighted = d // add new selection
    d.forEach( place => {  // and update data
        place.highlighted = true 
    })

    updateHighlights() // refresh drawing
    // draw(france.dataset)
}

function deselectPlaces(d) {
    d.forEach( place => place.highlighted = false )
    // draw(france.dataset)
}

function updateHighlights() {
    // Make sure all highlighted place have highlighted class in map
    d3.selectAll('.map circle:not(.highlighted)')
        .filter( d => d.highlighted )
        .classed('highlighted', true)
    d3.selectAll('.map .highlighted')
        .filter( d => !d.highlighted )
        .classed('highlighted', false)
        .classed('unhighlighted', true)
    d3.selectAll('.map .highlighted')
        .attr('width', 8)
        .attr('height', 8)
        .attr('r', d => france.popScale(d.population))
        .raise() // move to front
    d3.selectAll('.map .unhighlighted')
        .attr('width', 1)
        .attr('height', 1)
        .attr('r', 1)
        .each( d => d.highlighted = false )
        .classed('unhighlighted', false)
    
        
    drawHistogram()
}

// TODO : 
// Add tooltip
// Add histogram of populations
// Use classes ?
// Add population curve
// Linked views + filtering