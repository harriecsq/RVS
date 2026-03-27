import React from 'react';
import { Search } from 'lucide-react';

interface StandardSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function StandardSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  style
}: StandardSearchInputProps) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: disabled ? '#9CA3AF' : '#667085',
          pointerEvents: 'none'
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
          padding: '10px 12px 10px 40px',
          border: '1px solid var(--neuron-ui-border)',
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
          color: disabled ? '#9CA3AF' : 'var(--neuron-ink-primary)',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          transition: 'border-color 0.15s ease'
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--neuron-teal)';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--neuron-ui-border)';
        }}
      />
    </div>
  );
}
