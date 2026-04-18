import { useState, useEffect, useCallback, RefObject } from "react";
import { createPortal } from "react-dom";

interface DropdownPosition {
  top: number | undefined;
  bottom: number | undefined;
  left: number;
  width: number;
  right: number;
  /** Maximum height available in the chosen direction */
  maxHeight: number;
}

const GAP = 4;
const MIN_VISIBLE = 120; // minimum px to show before flipping

/**
 * Hook that calculates position for a portal-rendered dropdown
 * relative to a trigger element. Recalculates on scroll/resize.
 *
 * Automatically flips the dropdown above the trigger when there
 * isn't enough room below (less than MIN_VISIBLE px).
 * Returns `top` when opening downward, `bottom` when flipping up.
 */
export function useDropdownPosition(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean
): DropdownPosition {
  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    bottom: undefined,
    left: 0,
    width: 0,
    right: 0,
    maxHeight: 300,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;

    // Flip above when space below is too tight and above is better
    const flipAbove = spaceBelow < MIN_VISIBLE && spaceAbove > spaceBelow;

    if (flipAbove) {
      setPosition({
        top: undefined,
        bottom: vh - rect.top + GAP,
        left: rect.left,
        width: rect.width,
        right: window.innerWidth - rect.right,
        maxHeight: Math.max(100, spaceAbove),
      });
    } else {
      setPosition({
        top: rect.bottom + GAP,
        bottom: undefined,
        left: rect.left,
        width: rect.width,
        right: window.innerWidth - rect.right,
        maxHeight: Math.max(100, spaceBelow),
      });
    }
  }, [triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  return position;
}

export { createPortal };
