import { useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDropdownPosition } from "../../hooks/useDropdownPortal";

interface PortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  minWidth?: string;
  align?: "left" | "right";
}

export function PortalDropdown({
  isOpen,
  onClose,
  triggerRef,
  children,
  minWidth = "220px",
  align = "right",
}: PortalDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(triggerRef, isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef, handleKeyDown]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    top: pos.top,
    bottom: pos.bottom,
    background: "white",
    border: "1px solid #E5E9F0",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    zIndex: 9999,
    minWidth,
    maxHeight: pos.maxHeight,
    overflowY: "auto",
  };

  if (align === "right") {
    style.right = pos.right;
  } else {
    style.left = pos.left;
    style.width = pos.width;
  }

  return createPortal(
    <div ref={dropdownRef} style={style} onMouseDown={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
}
