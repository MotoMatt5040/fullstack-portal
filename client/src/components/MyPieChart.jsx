import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import './css/MyPieChart.css';

const MyPieChart = (props) => {
	const data = props.data;
	const skip = props.skip || [];
	const domainColumn = props.domainColumn || 'name';
	const valueColumn = props.valueColumn || 'value';
	const width = props.width || 400;
	const height = props.height || Math.min(width, 400);
	const radius = props.radius || Math.min(width, height) / 2 - 1;
	const colorScheme = props.colorScheme || d3.interpolateRdYlGn;
	const svgRef = useRef();

	useEffect(() => {
		if (!data || data.length === 0) return;
		const filteredData = data.filter(item => !skip.includes(item.field));
	
		const color = d3
			.scaleOrdinal()
			.domain(filteredData.map((d) => d[domainColumn]))
			.range(
				d3.quantize((t) => colorScheme(t * 0.8 + 0.1), filteredData.length).reverse()
			);
	
		const pie = d3
			.pie()
			.sort(null)
			.value((d) => d[valueColumn]);
	
		const arc = d3.arc().innerRadius(0).outerRadius(radius);
	
		const labelRadius = radius * 0.7;
		const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);
	
		const arcs = pie(filteredData);
	
		const svg = d3
			.select(svgRef.current)
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('class', 'svg-pie-chart-container');
	
		// Remove existing text labels before updating arcs
		svg.selectAll('text').remove();
	
		const path = svg
			.selectAll('path')
			.data(arcs, (d) => d.data[domainColumn]);
	
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
					`${d.data[domainColumn]}: ${d.data[valueColumn].toLocaleString('en-US')}`
			)
			.merge(path)
			.transition()
			.duration(1000)
			.attrTween('d', function (d) {
				const interpolate = d3.interpolate(this._current, d);
				this._current = interpolate(1); // Update stored angles
				return (t) => arc(interpolate(t));
			});
	
		path.exit().remove();
	
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
					.attr('y', '-0.4em')
					.attr('font-weight', 'bold')
					.text((d) => d.data[domainColumn])
			)
			.call((text) =>
				text
					.filter((d) => d.endAngle - d.startAngle > 0.25)
					.append('tspan')
					.attr('x', 0)
					.attr('y', '0.7em')
					.attr('fill-opacity', 0.7)
					.text((d) => d.data[valueColumn].toLocaleString('en-US'))
			)
			.call((text) =>
				text
					.filter((d) => d.endAngle - d.startAngle > 0.25)
					.append('tspan')
					.attr('x', 0)
					.attr('y', '1.6em')
					.attr('fill-opacity', 0.7)
					.text((d) => {
						const percentage =
							((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
						return `${percentage.toFixed(1)}%`;
					})
			)
			.attr('opacity', 0);
	
		text.transition().duration(1000).attr('opacity', 1);
	}, [data]);

	return <svg ref={svgRef}></svg>;
};

export default MyPieChart;
