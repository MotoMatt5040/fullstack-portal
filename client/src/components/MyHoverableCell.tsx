import React, { useState } from 'react';

interface HoverableLabelCellProps {
  label: string;
  popupText: string;
}

const HoverableLabelCell: React.FC<HoverableLabelCellProps> = ({ label, popupText }) => {
  const [showPopup, setShowPopup] = React.useState(false);

  return (
    <td
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      {label}
      {showPopup && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: 'black',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            zIndex: 10,
            marginTop: '4px',
            boxShadow: '0 0 6px rgba(0,0,0,0.3)',
          }}
        >
          {popupText}
        </div>
      )}
    </td>
  );
};

export default HoverableLabelCell;
