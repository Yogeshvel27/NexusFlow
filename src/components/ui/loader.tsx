import React from 'react';

export function Loader() {
  return (
    <div className="loader-container">
      <div className="loader-wrapper">
        <div className="loader-rectangle">
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
        <p className="loader-text">
          Loading
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </p>
      </div>
    </div>
  );
}

export default Loader;
