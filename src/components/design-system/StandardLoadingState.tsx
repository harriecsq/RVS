import React from 'react';

interface StandardLoadingStateProps {
  message?: string;
  style?: React.CSSProperties;
}

export function StandardLoadingState({
  message = 'Loading...',
  style
}: StandardLoadingStateProps) {
  return (
    <div
      style={{
        padding: '64px',
        textAlign: 'center',
        ...style
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          margin: '0 auto 16px',
          border: '3px solid #E5E9F0',
          borderTopColor: 'var(--neuron-teal)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <style>
        {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div
        style={{
          fontSize: '14px',
          color: '#667085'
        }}
      >
        {message}
      </div>
    </div>
  );
}
