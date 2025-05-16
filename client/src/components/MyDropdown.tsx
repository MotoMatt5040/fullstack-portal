import React from 'react';
import Select from 'react-select';

type Option = {
  value: string | number;
  label: string;
};

type Props = {
  className?: string;
  options: Option[];
  value: string | number | null;
  isDisabled?: boolean;
  onChange: (selected: Option | null) => void;
  placeholder?: string;
};

const MyDropdown: React.FC<Props> = ({
  className = 'dropdown-select',
  options,
  value,
  isDisabled = false,
  onChange,
  placeholder = 'Select...',
}) => {
  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <div className="dropdown-container">
      <Select
        className={className}
        options={options}
        value={selectedOption}
        onChange={onChange}
        isDisabled={isDisabled}
        placeholder={placeholder}
        isClearable
      />
    </div>
  );
};

export default MyDropdown;
