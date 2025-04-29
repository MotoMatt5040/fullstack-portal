import React from 'react';
import './css/MyCard.css';

type Props<T> = {
	title: string;
	data: T;
	columnKeyMap: Record<string, keyof T>;
};

const MyDataCard = <T extends Record<string, any>>({
	title,
	data,
	columnKeyMap,
}: Props<T>) => {
	return (
		<div className='card'>
			<h2 className='card-title'>{title}</h2>
			<span className='border-line-span' />
			<div className='card-content'>
				{Object.entries(columnKeyMap).map(([displayName, key]) => (
					<p key={displayName}>
						<b>{displayName}:</b> {data[key]}
					</p>
				))}
			</div>
		</div>
	);
};

export default MyDataCard;
