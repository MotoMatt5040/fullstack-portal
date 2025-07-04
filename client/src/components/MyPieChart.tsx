import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import './css/MyPieChart.css';

interface PieChartData {
  [key: string]: any;
}

interface MyPieChartProps {
  data: PieChartData[];
  skip?: string[];
  domainColumn?: string;
  valueColumn?: string;
  width?: number;
  height?: number;
  radius?: number;
  colorScheme?: (t: number) => string;
  dataIsReady?: boolean;
}

const MyPieChart: React.FC<MyPieChartProps> = (props) => {
  const {
    data,
    skip = [],
    domainColumn = 'name',
    valueColumn = 'value',
    width = window.innerWidth < 768 ? 200 : 400,
    height = width,
    radius = Math.min(width, height) / 2 - 1,
    colorScheme = d3.interpolateRdYlGn,
    dataIsReady = false,
  } = props;

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Calculate responsive font sizes based on chart dimensions
  const baseFontSize = Math.max(8, Math.min(24, width * 0.055));
  const titleFontSize = baseFontSize * 1.1;
  const valueFontSize = baseFontSize * 0.85;
  const percentageFontSize = baseFontSize * 0.75;

  useEffect(() => {
    if (!dataIsReady && svgRef.current) {
      d3.select(svgRef.current).selectAll('*').remove();
    }
  }, [dataIsReady]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const filteredData = data.filter(
      (item) => !skip.includes(item.field) && item[valueColumn] > 0
    );

    const getColorForSingleSlice = (field: string) => {
      if (field === 'On CPH') return ['rgb(34, 150, 79)'];
      if (field === 'On VAR') return ['rgb(199, 231, 129)'];
      if (field === 'Off CPH') return ['rgb(254, 206, 126)'];
      if (field === 'Zero CMS') return ['rgb(212, 50, 44)'];
      return ['#000'];
    };

    const color = d3
      .scaleOrdinal()
      .domain(filteredData.map((d) => d[domainColumn]))
      .range(
        filteredData.length > 1
          ? d3
              .quantize((t) => colorScheme(t * 0.8 + 0.1), filteredData.length)
              .reverse()
          : filteredData[0] && filteredData[0][domainColumn]
          ? getColorForSingleSlice(filteredData[0][domainColumn])
          : ['#000']
      );

    const pie = d3
      .pie()
      .sort(null)
      .value((d) => d[valueColumn]);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const labelRadius = radius * 0.6;
    const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

    const arcs = pie(filteredData);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('class', 'svg-pie-chart-container')
      .style('font-size', `${baseFontSize}px`); // Set base font size on SVG

    // Remove existing text labels before updating arcs
    svg.selectAll('text').remove();

    const path = svg.selectAll('path').data(arcs, (d) => d.data[domainColumn]);

    path
      .enter()
      .append('path')
      .attr('fill', (d) => color(d.data[domainColumn]))
      .attr('stroke', 'white')
      .attr('d', arc)
      .each(function (d) {
        this._current = d;
      })
      .append('title')
      .text(
        (d) =>
          `${d.data[domainColumn]}: ${d.data[valueColumn].toLocaleString(
            'en-US'
          )}`
      )
      .merge(path)
      .transition()
      .duration(1000)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return (t) => arc(interpolate(t));
      });

    path.exit().remove();

    // Calculate minimum angle threshold for text visibility (adjust based on font size)
    const minAngleForText = Math.max(0.15, baseFontSize * 0.008);

    const text = svg
      .append('g')
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(arcs)
      .join('text')
      .attr('transform', (d) => `translate(${arcLabel.centroid(d)})`)
      .call((text) =>
        text
          .append('tspan')
          .attr('y', `-${titleFontSize * 0.3}px`) // Responsive positioning
          .attr('font-weight', 'bold')
          .attr('font-size', `${titleFontSize}px`)
          .text((d) => d.data[domainColumn])
      )
      .call((text) =>
        text
          .filter((d) => d.endAngle - d.startAngle > minAngleForText)
          .append('tspan')
          .attr('x', 0)
          .attr('y', `${valueFontSize * 0.5}px`) // Responsive positioning
          .attr('fill-opacity', 0.7)
          .attr('font-size', `${valueFontSize}px`)
          .text((d) => d.data[valueColumn].toLocaleString('en-US'))
      )
      .call((text) =>
        text
          .filter((d) => d.endAngle - d.startAngle > minAngleForText)
          .append('tspan')
          .attr('x', 0)
          .attr('y', `${baseFontSize * 1.2}px`) // Responsive positioning
          .attr('fill-opacity', 0.7)
          .attr('font-size', `${percentageFontSize}px`)
          .text((d) => {
            const percentage =
              ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
            return `${percentage.toFixed(0)}%`;
          })
      )
      .attr('opacity', 0);

    text.transition().duration(1000).attr('opacity', 1);
  }, [
    dataIsReady,
    data,
    width,
    height,
    radius,
    baseFontSize,
    titleFontSize,
    valueFontSize,
    percentageFontSize,
  ]);

  return !dataIsReady ? (
    <div className='flex items-center justify-center h-full'>
      <div className='spinner' />
    </div>
  ) : (
    <svg ref={svgRef}></svg>
  );
};

export default MyPieChart;
