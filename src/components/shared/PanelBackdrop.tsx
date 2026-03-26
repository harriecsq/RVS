interface PanelBackdropProps {
  onClick: () => void;
  zIndex?: number;
}

/**
 * Standardized panel backdrop — blurred NEURON tint, z-40, fade transition.
 * Closes only when the backdrop itself is clicked (not portaled children).
 */
export function PanelBackdrop({ onClick, zIndex = 40 }: PanelBackdropProps) {
  return (
    <div
      className="fixed inset-0 transition-opacity duration-200"
      style={{
        zIndex,
        backdropFilter: "blur(2px)",
        backgroundColor: "rgba(18, 51, 43, 0.15)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClick();
      }}
    />
  );
}
