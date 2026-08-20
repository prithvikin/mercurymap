import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-200 shadow-card ${className}`}
  >
    {children}
  </div>
);

export default Card;
