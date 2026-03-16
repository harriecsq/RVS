import React from 'react';

interface StandardTextareaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  rows?: number;
  style?: React.CSSProperties;
  textareaStyle?: React.CSSProperties;
}

export function StandardTextarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  rows = 3,
  style,
  textareaStyle
}: StandardTextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && (
        <label 
          style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: 500, 
            color: error ? '#DC2626' : '#374151'
          }}
        >
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${error ? '#DC2626' : 'var(--neuron-ui-border)'}`,
          borderRadius: '8px',
          fontSize: '14px',
          outline: 'none',
          color: disabled ? '#9CA3AF' : 'var(--neuron-ink-primary)',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          resize: 'vertical',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s ease',
          ...textareaStyle
        }}
        onFocus={(e) => {
          if (!error && !disabled) {
            e.currentTarget.style.borderColor = 'var(--neuron-teal)';
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'var(--neuron-ui-border)';
          }
        }}
      />
      
      {(error || helperText) && (
        <span 
          style={{ 
            fontSize: '12px', 
            color: error ? '#DC2626' : '#667085',
            lineHeight: '1.4'
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
}
