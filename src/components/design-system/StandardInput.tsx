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
            color: error ? '#EF4444' : '#344054'
          }}
        >
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
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
              color: error ? '#EF4444' : '#667085',
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
            border: `1px solid ${error ? '#EF4444' : 'var(--neuron-ui-border)'}`,
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            color: disabled ? '#9CA3AF' : 'var(--neuron-ink-primary)',
            backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
            transition: 'border-color 0.15s ease',
            ...inputStyle
          }}
          onFocus={(e) => {
            if (!error && !disabled) {
              e.currentTarget.style.borderColor = '#0F766E';
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
            color: error ? '#EF4444' : '#667085',
            lineHeight: '1.4'
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
}
