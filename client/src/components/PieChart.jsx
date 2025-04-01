import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import './css/PieChart.css';

const PieChart = (props) => {
	const data = props.data;
	const domainColumn = props.domainColumn || 'name';
	const valueColumn = props.valueColumn || 'value';
	const width = props.width || 928;
	const height = props.height || Math.min(width, 500);
	const radius = props.radius || Math.min(width, height) / 2 - 1;
	const colorScheme = props.colorScheme || d3.interpolateRdYlGn;
	const svgRef = useRef();

	useEffect(() => {
		if (!data || data.length === 0) return;

		const color = d3
			.scaleOrdinal()
			.domain(data.map((d) => d[domainColumn]))
			.range(
				d3.quantize((t) => colorScheme(t * 0.8 + 0.1), data.length).reverse()
			);

		const pie = d3
			.pie()
			.sort(null)
			.value((d) => d[valueColumn]);

		const arc = d3.arc().innerRadius(0).outerRadius(radius);

		const labelRadius = radius * 0.8;
		const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

		const arcs = pie(data);

		const svg = d3
			.select(svgRef.current)
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('class', 'svg-pie-chart-container');

		svg.selectAll('g').remove();

		svg
			.append('g')
			.attr('stroke', 'white')
			.selectAll('path')
			.data(arcs)
			.join('path')
			.attr('fill', (d) => color(d.data[domainColumn]))
			.attr('d', arc)
			.append('title')
			.text(
				(d) =>
					`${d.data[domainColumn]}: ${d.data[valueColumn].toLocaleString(
						'en-US'
					)}`
			);

		svg
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
						return `${percentage.toFixed(1)}%`; // Show percentage with one decimal point
					})
			);
	}, [data]);

	// useEffect(() => {
	//   if (!data || data.length === 0) return;

	//   const color = d3.scaleOrdinal()
	//     .domain(data.map(d => d[domainColumn]))
	//     .range(d3.quantize(t => colorScheme(t * 0.8 + 0.1), data.length).reverse());

	//   const pie = d3.pie()
	//     .sort(null)
	//     .value(d => d[valueColumn]);

	//   const arc = d3.arc()
	//     .innerRadius(0)
	//     .outerRadius(radius);

	//   const labelRadius = radius * 0.8;
	//   const arcLabel = d3.arc()
	//     .innerRadius(labelRadius)
	//     .outerRadius(labelRadius);

	//   const arcs = pie(data);

	//   const svg = d3.select(svgRef.current);

	//   const paths = svg.selectAll("path")
	//     .data(arcs, d => d.data[domainColumn]);  // Use a key function to track elements

	//   // Handle new paths (new data)
	//   paths.enter().append("path")
	//     .attr("fill", d => color(d.data[domainColumn]))
	//     .attr("d", arc)
	//     .append("title")
	//     .text(d => `${d.data[domainColumn]}: ${d.data[valueColumn].toLocaleString("en-US")}`);

	//   // Handle path updates (transitions)
	//   paths.transition().duration(500)
	//     .attr("fill", d => color(d.data[domainColumn]))
	//     .attr("d", arc)
	//     .select("title")
	//     .text(d => `${d.data[domainColumn]}: ${d.data[valueColumn].toLocaleString("en-US")}`);

	//   // Handle path removals (data removed)
	//   paths.exit().transition().duration(500)
	//     .attr("d", d3.arc().innerRadius(0).outerRadius(0)) // Shrink arc to disappear
	//     .remove();

	//   // Handle label updates (adding/removing labels)
	//   const labels = svg.selectAll("text")
	//     .data(arcs, d => d.data[domainColumn]);  // Use a key function to track labels

	//   // Handle new labels (new data)
	//   labels.enter().append("text")
	//     .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
	//     .attr("text-anchor", "middle")
	//     .call(text => text.append("tspan")
	//       .attr("y", "-0.4em")
	//       .attr("font-weight", "bold")
	//       .text(d => d.data[domainColumn]))
	//     .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25)
	//       .append("tspan")
	//       .attr("x", 0)
	//       .attr("y", "0.7em")
	//       .attr("fill-opacity", 0.7)
	//       .text(d => d.data[valueColumn].toLocaleString("en-US")));

	//   // Handle label updates (transitions)
	//   labels.transition().duration(500)
	//     .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
	//     .call(text => text.select("tspan")
	//       .text(d => d.data[domainColumn]))
	//     .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25)
	//       .select("tspan")
	//       .attr("fill-opacity", 0.7)
	//       .text(d => d.data[valueColumn].toLocaleString("en-US")));

	//   // Handle label removals (data removed)
	//   labels.exit().transition().duration(500)
	//     .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
	//     .remove();

	// }, [data]);

	return <svg ref={svgRef}></svg>;
};

export default PieChart;
