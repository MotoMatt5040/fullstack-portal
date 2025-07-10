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
  colorMap?: { [key: string]: string };
  dataIsReady?: boolean;
  textOutside?: boolean;
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
    colorMap = {},
    dataIsReady = false,
    textOutside = false,
  } = props;

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Calculate the maximum usable radius based on width and height
  const maxRadius = Math.min(width, height) / 2;
  
  // Define a calculated radius that shrinks the pie if text is outside.
  // When text is outside, we need to account for label space
  const chartRadius = textOutside 
    ? maxRadius * 0.65  // 65% of available space for the pie when labels are outside
    : maxRadius * 0.9; // 90% of available space when labels are inside

  // Calculate responsive font sizes based on chart dimensions
  const baseFontSize = Math.max(10, Math.min(16, Math.min(width, height) * 0.04));
  const titleFontSize = baseFontSize * 1.1;
  const valueFontSize = baseFontSize * 0.85;
  const percentageFontSize = baseFontSize * 0.75;

  // Adjust viewBox when text is outside to show labels
  // No need for extra padding - use the actual dimensions
  const viewBoxWidth = width;
  const viewBoxHeight = height;

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
      // First check if color is defined in colorMap
      if (colorMap[field]) return [colorMap[field]];
      // Fall back to default colors
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
        filteredData.map((d) => {
          const field = d[domainColumn];
          // Check colorMap first
          if (colorMap[field]) return colorMap[field];
          // For single slice, use getColorForSingleSlice
          if (filteredData.length === 1) {
            return getColorForSingleSlice(field)[0];
          }
          // For multiple slices, use color scheme
          const index = filteredData.findIndex(item => item[domainColumn] === field);
          const t = (index / (filteredData.length - 1)) * 0.8 + 0.1;
          return colorScheme(t);
        })
      );

    const pie = d3
      .pie()
      .sort(null)
      .value((d) => d[valueColumn]);

    // Use the new chartRadius for all arc calculations
    const arc = d3.arc().innerRadius(0).outerRadius(chartRadius);

    const arcs = pie(filteredData);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('class', 'svg-pie-chart-container')
      .style('font-size', `${baseFontSize}px`);

    // --- Chart Drawing ---
    svg.selectAll('.arc-path').remove();
    svg.selectAll('.label-group').remove();

    svg
      .append('g')
      .attr('class', 'arc-path')
      .selectAll('path')
      .data(arcs, (d) => d.data[domainColumn])
      .join('path')
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
      );

    // --- Conditional Label Rendering ---
    const labelGroup = svg
      .append('g')
      .attr('class', 'label-group')
      .attr('text-anchor', 'middle');

    const minAngleForText = Math.max(0.15, baseFontSize * 0.008);

    if (textOutside) {
      // --- LOGIC FOR EXTERNAL LABELS WITH LINES ---
      const labelRadius = chartRadius * 1.3;
      const outerArc = d3
        .arc()
        .innerRadius(labelRadius)
        .outerRadius(labelRadius);

      // Function to prevent label overlap
      const preventOverlap = (labels: any[]) => {
        const labelHeight = baseFontSize * 1.5; // Approximate height of label text
        const minDistance = labelHeight;
        
        // Separate labels by side
        const leftLabels = labels.filter(l => l.midangle >= Math.PI);
        const rightLabels = labels.filter(l => l.midangle < Math.PI);
        
        // Adjust each side separately
        const adjustSide = (sideLabels: any[]) => {
          sideLabels.sort((a, b) => a.pos[1] - b.pos[1]);
          
          for (let i = 1; i < sideLabels.length; i++) {
            const prev = sideLabels[i - 1];
            const curr = sideLabels[i];
            const distance = curr.pos[1] - prev.pos[1];
            
            if (distance < minDistance) {
              curr.pos[1] = prev.pos[1] + minDistance;
            }
          }
        };
        
        adjustSide(leftLabels);
        adjustSide(rightLabels);
        
        return labels;
      };

      // Prepare label data with better positioning
      const labelData = arcs.map(d => {
        const pos = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        // Position labels closer to the pie, with a reasonable distance
        const labelDistance = Math.min(chartRadius * 1.5, maxRadius * 0.9);
        pos[0] = labelDistance * (midangle < Math.PI ? 1 : -1);
        return {
          data: d,
          pos: pos,
          midangle: midangle
        };
      });

      // Apply overlap prevention
      const adjustedLabels = preventOverlap(labelData);

      // Draw polylines
      labelGroup
        .selectAll('polyline')
        .data(adjustedLabels)
        .join('polyline')
        .attr('stroke', 'black')
        .style('fill', 'none')
        .attr('stroke-width', 1)
        .attr('points', (d) => {
          const posA = arc.centroid(d.data);
          const posB = outerArc.centroid(d.data);
          const posC = [...d.pos];
          return [posA, posB, posC];
        });

      // Draw text labels
      labelGroup
        .selectAll('text')
        .data(adjustedLabels)
        .join('text')
        .attr('transform', (d) => `translate(${d.pos})`)
        .attr('text-anchor', (d) => d.midangle < Math.PI ? 'start' : 'end')
        .attr('font-size', `${baseFontSize}px`)
        .text((d) => {
          const percentage = ((d.data.endAngle - d.data.startAngle) / (2 * Math.PI)) * 100;
          const value = d.data.data[valueColumn].toLocaleString('en-US');
          return `${d.data.data[domainColumn]}: ${value} (${percentage.toFixed(0)}%)`;
        });
    } else {
      // --- LOGIC FOR INTERNAL LABELS ---
      const labelRadius = chartRadius * 0.6;
      const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

      labelGroup
        .selectAll('text')
        .data(arcs)
        .join('text')
        .attr('transform', (d) => `translate(${arcLabel.centroid(d)})`)
        .call((text) =>
          text
            .append('tspan')
            .attr('y', `-${titleFontSize * 0.3}px`)
            .attr('font-weight', 'bold')
            .attr('font-size', `${titleFontSize}px`)
            .text((d) => d.data[domainColumn])
        )
        .call((text) =>
          text
            .filter((d) => d.endAngle - d.startAngle > minAngleForText)
            .append('tspan')
            .attr('x', 0)
            .attr('y', `${valueFontSize * 0.5}px`)
            .attr('fill-opacity', 0.7)
            .attr('font-size', `${valueFontSize}px`)
            .text((d) => d.data[valueColumn].toLocaleString('en-US'))
        )
        .call((text) =>
          text
            .filter((d) => d.endAngle - d.startAngle > minAngleForText)
            .append('tspan')
            .attr('x', 0)
            .attr('y', `${baseFontSize * 1.2}px`)
            .attr('fill-opacity', 0.7)
            .attr('font-size', `${percentageFontSize}px`)
            .text((d) => {
              const percentage =
                ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
              return `${percentage.toFixed(0)}%`;
            })
        );
    }
  }, [
    dataIsReady,
    textOutside,
    data,
    width,
    height,
    chartRadius,
    baseFontSize,
    titleFontSize,
    valueFontSize,
    percentageFontSize,
    colorScheme,
    colorMap,
    domainColumn,
    skip,
    valueColumn,
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