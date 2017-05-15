import { arc, easeLinear, select } from 'd3'
import { schemePaired } from 'd3-scale-chromatic'
import './gauge.css'

import { Gauge } from './gauge-interface'
import { Needle } from './needle'
import { paramChecker } from './param-checker'


/**
 * Function that checks whether the number of colors is enough for drawing specified delimiters.
 * Adds standard colors if not enough or cuts the array if there are too many of them.
 * @param arcDelimiters - array of delimiters.
 * @param arcColors - array of colors (strings).
 * @returns modified list of colors.
 */
export function arcColorsModifier(arcDelimiters: number[], arcColors: string[]) {
  if (arcDelimiters.length > arcColors.length - 1) {
    let colorDiff = arcDelimiters.length - arcColors.length + 1
    for (let i = 0; i < colorDiff; i++) {
      arcColors.push(schemePaired[i % schemePaired.length])
    }
  } else if (arcDelimiters.length < arcColors.length - 1) {
    arcColors = arcColors.slice(0, arcDelimiters.length + 1)
  }

  return arcColors
}

/**
 * Function that checks whether value that needle points at is between 0 and 100.
 * If it is less than 0 or larger than 100, value is equated to 0 and 100 respectively.
 * @param needleValue - value at which needle points.
 * @returns modified needleValue.
 */
export function needleValueModifier(needleValue: number) {
  return needleValue < 0 ? 0 : needleValue > 100 ? 100 : needleValue
}

/**
 * Function that converts value in degrees into radians.
 * @param deg - value in degrees.
 * @returns value in radians.
 */
export function perc2RadWithShift(perc: number) {
  return (perc / 100 - 0.5) * Math.PI
}

/**
 * Function for drawing gauge arc.
 * @param svg - original svg rectangle.
 * @param chartHeight - height of gauge.
 * @param arcColors - array of colors.
 * @param outerRadius - outter radius of gauge.
 * @param arcDelimiters - array of delimiters in percentage.
 * @returns modified svg.
 */
export function arcOutline(svg, chartHeight: number, offset: number, arcColors: string[],
                        outerRadius: number, arcDelimiters: number[]) {
  arcColors.forEach((color, i) => {
    let gaugeArc = arc()
      .innerRadius(chartHeight)
      .outerRadius(outerRadius)
      .startAngle(i ? perc2RadWithShift(arcDelimiters[i - 1]) : perc2RadWithShift(0))
      .endAngle(perc2RadWithShift(arcDelimiters[i] || 100))  // 100 for last arc slice

    let innerArc = svg.append('path')
      .attr('d', gaugeArc)
      .attr('fill', color)
      .attr('transform', 'translate(' + (chartHeight + offset * 2) + ', '
                                            + (chartHeight + offset) + ')')

    gaugeArc = arc()
      .innerRadius(chartHeight)
      .outerRadius(chartHeight + chartHeight * 0.1)
      .startAngle(i ? perc2RadWithShift(arcDelimiters[i - 1]) : perc2RadWithShift(0))
      .endAngle(perc2RadWithShift(arcDelimiters[i] || 100))  // 100 for last arc slice

    let outerArc = svg.append('path')
      .attr('d', gaugeArc)
      .attr('fill', 'transparent')
      .attr('opacity', '0.2')
      .attr('transform', 'translate(' + (chartHeight + offset * 2) + ', '
                                            + (chartHeight + offset) + ')')

    innerArc
      .on('mouseover', () => {
        innerArc.style('opacity', 0.8)
        outerArc
          .transition()
          .duration(50)
          .ease(easeLinear)
          .attr('fill', color)
      })
      .on('mouseout', () => {
        innerArc.style('opacity', 1)
        outerArc
          .transition()
          .duration(300)
          .ease(easeLinear)
          .attr('fill', 'transparent')
      })
  })
}

/**
 * Function for drawing needle base.
 * @param svg - original svg rectangle.
 * @param chartHeight - height of gauge.
 * @param needleColor - color of a needle.
 * @param centralLabel - value of the central label.
 * @returns modified svg.
 */
export function needleBaseOutline(svg, chartHeight: number, offset: number,
                           needleColor: string, centralLabel: string) {
  // Different circle radiuses in the base of needle
  let innerGaugeRadius = centralLabel ? chartHeight * 0.5 : chartHeight * 0.1
  let gaugeArc = arc()
      .innerRadius(innerGaugeRadius)
      .outerRadius(0)
      .startAngle(perc2RadWithShift(0))
      .endAngle(perc2RadWithShift(200))

  // White needle base if something should be written on it, gray otherwise
  svg.append('path')
    .attr('d', gaugeArc)
    .attr('fill', centralLabel ? 'white' : needleColor)
    .attr('transform', 'translate(' + (chartHeight + offset * 2) + ', '
                                          + (chartHeight + offset) + ')')
    .attr('class', 'bar')
}

/**
 * Function for drawing needle.
 * @param svg - original svg rectangle.
 * @param chartHeight - height of gauge.
 * @param needleColor - color of needle.
 * @param outerRadius - outer radius of gauge.
 * @param needleValue - value at which needle points.
 * @param centralLabel - value of the central label.
 * @returns modified svg.
 */
export function needleOutline(svg, chartHeight: number, offset: number, needleColor: string,
                        outerRadius: number, centralLabel: string) {
  let needleValue = 0
  let needle = new Needle(svg, needleValue, centralLabel, chartHeight,
                               outerRadius, offset, needleColor)
  needle.setValue(needleValue)
  needle.getSelection()

  return needle
}

/**
 * Function for drawing labels.
 * @param svg - original svg rectangle.
 * @param chartHeight - height of gauge.
 * @param outerRadius - outer radius of gauge.
 * @param rangeLabel - range labels of gauge.
 * @param centralLabel - value of the central label.
 * @returns modified svg.
 */
export function labelOutline(svg, areaWidth: number, chartHeight: number, offset: number,
                        outerRadius: number, rangeLabel: string[], centralLabel: string) {
  let arcWidth = chartHeight - outerRadius

  // Fonts specification (responsive to chart size)
  let rangeLabelFontSize = Math.round(chartHeight * 0.18)
  let realRangeFontSize = rangeLabelFontSize * 0.6 // counted empirically
  let centralLabelFontSize = rangeLabelFontSize * 1.5
  let realCentralFontSize = centralLabelFontSize * 0.56

  // Offsets specification (responsive to chart size)
  let leftRangeLabelOffsetX = rangeLabel[0]
    ? areaWidth / 2 - outerRadius - arcWidth / 2 - realRangeFontSize * rangeLabel[0].length / 2
    : 0
  let rightRangeLabelOffsetX = rangeLabel[1]
    ? areaWidth / 2 + outerRadius + arcWidth / 2 - realRangeFontSize * rangeLabel[1].length / 2
    : 0
  let rangeLabelOffsetY = offset + chartHeight + realRangeFontSize * 2
  let centralLabelOffsetX = areaWidth / 2 - realCentralFontSize * centralLabel.length / 2
  let centralLabelOffsetY = offset + chartHeight

  svg.append('text')
    .attr('x', leftRangeLabelOffsetX)
    .attr('y', rangeLabelOffsetY)
    .text(rangeLabel ? rangeLabel[0] : '')
    .attr('font-size', rangeLabelFontSize + 'px')
    .attr('font-family', 'Roboto,Helvetica Neue,sans-serif')

  svg.append('text')
    .attr('x', rightRangeLabelOffsetX)
    .attr('y', rangeLabelOffsetY)
    .text(rangeLabel ? rangeLabel[1] : '')
    .attr('font-size', rangeLabelFontSize + 'px')
    .attr('font-family', 'Roboto,Helvetica Neue,sans-serif')

  svg.append('text')
    .attr('x', centralLabelOffsetX)
    .attr('y', centralLabelOffsetY)
    .text(centralLabel)
    .attr('font-size', centralLabelFontSize + 'px')
    .attr('font-family', 'Roboto,Helvetica Neue,sans-serif')
}

/**
 * Function for drawing gauge.
 * @param chartWidth: number - width of gauge.
 * @param needleValue: number - value at which an arrow points.
 * @param gaugeOptions?: string[] - object of optional parameters.
 */
export function gaugeChart(element: HTMLElement, areaWidth: number,
                           gaugeOptions: GaugeOptions): GaugeInterface {
  let defaultGaugeOption = {
    hasNeedle: false,
    needleColor: 'gray',
    needleUpdateSpeed: 1000,
    arcColors: [],
    arcDelimiters: [],
    rangeLabel: [],
    centralLabel: '',
  }
  let {hasNeedle, needleColor, needleUpdateSpeed, arcColors, arcDelimiters,
       rangeLabel, centralLabel} = Object.assign(defaultGaugeOption, gaugeOptions)
  if (!paramChecker(arcDelimiters, arcColors, rangeLabel)) {
    return
  }

  arcColors = arcColorsModifier(arcDelimiters, arcColors)

  let offset = areaWidth * 0.05
  let chartHeight = areaWidth * 0.5 - offset * 2
  let chartWidth = areaWidth - offset * 2
  let outerRadius = chartHeight * 0.75
  let svg = select(element).append('svg')
                  .attr('width', chartWidth + offset * 2)
                  .attr('height', chartHeight + offset * 4)

  let needle = null
  if (hasNeedle) {
    needle = needleOutline(svg, chartHeight, offset, needleColor, outerRadius, centralLabel)
    needleBaseOutline(svg, chartHeight, offset, needleColor, centralLabel)
  }
  arcOutline(svg, chartHeight, offset, arcColors, outerRadius, arcDelimiters)
  labelOutline(svg, areaWidth, chartHeight, offset, outerRadius, rangeLabel, centralLabel)

  return new Gauge(svg, needleUpdateSpeed, needle)
}
