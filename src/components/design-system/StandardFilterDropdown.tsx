import React from 'react';

interface StandardFilterDropdownOption {
  value: string;
  label: string;
}

interface StandardFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: StandardFilterDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function StandardFilterDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  style
}: StandardFilterDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '10px 40px 10px 12px',
        border: '1px solid var(--neuron-ui-border)',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        color: disabled ? '#9CA3AF' : (value ? 'var(--neuron-ink-primary)' : '#9CA3AF'),
        backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${disabled ? '%239CA3AF' : '%23667085'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '16px',
        transition: 'border-color 0.15s ease',
        ...style
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--neuron-teal)';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--neuron-ui-border)';
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
