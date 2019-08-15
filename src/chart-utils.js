/**
 * Common functions shared by the D3 chart scripts.
 */
const chartUtils = {

    /**
     * Sets the svg width/height and inserts a group with padding specified by the input plot object.
     */
    setupSvgAndPaddingGroup: (svg, plot) => {
        svg.attr('width', plot.svg.width + 'px')
            .attr('height', plot.svg.height + 'px');
        const paddingGroup = svg.append('g')
            .attr('transform', 'translate(' + plot.padding.left + ',' + plot.padding.top + ')');
        return paddingGroup;
    },


    /**
     * Draws a hidden text element with the given string and class, and returns the computed pixel width.
     *
     * This element is only for computing length prior to rendering.  So we'll place it out of the SVG viewPort,
     * where it can't be seen, rather than hide it with display:none, which would lead to computed length = 0.
     */
    calcTextWidth: (group, textString, textClass) => {
        const textElement = group.append('text')
            .attr('class', textClass)
            .attr('x', -99999)
            .text(textString);
        return textElement.node().getComputedTextLength();
    }

};

