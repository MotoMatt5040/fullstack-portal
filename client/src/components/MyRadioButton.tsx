import React from 'react';

import './css/MyRadioButton.css'; 

type Props = {
  groupName?: string;
  labels: string[]; 
  values: (string | number)[]; 
  useIndex?: boolean;
  selectedValue: string | number; 
  onChange: (value: string | number) => void; 
};

const MyRadioButton = ({ groupName, labels, values, useIndex = false, selectedValue, onChange }: Props) => {

  return (
    <div className='radio-button-group'>
      {labels.map((label, index) => {
        const value = useIndex ? index : values[index]; 
        const isSelected = selectedValue === value; 

        return (
          <label key={index} className={`radio-button ${isSelected ? 'active' : ''}`}>
            <input
              type='radio'
              name='groupName'
              value={value}
              checked={isSelected}
              onChange={() => onChange(value)} 
            />
            {label}
          </label>
        );
      })}
    </div>
  );
};

export default MyRadioButton;
