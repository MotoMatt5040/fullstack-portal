import React, { useState } from 'react';

interface HoverableLabelCellProps {
  className?: string;
  label: string;
  popupText: string;
  mouseEnter?: () => void;
  mouseLeave?: () => void;
  style?: React.CSSProperties;
}

const HoverableLabelCell: React.FC<HoverableLabelCellProps> = ({ className, label, popupText, mouseEnter, mouseLeave, style }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX + 10, y: e.clientY + 10 }); // add offset to avoid covering cursor
  };

  const handleMouseEnter = () => {
    setShowPopup(true);
    mouseEnter?.(); // Call external handler if provided
  };

  const handleMouseLeave = () => {
    setShowPopup(false);
    mouseLeave?.(); // Call external handler if provided
  };

  return (
    <td
      className={className ?? undefined}
      style={{ cursor: 'pointer', ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {label}
      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: mousePos.y,
            left: mousePos.x,
            backgroundColor: 'black',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 0 6px rgba(0,0,0,0.3)',
            pointerEvents: 'none', // prevent flicker if mouse overlaps popup
          }}
        >
          {popupText}
        </div>
      )}
    </td>
  );
};

export default HoverableLabelCell;
