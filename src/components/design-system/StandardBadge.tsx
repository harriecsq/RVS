import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface StandardBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: React.CSSProperties;
}

export function StandardBadge({
  children,
  variant = 'default',
  size = 'md',
  style
}: StandardBadgeProps) {
  const variantStyles = {
    default: {
      background: '#F3F4F6',
      color: '#374151',
    },
    primary: {
      background: 'var(--neuron-teal)',
      color: '#FFFFFF',
    },
    success: {
      background: 'var(--neuron-brand-green-100)',
      color: 'var(--neuron-semantic-success)',
    },
    warning: {
      background: '#FFF4E6',
      color: 'var(--neuron-semantic-warn)',
    },
    danger: {
      background: '#FFEBE9',
      color: 'var(--neuron-semantic-danger)',
    },
    neutral: {
      background: 'var(--neuron-state-selected)',
      color: 'var(--neuron-ink-secondary)',
    },
  };

  const sizeStyles = {
    sm: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 700,
      lineHeight: '16px',
      minWidth: '20px',
    },
    md: {
      padding: '4px 10px',
      borderRadius: '14px',
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: '18px',
      minWidth: '24px',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
    >
      {children}
    </span>
  );
}
