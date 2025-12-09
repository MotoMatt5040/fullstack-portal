import React, { useState, useRef, useEffect } from 'react';
import Icon from '@mdi/react';
import { mdiViewColumn, mdiCheck, mdiEye, mdiEyeOff } from '@mdi/js';
import './css/ColumnVisibilityDropdown.css';

interface ColumnVisibilityDropdownProps {
  columns: { key: string; label: string }[];
  visibility: Record<string, boolean>;
  onToggle: (columnKey: string) => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  columns,
  visibility,
  onToggle,
  onShowAll,
  onHideAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const visibleCount = columns.filter((col) => visibility[col.key] !== false).length;

  return (
    <div className="column-visibility-dropdown" ref={dropdownRef}>
      <button
        className="column-visibility-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle column visibility"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon path={mdiViewColumn} size={0.8} />
        <span>Columns</span>
        <span className="column-count">{visibleCount}/{columns.length}</span>
      </button>

      {isOpen && (
        <div className="column-visibility-menu" role="menu">
          <div className="column-visibility-header">
            <span>Show/Hide Columns</span>
            <div className="column-visibility-actions">
              {onShowAll && (
                <button
                  className="column-visibility-action"
                  onClick={onShowAll}
                  title="Show all columns"
                >
                  <Icon path={mdiEye} size={0.6} />
                </button>
              )}
              {onHideAll && (
                <button
                  className="column-visibility-action"
                  onClick={onHideAll}
                  title="Hide all columns"
                >
                  <Icon path={mdiEyeOff} size={0.6} />
                </button>
              )}
            </div>
          </div>
          <div className="column-visibility-list">
            {columns.map((column) => {
              const isVisible = visibility[column.key] !== false;
              return (
                <button
                  key={column.key}
                  className={`column-visibility-item ${isVisible ? 'visible' : ''}`}
                  onClick={() => onToggle(column.key)}
                  role="menuitemcheckbox"
                  aria-checked={isVisible}
                >
                  <span className="column-visibility-checkbox">
                    {isVisible && <Icon path={mdiCheck} size={0.6} />}
                  </span>
                  <span className="column-visibility-label">{column.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityDropdown;
