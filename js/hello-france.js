'use strict';

let margin = { top: 0, left: 0, bottom: 0, right: 0 }
let inset = { width: 600, height: 600 }
let france = { margin: margin,
               inset: inset,
               width: inset.width + margin.left + margin.right,
               height: inset.height + margin.top + margin.bottom,
               src: 'data/france.tsv',
               dataset: null,
               histo: { 
                   height: inset.height / 3,
               },
             };

france.map = d3.select('body')
               .append('svg')
                    .attr('width', france.width)
                    .attr('height', france.height)
                    .style('padding', 30)

france.map.canvas = france.map.append('g')
                              .attr('transform', `translate(${france.margin.left}, ${france.margin.top})`)

france.histo.canvas = d3.select('body')
                     .append('svg').attr('id', 'pop-histo')
                     .attr('width', france.width)
                     .attr('height', france.histo.height)
                     .style('padding-bottom', '30')
                     .style('padding-left', 5)

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
            .range([france.inset.width, 0])
        
        // xAxis = d3.svg.axis().scale(x).orient("bottom");
        // yAxis = d3.svg.axis().scale(y).orient("left");
        france.histo.x = d3.scaleLinear()
            .domain(d3.extent(rows, row => row.population))
            .rangeRound([0, france.inset.width])
        france.histo.bins = d3.histogram()
            .value(d => d.population)
            .domain(france.histo.x.domain())
            .thresholds(france.histo.x.ticks(20))(rows)
        france.histo.y = d3.scaleLinear()
            .domain([0, d3.max(france.histo.bins, d => 
                d.length)])
            .range([france.histo.height, 0])

        france.dataset = rows;
        draw(france.dataset);
    });

function draw(dataset) {
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
    
    france.map.canvas.selectAll("rect")
        .data(dataset)
        .enter()
            .append("rect")
                .attr("width", 1)
                .attr("height", 1)
                .attr("x", d => france.x(d.longitude) )
                .attr("y", d => france.y(d.latitude) )
                .attr("fill", "blue")
                .on('mouseover', showPlaceInTooltip)
    
    france.histo.canvas.selectAll('rect')
        .data(france.histo.bins)
        .enter()
            .append('rect')
            .attr('x', d => france.histo.x(d.x0)) // magique, définie par d3.histogram
            .attr('y', d => france.histo.y(d.length))
            .attr('width', france.histo.x(france.histo.bins[0].x1) - france.histo.x(france.histo.bins[0].x0) - 1)
            .attr('height', d => france.histo.height - france.histo.y(d.length))
            .attr('fill', 'steelblue')
    france.histo.canvas.append('g')
        .attr('class', "population histogram x axis")
        .attr('transform', `translate(0, ${france.histo.height})`)
        .call(d3.axisBottom(france.histo.x))
}

function showPlaceInTooltip(d) {
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
}

function hideTooltip(d) {
    tooltip.style('visibility', 'hidden');
}

// TODO : 
// Add tooltip
// Add histogram of populations
// Use classes ?
// Add population curve
// Linked views + filtering