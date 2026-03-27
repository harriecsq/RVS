"use client";

import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      duration={3000}
      toastOptions={{
        style: {
          background: "#FFFFFF",
          border: "1px solid #E5E9F0",
          borderRadius: "12px",
          padding: "12px 16px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          fontSize: "13px",
          fontWeight: 600,
          color: "#0A1D4D",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
          letterSpacing: "0",
        },
      }}
      style={
        {
          "--normal-bg": "#FFFFFF",
          "--normal-text": "#0A1D4D",
          "--normal-border": "#E5E9F0",
          "--success-bg": "#FFFFFF",
          "--success-text": "#0A1D4D",
          "--success-border": "#E5E9F0",
          "--error-bg": "#FFFFFF",
          "--error-text": "#0A1D4D",
          "--error-border": "#E5E9F0",
          "--info-bg": "#FFFFFF",
          "--info-text": "#0A1D4D",
          "--info-border": "#E5E9F0",
          "--warning-bg": "#FFFFFF",
          "--warning-text": "#0A1D4D",
          "--warning-border": "#E5E9F0",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
