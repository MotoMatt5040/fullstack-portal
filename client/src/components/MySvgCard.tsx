import React from 'react';
import './css/MyCard.css';

type Props = {
	leftTitle?: string;
	centerTitle?: string;
	rightTitle?: string;
	svg: React.ReactElement<SVGElement>;
};

const MySvgCard = ({ leftTitle, centerTitle, rightTitle, svg }: Props) => {
	return (
		<div className='card'>
			<span className='card-title-span'>
				<h2 className='left'>{leftTitle}</h2>
				<h2 className='center'>{centerTitle}</h2>
				<h2 className='right'>{rightTitle}</h2>
			</span>

			<span className='border-line-span' />
			<div className='card-content'>{svg}</div>
		</div>
	);
};

export default MySvgCard;
