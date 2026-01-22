import React, { useMemo } from 'react';
import Select, { MultiValue } from 'react-select';

import './css/MyMultiSelect.css';

type Option = {
  value: number | string;
  label: string;
};

type Props = {
  className?: string;
  options: Option[];
  items: (number | string)[];
  isDisabled?: boolean;
  onChange: (selected: MultiValue<Option>) => void;
};

const MyMultiSelect: React.FC<Props> = ({
  className = 'multi-select',
  options,
  items,
  isDisabled = false,
  onChange,
}) => {
  const selectedValues = useMemo(
    () => items.map((id) => ({
      value: id,
      label: typeof id === 'string' ? id : id.toString(),
    })),
    [items]
  );

  return (
    <div className='multi-select-container'>
      <Select
        className={className}
        isMulti
        options={options}
        value={selectedValues}
        onChange={onChange}
        closeMenuOnSelect={false}
        isDisabled={isDisabled}
      />
    </div>
  );
};

export default React.memo(MyMultiSelect);
