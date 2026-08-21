import React from 'react';
import PhoneInputLib from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, className, placeholder }) => {
  return (
    <div className={`phone-input-wrapper ${className || ''}`}>
      <PhoneInputLib
        international
        defaultCountry="TG" // Togo by default, easily changeable
        value={value}
        onChange={(val: any) => onChange(val || '')}
        className="glass-input w-full text-sm flex items-center"
        placeholder={placeholder || 'Numéro de téléphone'}
      />
    </div>
  );
};
