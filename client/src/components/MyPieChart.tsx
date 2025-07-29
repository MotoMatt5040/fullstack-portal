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

  // Calculate responsive font sizes based on chart dimensions - increased for better readability
  const baseFontSize = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));
  const titleFontSize = baseFontSize * 1.3;
  const valueFontSize = baseFontSize * 1.0;
  const percentageFontSize = baseFontSize * 0.9;

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

    // Color scale setup
    const getColorForSingleSlice = (field: string) => {
      if (colorMap[field]) return [colorMap[field]];
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
          if (colorMap[field]) return colorMap[field];
          if (filteredData.length === 1) {
            return getColorForSingleSlice(field)[0];
          }
          const index = filteredData.findIndex(item => item[domainColumn] === field);
          const t = (index / (filteredData.length - 1)) * 0.8 + 0.1;
          return colorScheme(t);
        })
      );

    const pie = d3
      .pie<any>()
      .sort(null)
      .value((d) => d[valueColumn]);

    const arc = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(chartRadius);

    const labelArc = d3.arc<any>()
      .innerRadius(chartRadius * 1.4)
      .outerRadius(chartRadius * 1.4);

    const arcs = pie(filteredData);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('class', 'svg-pie-chart-container')
      .style('font-size', `${baseFontSize}px`);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Create hover arc for expanded effect
    const hoverArc = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(chartRadius * 1.08);

    // Draw pie slices with hover effects
    g.selectAll('.arc')
      .data(arcs)
      .join('path')
      .attr('class', 'arc')
      .attr('d', arc)
      .attr('fill', (d) => color(d.data[domainColumn]))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function(event, d) {
        // Calculate offset to "pop out" the slice
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        const offsetDistance = 8;
        const offsetX = Math.cos(midAngle - Math.PI / 2) * offsetDistance;
        const offsetY = Math.sin(midAngle - Math.PI / 2) * offsetDistance;
        
        d3.select(this)
          .transition()
          .duration(200)
          .ease(d3.easeBackOut.overshoot(1.2))
          .attr('d', hoverArc)
          .attr('transform', `translate(${offsetX}, ${offsetY})`)
          .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))');
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .ease(d3.easeBackIn)
          .attr('d', arc)
          .attr('transform', 'translate(0, 0)')
          .style('filter', 'none');
      })
      .append('title')
      .text((d) => 
        `${d.data[domainColumn]}: ${d.data[valueColumn].toLocaleString('en-US')}`
      );

    if (textOutside) {
      // D3's built-in approach for external labels
      const labelRadius = chartRadius * 1.3;
      const outerArc = d3.arc<any>()
        .innerRadius(labelRadius)
        .outerRadius(labelRadius);
      
      // Create label data using D3's standard positioning
      const labelData = arcs.map(d => {
        const pos = outerArc.centroid(d);
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = chartRadius * 1.5 * (midAngle < Math.PI ? 1 : -1);
        
        return {
          arc: d,
          pos: pos,
          midAngle: midAngle
        };
      });

      // D3's collision detection - separate by side and adjust vertically
      const leftLabels = labelData.filter(d => d.midAngle >= Math.PI);
      const rightLabels = labelData.filter(d => d.midAngle < Math.PI);

      const adjustLabels = (labels: any[]) => {
        labels.sort((a, b) => a.pos[1] - b.pos[1]);
        const labelHeight = baseFontSize * 1.5;
        
        for (let i = 1; i < labels.length; i++) {
          if (labels[i].pos[1] - labels[i-1].pos[1] < labelHeight) {
            labels[i].pos[1] = labels[i-1].pos[1] + labelHeight;
          }
        }
      };

      adjustLabels(leftLabels);
      adjustLabels(rightLabels);

      const allLabels = [...leftLabels, ...rightLabels];

      // Draw smooth curved lines
      g.selectAll('.label-line')
        .data(allLabels)
        .join('path')
        .attr('class', 'label-line')
        .attr('stroke', 'var(--text-color)')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .style('fill', 'none')
        .style('stroke-linecap', 'round')
        .attr('d', (d) => {
          // Calculate the point on the outer edge of the pie chart
          const midAngle = d.arc.startAngle + (d.arc.endAngle - d.arc.startAngle) / 2;
          const outerEdgePoint = [
            Math.cos(midAngle - Math.PI / 2) * chartRadius,
            Math.sin(midAngle - Math.PI / 2) * chartRadius
          ];
          
          // Intermediate control point for smooth curve
          const controlRadius = chartRadius * 1.15;
          const controlPoint = [
            Math.cos(midAngle - Math.PI / 2) * controlRadius,
            Math.sin(midAngle - Math.PI / 2) * controlRadius
          ];
          
          const finalPoint = d.pos;
          
          // Create a smooth quadratic curve
          return `M ${outerEdgePoint[0]},${outerEdgePoint[1]} Q ${controlPoint[0]},${controlPoint[1]} ${finalPoint[0]},${finalPoint[1]}`;
        });

      // Draw label text
      g.selectAll('.label-text')
        .data(allLabels)
        .join('text')
        .attr('class', 'label-text')
        .attr('transform', (d) => `translate(${d.pos})`)
        .attr('text-anchor', (d) => d.midAngle < Math.PI ? 'start' : 'end')
        .attr('font-size', `${baseFontSize}px`)
        .attr('fill', 'var(--text-color)')
        .text((d) => {
          const percentage = ((d.arc.endAngle - d.arc.startAngle) / (2 * Math.PI)) * 100;
          const value = d.arc.data[valueColumn].toLocaleString('en-US');
          return `${d.arc.data[domainColumn]}: ${value} (${percentage.toFixed(1)}%)`;
        });

    } else {
      const labelRadius = chartRadius * 0.65;
      const arcLabel = d3.arc<any>().innerRadius(labelRadius).outerRadius(labelRadius);
      const minAngleForText = Math.max(0.12, baseFontSize * 0.006); 

      g.selectAll('.label-text')
        .data(arcs)
        .join('text')
        .attr('class', 'label-text')
        .attr('transform', (d) => `translate(${arcLabel.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-color)')
        .style('font-weight', '600')
        .each(function(d) {
          const text = d3.select(this);
          
          text.append('tspan')
            .attr('y', `-${titleFontSize * 0.2}px`)
            .attr('font-weight', 'bold')
            .attr('font-size', `${titleFontSize}px`)
            .text(d.data[domainColumn]);
          
          if (d.endAngle - d.startAngle > minAngleForText) {
            text.append('tspan')
              .attr('x', 0)
              .attr('y', `${valueFontSize * 0.6}px`)
              .attr('fill-opacity', 0.9)
              .attr('font-size', `${valueFontSize}px`)
              .attr('font-weight', '500')
              .text(d.data[valueColumn].toLocaleString('en-US'));
          }
          
          if (d.endAngle - d.startAngle > minAngleForText) {
            const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
            text.append('tspan')
              .attr('x', 0)
              .attr('y', `${baseFontSize * 1.4}px`)
              .attr('fill-opacity', 0.85) 
              .attr('font-size', `${percentageFontSize}px`)
              .attr('font-weight', '500')
              .text(`${percentage.toFixed(0)}%`);
          }
        });
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