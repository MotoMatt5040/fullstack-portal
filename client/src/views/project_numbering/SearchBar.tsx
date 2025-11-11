import React from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const SearchBar = ({ value, onChange, onClear, placeholder, isSearching }) => {
  return (
    <div className="search-bar">
      <FaSearch className="search-icon" />
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
          <FaTimes />
        </button>
      )}
      {isSearching && <div className="search-spinner"></div>}
    </div>
  );
};

export default SearchBar;