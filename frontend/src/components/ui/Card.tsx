import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children: React.ReactNode;
};

// Spreads the remaining div props so callers can attach landmark wiring
// (aria-labelledby, id) without a second wrapper element.
const Card: React.FC<CardProps> = ({ className = '', children, ...rest }) => (
  <div
    className={`bg-white rounded-2xl border border-sand-200 shadow-card ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
