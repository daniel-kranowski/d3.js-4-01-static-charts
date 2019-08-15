'use strict';
(function () {

    /**
     * Obtains the example data to be plotted, as an array of { Date, 10YTR, IsRecession }.
     * d3.csv makes an http request, so (1) the CSV file must be served by a web server not the filesystem,
     * and (2) the result is asynchronous -- D3.js doesn't have its own promise api yet, so we'll invoke the
     * 'next' function when the request is done.
     *
     * Input Date format: 'YYYY-MM-DD'
     * Input Rate '5' corresponds to 5.00 %.
     */
    function getData(next) {
        d3.csv('rate-data.csv',
            (oneRow) => {
                const dateParts = oneRow.Date.split('-').map((x) => +x);
                return {
                    date: new Date(dateParts[0], dateParts[1] - 1, dateParts[2]),
                    rate: +oneRow['10YTR'] / 100.0,
                    isRecession: +oneRow.IsRecession === 1 ? true : false
                };
            },
            (rows) => {
                next(rows);
            });
    }


    function getPlotArea() {
        const plot = {
            svg: {
                width: 800,
                height: 420
            },
            padding: { //main chart area padding
                top: 10,
                right: 90,
                bottom: 40,
                left: 20
            }
        };
        plot.range = { //drawn axis length in pixels
            x: plot.svg.width - plot.padding.left - plot.padding.right,
            y: plot.svg.height - plot.padding.top - plot.padding.bottom
        };
        return plot;
    }


    /**
     * Visual margin applied beyond the actual min/max of the charted data, valued in the data domain.
     */
    const rateHeadroom = 0.005;
    const dateMinHeadroomDays = 14;
    const dateMaxHeadroomDays = 7;


    /**
     * The scales are larger than the actual domains by a certain amount of headroom.
     *
     * The reason for doing this on the X scale is so the rate waveform doesn't overhang the background border.
     * Reason for doing this on Y scale is for the visual element of background border line overhang, so the
     * Y axis labels don't get in the way.
     *
     * The downside of this approach is that we'll have to explicitly specify axis tickValues that don't occupy the
     * headroom areas, for the Y axis.
     *
     * X scale is based on time, where the oldest datapoint is first: data[0].
     */
    function makeScales(data, plot) {
        const minDate = moment(data[0].date).subtract(dateMinHeadroomDays, 'days').toDate();
        const maxDate = moment(data[data.length-1].date).add(dateMaxHeadroomDays, 'days').toDate();
        const minRate = Math.floor(100.0 * d3.min(data.map(x => x.rate))) / 100.0 - rateHeadroom;
        const maxRate = Math.ceil(100.0 * d3.max(data.map(x => x.rate))) / 100.0 + rateHeadroom;
        return {
            x: d3.scaleTime()
                .domain([minDate, maxDate])
                .range([0, plot.range.x]),
            y: d3.scaleLinear()
                .domain([minRate, maxRate])
                .range([plot.range.y, 0]),
        };
    }


    /**
     * The X-axis is a horizontal line with a tick point for each year of input data.
     */
    function appendXAxis(paddingGroup, scales, plot) {
        const xAxis = d3.axisBottom().scale(scales.x);
        paddingGroup.append('g')
            .attr('transform', 'translate(0,' + plot.range.y + ')')
            .attr('class', 'xAxis')
            .call(xAxis);
    }


    /**
     * The Y-Axis is a vertical line with tick points formatted as #.## %.
     * We specify tickValues so there are no ticks at the domain endpoints (i.e. the headroom areas).
     * The effect is like Y-Axis "outer padding" to the min/max of actual input data.
     */
    function appendYAxis(paddingGroup, scales, plot) {
        const numTicks = 7;
        const tickStep = (scales.y.domain()[1] - scales.y.domain()[0] - 2 * rateHeadroom) / (numTicks - 1);
        const firstValue = scales.y.domain()[0] + rateHeadroom;
        const tickValues = [...Array(numTicks).keys()].map(i => tickStep * i + firstValue);
        const yAxis = d3.axisRight().scale(scales.y)
            .tickValues(tickValues)
            .tickFormat(d3.format('.2%'));
        paddingGroup.append('g')
            .attr('transform', 'translate(' + plot.range.x + ',0)')
            .attr('class', 'yAxis')
            .call(yAxis);
    }


    /**
     * Draws a rectangle of light color as the plot background.
     */
    function appendBackground(paddingGroup, plot) {
        paddingGroup.append('rect')
            .attr('width', plot.range.x)
            .attr('height', plot.range.y)
            .attr('class', 'background');
    }


    /**
     * Draws three border lines around the plot background: top, left, bottom borders.
     * Right border is unnecessary because the Y-Axis draws it.
     * Bottom border is longer than the X-Axis would draw it.
     * The top/bottom lines overhang to the right margin.
     * There is a +0.5px offset applied to all coordinates to line up with how D3 draws the axes.
     */
    function appendBackgroundBorderLines(paddingGroup, plot) {
        const offset = 0.5;
        paddingGroup.append('path')
            .attr('d',
                'M ' + (plot.svg.width - plot.padding.left) + ',' + offset + ' ' //top border, right endpoint
                + 'L ' + offset + ',' + offset + ' '
                + offset + ',' + (plot.range.y + offset) + ' '
                + (plot.svg.width - plot.padding.left) + ',' + (plot.range.y + offset) // bottom border, right endpoint
            )
            .attr('class', 'background-border');
    }


    /**
     * Draws a horizontal line on the plot area, in line with each Y-axis tick.
     */
    function appendBackgroundHorizontalGridLines(paddingGroup, plot) {
        const gridGroup = paddingGroup.append('g')
            .attr('class', 'grid');
        paddingGroup.selectAll('.yAxis .tick')
            .each(function(d,i) {
                const tick = d3.select(this);
                const {x, y} = extractTranslation(tick);
                gridGroup.append('line')
                    .attr('x1', 0)
                    .attr('y1', y)
                    .attr('x2', plot.range.x)
                    .attr('y2', y);
            })
    }


    /**
     * Draws a vertical line on the plot area, in line with each X-axis tick.
     *
     * Skips the initial tick line, since it would look bad just a few pixels adjacent to the later Border line.
     */
    function appendBackgroundVerticalGridLines(paddingGroup, plot) {
        const gridGroup = paddingGroup.selectAll('.grid');
        paddingGroup.selectAll('.xAxis .tick')
            .each(function(d,i) {
                if (i > 0) {
                    const tick = d3.select(this);
                    const {x, y} = extractTranslation(tick);
                    gridGroup.append('line')
                        .attr('x1', x)
                        .attr('y1', 0)
                        .attr('x2', x)
                        .attr('y2', plot.range.y);
                }
            })
    }


    /**
     * Extracts the 'translate(x,y)' attribute value and returns {x, y}.
     *
     * We have a trivial transform to parse, but - in case of more complexity - consider
     * https://stackoverflow.com/a/38230545 to convert the transform to a matrix.
     */
    function extractTranslation(selection) {
        const transform = selection.attr('transform');
        const m = transform.match(/^translate\((.*),(.*)\)$/);
        if (!m || m.length < 3) {
            throw new Error("Don't know how to parse transform: '" + transform + "'");
        }
        return { x: +m[1], y: +m[2] };
    }


    /**
     * The highlight of the chart is the rate waveform.
     */
    function appendRateWaveform(paddingGroup, data, scales) {
        paddingGroup.append('g')
            .attr('class', 'waveform')
            .append('path')
            .datum(data)
            .attr('d',
                d3.line()
                    .x(d => scales.x(d.date))
                    .y(d => scales.y(d.rate)));
    }


    /**
     * Draws bars (rectangles) to represent periods of economic recession.
     */
    function appendRecessionBars(paddingGroup, data, scales, plot) {
        const recessionPeriods = collapseRecessionPeriods(data);
        paddingGroup.selectAll()
            .data(recessionPeriods)
            .enter()
            .append('rect')
            .attr('class', 'recession')
            .attr('x', d => scales.x(d.startDate))
            .attr('y', 0)
            .attr('width', d => scales.x(d.endDate) - scales.x(d.startDate))
            .attr('height', plot.range.y);
    }


    /**
     * Convert from daily recession data to "collapsed" data which is just a sequence of begin/end dates.
     */
    function collapseRecessionPeriods(data) {
        const periods = [];
        let startDate = undefined;
        for (const i in data) {
            const datum = data[i];
            if (startDate === undefined && datum.isRecession) {
                startDate = datum.date;
            }
            else if (startDate && (!datum.isRecession || i === data.length-1)) {
                periods.push({
                    startDate: startDate,
                    endDate: datum.date
                });
                startDate = undefined;
            }
        }
        return periods;
    }


    /**
     * The legend consists of a light rectangle ("legend plate") on which we place rows consisting of a color square
     * and label to identify the waveform and recession bars.
     */
    function appendLegend(paddingGroup, plot) {
        const legendGroup = paddingGroup.append('g')
            .attr('class', 'legend');
        const waveformTextString = '10 Year Treasury Rate';
        const waveformTextWidth = chartUtils.calcTextWidth(legendGroup, waveformTextString, '');
        const area = calcLegendArea(waveformTextWidth, 2);
        legendGroup.attr('transform', 'translate('
            + (plot.range.x - area.plate.width - area.plate.margin)
            + ',' + area.plate.margin + ')');
        legendGroup.append('rect')
            .attr('class', 'legend-plate')
            .attr('width', area.plate.width)
            .attr('height', area.plate.height);
        appendLegendOneRow(legendGroup, area, 0, 'legend-waveform', waveformTextString);
        appendLegendOneRow(legendGroup, area, 1, 'legend-recession', 'Recession');
    }


    function appendLegendOneRow(legendGroup, area, rowNum, squareClass, textString) {
        legendGroup.append('rect')
            .attr('class', squareClass)
            .attr('x', area.square.x)
            .attr('y', (rowNum + 1) * area.square.margin + rowNum * area.square.width)
            .attr('width', area.square.width)
            .attr('height', area.square.width);
        legendGroup.append('text')
            .attr('x', area.square.x - area.square.margin)
            .attr('y', (rowNum + 1) * area.square.margin + area.text.fontOffset + rowNum * area.square.width)
            .text(textString);
    }


    /**
     * The legend consists of a backing plate, on which we place text and color squares.
     * The plate is sized to fit the widest legend text.
     */
    function calcLegendArea(maxTextWidth, numRows) {
        const area = {
            legend: {
                margin: 10
            },
            plate: {
                margin: 10
            },
            square: {
                margin: 5,
                width: 10
            },
            text: {
                fontOffset: 9
            }
        };
        area.plate.width = area.plate.margin + maxTextWidth + 2 * area.square.margin + area.square.width;
        area.plate.height = (numRows + 1) * area.square.margin + numRows * area.square.width;
        area.square.x = area.plate.width - area.square.width - area.square.margin;
        return area;
    }


    /**
     * Top level D3 drawing function.
     */
    function draw() {
        getData((data) => {
            const svg = d3.select('body').append('svg');
            const plot = getPlotArea();
            const paddingGroup = chartUtils.setupSvgAndPaddingGroup(svg, plot);
            const scales = makeScales(data, plot);
            appendBackground(paddingGroup, plot);
            appendXAxis(paddingGroup, scales, plot);
            appendYAxis(paddingGroup, scales, plot);
            appendBackgroundHorizontalGridLines(paddingGroup, plot);
            appendBackgroundVerticalGridLines(paddingGroup, plot);
            appendRecessionBars(paddingGroup, data, scales, plot);
            appendBackgroundBorderLines(paddingGroup, plot);
            appendRateWaveform(paddingGroup, data, scales);
            appendLegend(paddingGroup, plot);
        });
    }


    window.onload = draw;


})();

