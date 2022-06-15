var margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 600 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

let dataset = [];



let svg = d3.select("#my_dataviz").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")




d3.tsv("data/france.tsv", (d, i) => {
        return {
            codePostal: +d["Postal Code"],
            inseeCode: +d.inseecode,
            place: d.place,
            longitude: +d.x,
            latitude: +d.y,
            population: +d.population,
            density: +d.density
        };
    }).then((rows) => {
        console.log(`Loaded ${rows.length} rows,`);
        if (rows.length > 0) {
            console.log("First row: ", rows[0]);
            console.log("Last row: ", rows[rows.length - 1]);
            dataset = rows;
            population = d3.scalePow()
                .domain(d3.extent(rows, (row) => row.population))
                .range([1, 2])
            x = d3.scaleLinear()
                .domain(d3.extent(rows, (row) => row.longitude))
                .range([0, width]);

            y = d3.scaleLinear()
                .domain(d3.extent(rows, (row) => row.latitude))
                .range([height, 0]);

            draw()
        }
    })
    .catch((error) => {
        console.log("Something went wrong", error)
    });




function draw() {

    var tooltip = d3.select('#my_dataviz')
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")

    const mouseover = function(event, d) {
        d3.select(this).transition()
            .duration('100')
            .attr("r", 10)
            .style("fill", "#2DE0B7")

        tooltip
            .style("opacity", 1)
    }

    const mousemove = function(event, d) {
        tooltip
            .html(`latitude: ${d.latitude}<br>
                   longitude: ${d.longitude}<br>
                   place: ${d.place}<br>
                   inseeCode: ${d.inseeCode}<br>
                   population: ${d.population}<br>
                   density: ${d.density}<br>
                   Postal Code: ${d.codePostal}<br>`)
            .style("top", (event.pageY) + "px")
            .style("left", (event.pageX) + "px")
            .style("position", "absolute")
    }
    const mouseleave = function(event, d) {
        d3.select(this).transition()
            .duration('200')
            .attr("r", population(d.population))
            .style("fill", "#69b3a2")
        tooltip
            .transition()
            .duration(200)
            .style("opacity", 0)
    }

    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("id", "map")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);

    var scatter = svg.append('g')
        .attr("clip-path", "url(#clip)")



    scatter
        .append('g')
        .selectAll("circle")
        .data(dataset)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("r", (d) => population(d.population))
        .attr("cx", (d) => x(d.longitude))
        .attr("cy", (d) => y(d.latitude))
        .attr("fill", "#69b3a2")
        .style("opacity", 0.8)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)


    var xAxis = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))


    var yAxis = svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y))

    var zoom = d3.zoom()
        .scaleExtent([.5, 20])
        .extent([
            [0, 0],
            [width, height]
        ])
        .on("zoom", updateChart);

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .lower()
        .call(zoom);



    function updateChart(event) {


        var newX = event.transform.rescaleX(x);
        var newY = event.transform.rescaleY(y);


        xAxis.call(d3.axisBottom(newX))
        yAxis.call(d3.axisLeft(newY))


        scatter
            .selectAll("circle")
            .attr('cx', function(d) { return newX(d.longitude) })
            .attr('cy', function(d) { return newY(d.latitude) })

    }


}