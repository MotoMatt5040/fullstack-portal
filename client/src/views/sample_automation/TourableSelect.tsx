import React, { useState, useRef, useEffect } from 'react';
import './TourableSelect.css';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
}

interface TourableSelectProps<T = string | number> {
  options: SelectOption<T>[];
  value: SelectOption<T> | null;
  onChange: (option: SelectOption<T> | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  isLoading?: boolean;
  className?: string;
  /** When true, keeps the menu open (for tour mode) */
  menuIsOpen?: boolean;
  /** Data attribute for tour targeting */
  dataTour?: string;
}

function TourableSelect<T = string | number>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isDisabled = false,
  isClearable = true,
  isLoading = false,
  className = '',
  menuIsOpen: controlledMenuIsOpen,
  dataTour,
}: TourableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use controlled menuIsOpen if provided, otherwise use internal state
  const menuIsOpen = controlledMenuIsOpen !== undefined ? controlledMenuIsOpen : isOpen;

  // Filter options based on search term
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Only close if not controlled
        if (controlledMenuIsOpen === undefined) {
          setIsOpen(false);
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [controlledMenuIsOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!menuIsOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (menuIsOpen && highlightedIndex >= 0) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (!menuIsOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (option: SelectOption<T>) => {
    onChange(option);
    // Only close if not controlled
    if (controlledMenuIsOpen === undefined) {
      setIsOpen(false);
    }
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const handleContainerClick = () => {
    if (!isDisabled) {
      setIsOpen(!isOpen);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`tourable-select ${className} ${isDisabled ? 'disabled' : ''} ${menuIsOpen ? 'open' : ''}`}
      data-tour={dataTour}
    >
      <div
        className="tourable-select__control"
        onClick={handleContainerClick}
      >
        <div className="tourable-select__value-container">
          {value && !searchTerm ? (
            <span className="tourable-select__single-value">{value.label}</span>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            className="tourable-select__input"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!menuIsOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={value ? '' : placeholder}
            disabled={isDisabled}
          />
        </div>
        <div className="tourable-select__indicators">
          {isLoading && <span className="tourable-select__loading">...</span>}
          {isClearable && value && !isDisabled && (
            <button
              type="button"
              className="tourable-select__clear"
              onClick={handleClear}
              aria-label="Clear"
            >
              ×
            </button>
          )}
          <span className={`tourable-select__arrow ${menuIsOpen ? 'open' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {menuIsOpen && (
        <div className="tourable-select__menu" data-tour={dataTour ? `${dataTour}-menu` : undefined}>
          <div className="tourable-select__menu-list">
            {filteredOptions.length === 0 ? (
              <div className="tourable-select__no-options">No options</div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={String(option.value)}
                  className={`tourable-select__option ${
                    value?.value === option.value ? 'selected' : ''
                  } ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TourableSelect;
