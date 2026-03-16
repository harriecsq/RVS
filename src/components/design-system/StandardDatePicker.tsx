import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface StandardDatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export function StandardDatePicker({
  label,
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  required = false,
  disabled = false,
  error,
  helperText,
  min,
  max,
  style,
  inputStyle
}: StandardDatePickerProps) {
  const [inputValue, setInputValue] = useState('');
  const isInternalChange = useRef(false);

  // Initialize/Sync input value from props
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setInputValue(formatDateToDisplay(value));
  }, [value]);

  const formatDateToDisplay = (val: string) => {
    if (!val) return '';
    // Check if it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      return `${m}/${d}/${y}`;
    }
    return val;
  };

  const parseDisplayToISO = (val: string) => {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [m, d, y] = val.split('/');
      return `${y}-${m}-${d}`;
    }
    return val;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let nextValue = e.target.value;
    
    // Only allow numbers and slashes
    if (!/^[\d/]*$/.test(nextValue)) return;

    // Smart typing logic
    // If user is deleting (length got smaller), just allow it (unless we want smart backspace)
    if (nextValue.length < inputValue.length) {
      setInputValue(nextValue);
      isInternalChange.current = true;
      onChange(nextValue); // Pass raw value until complete? Or just pass as is.
      return;
    }

    // Removing non-digits to re-format
    const digits = nextValue.replace(/\D/g, '');
    
    if (digits.length > 8) return; // Max 8 digits (MMDDYYYY)

    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.substring(0, 2);
      if (digits.length >= 2) {
        formatted += '/';
      }
    }
    if (digits.length > 2) {
      formatted += digits.substring(2, 4);
      if (digits.length >= 4) {
        formatted += '/';
      }
    }
    if (digits.length > 4) {
      formatted += digits.substring(4, 8);
    }

    setInputValue(formatted);
    isInternalChange.current = true;
    
    // If we have a full date, try to emit it in preferred format (likely ISO if that's what app uses, or keep as MM/DD/YYYY)
    // The prompt says "ALL date fields must use MM/DD/YYYY format". 
    // It's ambiguous if the *data* is MM/DD/YYYY or just the UI. 
    // Usually DBs use ISO. But let's check if the previous code was using `type="date"` (ISO).
    // The previous code used `type="date"`, so `value` was likely YYYY-MM-DD.
    // I should convert back to YYYY-MM-DD if valid, or just pass the string if incomplete.
    
    if (formatted.length === 10) {
        const iso = parseDisplayToISO(formatted);
        onChange(iso); 
    } else {
        onChange(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      // If cursor is after a slash, delete the slash AND the number before it?
      // Or just standard behavior.
      // Standard behavior with re-formatting usually handles it well enough.
      // But let's see. If value is "12/", backspace makes it "12". 
      // Next render triggers format? "12" -> "12/". Stuck loop?
      // No, because "12".length (2) -> formatted "12/".
      // So if I backspace "12/", I get "12". Logic adds slash back.
      // So I explicitly need to handle backspace to remove the slash + digit if needed?
      // Actually simpler: if ending in slash, remove slash?
    }
  };

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
        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: error ? '#DC2626' : '#667085',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <Calendar size={16} />
        </div>
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            border: `1px solid ${error ? '#DC2626' : 'var(--neuron-ui-border)'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            color: disabled ? '#9CA3AF' : 'var(--neuron-ink-primary)',
            backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'border-color 0.15s ease',
            fontFamily: 'monospace', // Helpful for alignment
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
