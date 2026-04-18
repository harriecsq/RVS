import { useRef, useEffect, type ReactNode } from "react";
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

/**
 * Renders a dropdown menu via portal so it is never clipped by
 * parent overflow containers. Position is anchored to triggerRef.
 */
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

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
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
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    top: pos.top,
    bottom: pos.bottom,
    background: "white",
    border: "1px solid #E5E9F0",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    zIndex: 9999,
    minWidth,
    maxHeight: pos.maxHeight,
    overflowY: "auto",
    overflow: "hidden auto",
  };

  if (align === "right") {
    style.right = pos.right;
  } else {
    style.left = pos.left;
    style.width = pos.width;
  }

  return createPortal(
    <div ref={dropdownRef} style={style}>
      {children}
    </div>,
    document.body,
  );
}
