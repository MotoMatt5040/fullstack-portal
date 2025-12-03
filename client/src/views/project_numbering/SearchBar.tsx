import React from 'react';
import Icon from '@mdi/react';
import { mdiMagnify, mdiClose } from '@mdi/js';

const SearchBar = ({ value, onChange, onClear, placeholder, isSearching }) => {
  return (
    <div className="search-bar">
      <span className="search-icon">
        <Icon path={mdiMagnify} size={0.8} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
      {value && (
        <button
          className="search-clear"
          onClick={onClear}
          title="Clear search"
        >
          <Icon path={mdiClose} size={0.7} />
        </button>
      )}
      {isSearching && <div className="search-spinner"></div>}
    </div>
  );
};

export default SearchBar;
