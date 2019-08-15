'use strict';
(function () {


    /**
     * Obtains the example data to be plotted, and passes it to the 'next' function when the request is done.
     *
     * The data is an array of airport objects.
     */
    function getData(next) {
        d3.json('us-map-overlay.json', (data) => next(data) );
    }


    function getPlotArea() {
        const plot = {
            svg: {
                width: 800,
                height: 500
            },
            padding: { //main chart area padding
                top: 60,
                right: 5,
                bottom: 5,
                left: 5
            }
        };
        plot.range = { //drawn axis length in pixels
            x: plot.svg.width - plot.padding.left - plot.padding.right,
            y: plot.svg.height - plot.padding.top - plot.padding.bottom
        };
        return plot;
    }


    /**
     * Linear scales used in this chart:
     *
     * r: Airport circle radius, proportional to annual number of airplane movements.
     *
     * x: Longitude (West).  Requires equirectangular map projection.
     *
     * y: Latitude (North).  Requires equirectangular map projection.
     */
    function makeScales(plot) {
        return {
            r: d3.scaleLinear()
                .domain([100000,1000000])
                .range([1,10]),
            x: d3.scaleLinear()
                .domain([-124.711776,-67.0999376]) //Longitudes: [Cape Flattery, Washington; Lubec, Maine]
                .range([0,plot.range.x]),
            y: d3.scaleLinear()
                .domain([24.5646815,49.3782021])   //Latitudes: [Key West, Florida; Angle Township, Minnesota]
                .range([plot.range.y,0])
        };
    }


    /**
     * Loads the US map SVG as a DOM Element, scales it to fit our plot range,
     * and passes the map (as a D3 Selection) to the next() callback.
     */
    function appendMap(paddingGroup, plot, next) {
        d3.xml('Blank_Map_Equirectangular_United_States_48.svg').mimeType('image/svg+xml').get((error, xml) => {
            if (error) {
                throw error;
            }
            const svgElement = document.importNode(xml.documentElement, true);
            const origWidth = svgElement.getAttribute('width');
            const origHeight = svgElement.getAttribute('height');
            svgElement.setAttribute('width', plot.range.x);
            svgElement.setAttribute('height', plot.range.y);
            svgElement.setAttribute('viewBox', '0 0 ' + origWidth + ' ' + origHeight);
            svgElement.setAttribute('preserveAspectRatio', 'none'); //Non-uniform scaling
            paddingGroup.node().appendChild(svgElement);
            const svgSelection = d3.select('#' + svgElement.id);
            next(svgSelection);
        });
    }


    /**
     * Appends an elliptical arc for all possible air routes, i.e. draws a fully connected graph of airport nodes.
     */
    function appendRouteArcs(paddingGroup, data, scales) {
        const routesGroup = paddingGroup.append('g').attr('class', 'routes');
        routesGroup.selectAll()
            .data(data)
            .enter()
            .each(function(d,i) {
                for (let j = 0; j < data.length; ++j) {
                    if (j != i) {
                        appendOneRouteArc(routesGroup, d, data[j], scales);
                    }
                }
            });
    }


    /**
     * Appends an elliptical arc from the departure airport to the arrival airport.
     * We'll distinguish the direction of travel (eastward vs westward) with a css class on the arc path.
     */
    function appendOneRouteArc(routesGroup, departureAirport, arrivalAirport, scales) {
        const xAxisRotation = 0; //Rotation value doesn't matter with a circle.
        const largeArcFlag = 0; //The "small arc" is the appropriate choice, we don't want a nearly full ellipse.
        const curX = scales.x(departureAirport.longitude);
        const curY = scales.y(departureAirport.latitude);
        const newX = scales.x(arrivalAirport.longitude);
        const newY = scales.y(arrivalAirport.latitude);
        const rx = (newX - curX) * 1.5; //Higher multiplier -> arc becomes more like a straight line.
        const ry = rx; //i.e. ellipse is a circle
        const sweepFlag = 1; //Sweeps the arc of the ellipse whose area is mainly below the line
                             //from rx,ry to newX,newY, for eastward paths.  (Reverse for westward.)
        routesGroup.append('path')
            .attr('d',
                'M ' + curX + ',' + curY + ' '
                + 'A ' + rx + ' ' + ry + ' '
                + xAxisRotation + ' '
                + largeArcFlag + ' '
                + sweepFlag + ' '
                + newX + ' ' + newY)
            .classed(curX < newX ? 'eastward' : 'westward', true);
    }


    /**
     * Draws all the airport circles (and codes).
     */
    function appendAirportCircles(paddingGroup, data, scales) {
        paddingGroup.selectAll()
            .data(data)
            .enter()
            .each(function(d,i) {
                appendOneAirportCircle(paddingGroup, d, scales);
            });
    }


    /**
     * Draws a circle for the airport, sized proportional to the movement count, and positioned at the
     * x/y location mapped from its longitude/latitude coordinates.
     *
     * Also draws the airport code below the circle, as text over a light colored "plate" rect.
     */
    function appendOneAirportCircle(paddingGroup, airport, scales) {
        const fontOffset = 16;
        const plateMargin = 3;
        const platePadding = 1;
        const cx = scales.x(airport.longitude);
        const cy = scales.y(airport.latitude);
        const airportGroup = paddingGroup.append('g')
            .attr('class', 'airport')
            .attr('transform', 'translate(' + cx + ',' + cy + ')');
        const r = scales.r(airport.movements2015);
        airportGroup.append('circle')
            .attr('r', r);
        const textWidth = chartUtils.calcTextWidth(paddingGroup, airport.code, 'airport-hidden');
        airportGroup.append('rect')
            .attr('class', 'plate')
            .attr('x', -(textWidth/2 + platePadding))
            .attr('y', r + plateMargin)
            .attr('width', textWidth + 2 * platePadding)
            .attr('height', fontOffset + platePadding);
        airportGroup.append('text')
            .attr('y', r + fontOffset)
            .text(airport.code);
    }


    /**
     * Writes the title at the top of the chart.
     */
    function appendChartTitle(svg, plot) {
        svg.append('text')
            .attr('class', 'chartTitle')
            .attr('x', plot.svg.width/2)
            .attr('y', plot.padding.top * 0.66)
            .text('Air routes among airports with highest plane movements (2015)');
    }


    /**
     * The legend consists of several rows having a color chip and label to identify airports and route directions.
     */
    function appendLegend(svg, plot) {
        const area = {
            row: {
                spacing: 18
            },
            square: {
                width: 10
            },
            circle: {
                radius: 5
            },
            textOffset: {
                x: 10,
                y: 4
            }
        };
        const legendGroup = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(20,' + (0.8 * plot.svg.height) + ')');
        appendLegendOneRow(legendGroup, area, 0, 'rect', 'eastward', 'Eastward route');
        appendLegendOneRow(legendGroup, area, 1, 'rect', 'westward', 'Westward route');
        appendLegendOneRow(legendGroup, area, 2, 'circle', '', 'Airport (radius proportional to number of movements)');
    }


    function appendLegendOneRow(legendGroup, area, rowNum, shapeName, shapeClass, textString) {
        if (shapeName === 'circle') {
            legendGroup.append('circle')
                .attr('class', shapeClass)
                .attr('cy', rowNum * area.row.spacing)
                .attr('r', area.circle.radius);
        }
        else if (shapeName === 'rect') {
            legendGroup.append('rect')
                .attr('class', shapeClass)
                .attr('x', -area.square.width/2)
                .attr('y', -area.square.width/2 + rowNum * area.row.spacing)
                .attr('width', area.square.width)
                .attr('height', area.square.width);
        }
        legendGroup.append('text')
            .attr('x', area.textOffset.x)
            .attr('y', area.textOffset.y + rowNum * area.row.spacing)
            .text(textString);
    }


    /**
     * Top level D3 drawing function.
     */
    function draw() {
        const svg = d3.select('body').append('svg');
        const plot = getPlotArea();
        const paddingGroup = chartUtils.setupSvgAndPaddingGroup(svg, plot);
        getData((data) => {
            appendMap(paddingGroup, plot, (map) => {
                const scales = makeScales(plot);
                appendRouteArcs(paddingGroup, data, scales);
                appendAirportCircles(paddingGroup, data, scales);
                appendChartTitle(svg, plot);
                appendLegend(svg, plot);
            });
        });
    }


    window.onload = draw;


})();

