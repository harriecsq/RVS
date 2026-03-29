import React from 'react';
import { StandardButton } from './StandardButton';

interface StandardEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  minHeight?: string;
  style?: React.CSSProperties;
}

export function StandardEmptyState({
  icon,
  title,
  description,
  action,
  minHeight,
  style,
}: StandardEmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        minHeight,
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#9CA3AF',
          }}
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#0A1D4D',
          marginBottom: description || action ? '8px' : '0',
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            fontSize: '14px',
            color: '#667085',
            marginBottom: action ? '24px' : '0',
          }}
        >
          {description}
        </div>
      )}

      {action && (
        <StandardButton variant="primary" onClick={action.onClick}>
          {action.label}
        </StandardButton>
      )}
    </div>
  );
}
