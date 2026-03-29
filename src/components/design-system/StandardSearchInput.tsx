import React from 'react';
import { Search } from 'lucide-react';

interface StandardSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StandardSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  className,
  style,
}: StandardSearchInputProps) {
  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <Search
        size={18}
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: disabled ? '#9CA3AF' : '#667085',
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          height: '40px',
          padding: '10px 12px 10px 40px',
          border: '1px solid #E5E9F0',
          borderRadius: '8px',
          fontSize: '14px',
          outline: 'none',
          color: disabled ? '#9CA3AF' : '#0A1D4D',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = '#0F766E';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E5E9F0';
        }}
      />
    </div>
  );
}
