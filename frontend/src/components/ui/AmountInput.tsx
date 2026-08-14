import React, { useState, useEffect } from 'react';

interface AmountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  onChangeAmount: (val: number) => void;
}

export const AmountInput: React.FC<AmountInputProps> = ({ value, onChangeAmount, className, ...props }) => {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (num: number | string) => {
    if (num === null || num === undefined || num === '' || num === 0) return '';
    let str = num.toString();
    if (str.length > 1 && str.startsWith('0') && !str.startsWith('0.')) {
      str = str.replace(/^0+/, '');
    }
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  };

  useEffect(() => {
    // Only update display value if it differs from current parsed value 
    // to prevent cursor jumping while typing
    const parsedDisplay = parseFloat(displayValue.replace(/\s/g, ''));
    if (value === 0) {
      if (displayValue !== '') setDisplayValue('');
    } else if (value !== parsedDisplay && !isNaN(value)) {
      setDisplayValue(formatNumber(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/[^\d.]/g, '');
    
    if (rawValue.length > 1 && rawValue.startsWith('0') && !rawValue.startsWith('0.')) {
      rawValue = rawValue.replace(/^0+/, '');
    }

    // Prevent multiple dots
    const dotParts = rawValue.split('.');
    if (dotParts.length > 2) {
      rawValue = dotParts[0] + '.' + dotParts.slice(1).join('');
    }

    setDisplayValue(formatNumber(rawValue));

    const parsed = parseFloat(rawValue);
    onChangeAmount(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={className || 'glass-input w-full'}
      {...props}
    />
  );
};
