import React from 'react';
import Select from 'react-select';

import './css/MyMultiSelect.css';

const MyMultiSelect = ({
	className = 'multi-select',
	options,
	items,
	isDisabled,
	onChange,
}) => {

	return (
		<div className='multi-select-container'>
			<Select
				className={className}
				isMulti
				options={options}
				value={items.map((id) => ({ value: id, label: id }))}
				onChange={onChange}
				closeMenuOnSelect={false}
				isDisabled={isDisabled}
			/>
		</div>
	);
};

export default MyMultiSelect;
