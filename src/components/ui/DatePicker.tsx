import { useState, useEffect } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  min?: string;
  max?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY',
  disabled = false,
  required = false,
  className = '',
  style = {},
  id,
}: DatePickerProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Convert YYYY-MM-DD to MM/DD/YYYY for display
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        setDisplayValue(`${month}/${day}/${year}`);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); // Remove all non-digits
    
    // Limit to 8 digits (MMDDYYYY)
    if (input.length > 8) {
      input = input.slice(0, 8);
    }

    // Format as MM/DD/YYYY
    let formatted = '';
    if (input.length > 0) {
      formatted = input.slice(0, 2); // MM
      if (input.length >= 3) {
        formatted += '/' + input.slice(2, 4); // DD
      }
      if (input.length >= 5) {
        formatted += '/' + input.slice(4, 8); // YYYY
      }
    }

    setDisplayValue(formatted);

    // Convert to YYYY-MM-DD format for storage if complete
    if (input.length === 8) {
      const month = input.slice(0, 2);
      const day = input.slice(2, 4);
      const year = input.slice(4, 8);
      const isoDate = `${year}-${month}-${day}`;
      
      // Validate the date
      const date = new Date(isoDate);
      if (!isNaN(date.getTime())) {
        onChange(isoDate);
      }
    } else if (formatted === '') {
      // Clear the value if input is empty
      onChange('');
    }
  };

  const handleBlur = () => {
    // If incomplete date on blur, clear it
    if (displayValue && displayValue.length < 10) {
      setDisplayValue('');
      onChange('');
    }
  };

  return (
    <input
      type="text"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={className}
      style={{
        ...style,
      }}
    />
  );
}
