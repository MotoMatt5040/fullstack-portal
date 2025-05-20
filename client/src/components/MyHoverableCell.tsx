import React, { useState } from 'react';

interface HoverableLabelCellProps {
  label: string;
  popupText: string;
}

const HoverableLabelCell: React.FC<HoverableLabelCellProps> = ({ label, popupText }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX + 10, y: e.clientY + 10 }); // add offset to avoid covering cursor
  };

  return (
    <td
      style={{ cursor: 'pointer'}}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
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
