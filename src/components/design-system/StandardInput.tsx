import React from 'react';

interface StandardInputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export function StandardInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  icon,
  style,
  inputStyle
}: StandardInputProps) {
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
      
      <div style={{ position: 'relative' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: error ? '#DC2626' : '#667085',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {icon}
          </div>
        )}
        
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          style={{
            width: '100%',
            padding: icon ? '10px 12px 10px 40px' : '10px 12px',
            border: `1px solid ${error ? '#DC2626' : 'var(--neuron-ui-border)'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            color: disabled ? '#9CA3AF' : 'var(--neuron-ink-primary)',
            backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
            transition: 'border-color 0.15s ease',
            ...inputStyle
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
      </div>
      
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
