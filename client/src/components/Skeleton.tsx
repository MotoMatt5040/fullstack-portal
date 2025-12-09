import React from 'react';
import './css/Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton text line
 */
interface SkeletonTextProps extends SkeletonProps {
  lines?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  size = 'md',
  width,
  className = '',
  style = {},
}) => {
  const sizeClass = size === 'sm' ? 'skeleton-text-sm' : size === 'lg' ? 'skeleton-text-lg' : '';

  if (lines === 1) {
    return (
      <div
        className={`skeleton skeleton-text ${sizeClass} ${className}`}
        style={{ width, ...style }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="skeleton-container" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton skeleton-text ${sizeClass} ${className}`}
          style={{
            width: i === lines - 1 ? '70%' : width || '100%',
            ...style,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton avatar/circle
 */
interface SkeletonAvatarProps extends SkeletonProps {
  size?: 'sm' | 'md' | 'lg';
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'md',
  className = '',
  style = {},
}) => {
  const sizeClass =
    size === 'sm'
      ? 'skeleton-avatar-sm'
      : size === 'lg'
      ? 'skeleton-avatar-lg'
      : 'skeleton-avatar';

  return (
    <div
      className={`skeleton ${sizeClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton button
 */
export const SkeletonButton: React.FC<SkeletonProps> = ({
  width = 100,
  height = 38,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`skeleton skeleton-button ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton table with customizable rows and columns
 */
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}) => {
  return (
    <div className={`skeleton-table ${className}`} aria-hidden="true">
      {showHeader && (
        <div className="skeleton-table-header">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="skeleton skeleton-table-header-cell" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="skeleton skeleton-table-cell"
              style={{ width: colIndex === 0 ? '15%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton metric card (for dashboard)
 */
export const SkeletonMetricCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`skeleton-metric-card ${className}`} aria-hidden="true">
      <div className="skeleton skeleton-metric-icon" />
      <div className="skeleton skeleton-metric-value" />
      <div className="skeleton skeleton-metric-label" />
    </div>
  );
};

/**
 * Skeleton card wrapper
 */
interface SkeletonCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`skeleton-card ${className}`} aria-hidden="true">
      {children}
    </div>
  );
};

export default Skeleton;
