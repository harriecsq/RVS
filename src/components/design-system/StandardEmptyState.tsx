import React from 'react';

interface StandardEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  style?: React.CSSProperties;
}

export function StandardEmptyState({
  icon,
  title,
  description,
  action,
  style
}: StandardEmptyStateProps) {
  return (
    <div
      style={{
        padding: '64px 32px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
        ...style
      }}
    >
      {icon && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#D1D5DB'
          }}
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#12332B',
          marginBottom: description || action ? '8px' : '0'
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            fontSize: '14px',
            color: '#667085',
            marginBottom: action ? '24px' : '0'
          }}
        >
          {description}
        </div>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--neuron-teal)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0D6560';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--neuron-teal)';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
