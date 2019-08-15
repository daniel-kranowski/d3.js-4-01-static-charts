'use strict';
(function () {


    /**
     * Example data to be plotted.  Could be obtained from CSV, JSON, or many other data sources.
     */
    function getData() {
        return [
            {
                name: 'Apple',
                scoreToday: 62,
                scoreLastYear: 25
            },
            {
                name: 'Banana',
                scoreToday: 90,
                scoreLastYear: 71
            },
            {
                name: 'Peach',
                scoreToday: 43,
                scoreLastYear: 59
            },
            {
                name: 'Orange',
                scoreToday: 65,
                scoreLastYear: 43
            },
            {
                name: 'Lime',
                scoreToday: 88,
                scoreLastYear: 63
            }
        ];
    }


    function getPlotArea() {
        const plot = {
            svg: {
                width: 800,
                height: 500
            },
            padding: { //main chart area padding
                top: 70,
                right: 30,
                bottom: 70,
                left: 70
            }
        };
        plot.range = { //drawn axis length in pixels
            x: plot.svg.width - plot.padding.left - plot.padding.right,
            y: plot.svg.height - plot.padding.top - plot.padding.bottom
        };
        return plot;
    }


    function makeScales(data, plot) {
        return {
            x: d3.scaleBand()
                .domain(data.map(x => x.name)) //object names are the X domain
                .range([0, plot.range.x]),
            y: d3.scaleLinear()
                .domain([0,100])
                .range([plot.range.y, 0]),
        };
    }


    /**
     * The X-axis is a horizontal line with a tick for each type of fruit.
     */
    function appendXAxis(paddingGroup, scales, plot) {
        const xAxis = d3.axisBottom().scale(scales.x);
        paddingGroup.append('g')
            .attr('transform', 'translate(0,' + plot.range.y + ')')
            .attr('class', 'xAxis')
            .call(xAxis);
    }


    /**
     * The Y-Axis is a vertical line with the default number of ticks on the scale domain (0 to 100).
     */
    function appendYAxis(paddingGroup, scales) {
        const yAxis = d3.axisLeft().scale(scales.y);
        paddingGroup.append('g')
            .attr('class', 'yAxis')
            .call(yAxis);
    }


    /**
     * Appends horizontal dashed lines (over the plot area) that align with the Y-Axis ticks.
     *
     * (Implemented as a second Y-Axis.  Tick text display is turned off in CSS.)
     */
    function appendYAxisDashedLines(paddingGroup, scales, plot) {
        const yAxis = d3.axisLeft().scale(scales.y).tickSize(plot.range.x);
        paddingGroup.append('g')
            .attr('class', 'yDashed')
            .attr('transform', 'translate(' + plot.range.x + ',0)')
            .call(yAxis);
    }


    /**
     * Dashed pattern is a square: half dark and half white.
     */
    function defineDashedLine(svg) {
        const pattern = svg.append('defs')
            .append('pattern')
            .attr('id', 'dashed-line')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4);
        pattern.append('rect')
            .attr('width', 4)
            .attr('height', 4)
            .attr('fill', 'white');
        pattern.append('rect')
            .attr('width', 2)
            .attr('height', 4)
            .attr('fill', 'lightgrey');
    }


    /**
     * Appends the bars of the bar chart.  They are vertical columns, one per fruit type.
     */
    function appendBars(paddingGroup, data, scales, plot) {
        const rectWidth = scales.x.bandwidth() * 0.2;
        paddingGroup.append('g')
            .attr('class', 'bars')
            .attr('transform', 'translate(' + (scales.x.bandwidth()/2 - rectWidth/2) + ',0)')
            .selectAll()
            .data(data)
            .enter()
            .append('rect')
            .attr('x', (d) => scales.x(d.name))
            .attr('y', (d) => scales.y(d.scoreToday))
            .attr('width', rectWidth)
            .attr('height', (d) => plot.range.y - scales.y(d.scoreToday))
            .attr('class', (d) => d.name);
    }


    /**
     * Writes the scoreToday numbers over top of the bars.
     */
    function appendScoreToday(paddingGroup, data, scales) {
        paddingGroup.append('g')
            .attr('class', 'scoreToday')
            .attr('transform', 'translate(' + (scales.x.bandwidth()/2) + ',0)')
            .selectAll()
            .data(data)
            .enter()
            .append('text')
            .attr('x', (d) => scales.x(d.name))
            .attr('y', (d) => scales.y(d.scoreToday) - 5)
            .text((d) => d.scoreToday);
    }


    /**
     * Draws a tick and the score for scoreLastYear numbers, adjacent to the bars.
     */
    function appendScoreLastYear(paddingGroup, data, scales) {
        const rectWidth = scales.x.bandwidth() * 0.2;
        const entered = paddingGroup.append('g')
            .attr('class', 'scoreLastYear')
            .attr('transform', 'translate(' + (scales.x.bandwidth()/2 + rectWidth/2) + ',0)')
            .selectAll()
            .data(data)
            .enter();
        entered.append('line')
            .attr('x1', (d) => scales.x(d.name))
            .attr('y1', (d) => scales.y(d.scoreLastYear))
            .attr('x2', (d) => scales.x(d.name) + 6)
            .attr('y2', (d) => scales.y(d.scoreLastYear));
        entered.append('text')
            .attr('x', (d) => scales.x(d.name) + 8)
            .attr('y', (d) => scales.y(d.scoreLastYear) + 4)
            .text((d) => d.scoreLastYear);
    }


    /**
     * Writes the title at the top of the chart.
     */
    function appendChartTitle(svg, plot) {
        svg.append('text')
            .attr('id', 'chartTitle')
            .attr('x', plot.svg.width/2)
            .attr('y', plot.padding.top * 0.66)
            .text('Carbo-Hydroxyl-Frutinoid Concentrations'); //Ok I just made up this concept
    }


    /**
     * Writes the vertical (rotated) title to the left of the Y-Axis.
     */
    function appendYAxisTitle(svg, plot) {
        svg.append('text')
            .attr('id', 'yTitle')
            .attr('transform', 'translate(' + (plot.padding.left/3) + ','
                + (plot.padding.top + plot.range.y/2) + ') rotate(-90)')
            .text('Concentration %');
    }


    /**
     * Writes a footnote below the X-Axis.
     */
    function appendFootnote(svg, plot) {
        svg.append('text')
            .attr('id', 'footnote')
            .attr('x', plot.svg.width/2)
            .attr('y', plot.svg.height - plot.padding.bottom/4)
            .text("Bold score represents today's value.  Italic score represents last year's value.");
    }


    /**
     * Top level D3 drawing function.
     */
    function draw() {
        const data = getData();
        const svg = d3.select('body').append('svg');
        const plot = getPlotArea();
        const paddingGroup = chartUtils.setupSvgAndPaddingGroup(svg, plot);
        const scales = makeScales(data, plot);
        defineDashedLine(svg);
        appendYAxisDashedLines(paddingGroup, scales, plot);
        appendXAxis(paddingGroup, scales, plot);
        appendYAxis(paddingGroup, scales);
        appendBars(paddingGroup, data, scales, plot);
        appendScoreToday(paddingGroup, data, scales);
        appendScoreLastYear(paddingGroup, data, scales);
        appendChartTitle(svg, plot);
        appendYAxisTitle(svg, plot);
        appendFootnote(svg, plot);
    }


    window.onload = draw;


})();

