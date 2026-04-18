import { useState } from "react";
import { SubTabRow } from "./SubTabRow";
import { SegmentSelector } from "./SegmentSelector";
import { DocumentsSubTab } from "./DocumentsSubTab";
import type { BookingSegment } from "../../../types/operations";

type BookingInfoSubTab = "booking-details" | "documents";

interface BookingInfoSubTabsProps {
  bookingId: string;
  currentUser?: { name: string; email: string; department: string } | null;
  /** The existing BookingInformationTab content rendered as children */
  children: React.ReactNode;
  /** Multi-leg segment support */
  segments?: BookingSegment[];
  activeSegmentId?: string;
  onSegmentChange?: (segmentId: string) => void;
  onAddSegment?: () => void;
  onDeleteSegment?: (segmentId: string) => void;
  isEditing?: boolean;
  /** Full booking object for document auto-fill */
  booking?: any;
  /** Called after a document is created/updated so parent can refresh */
  onDocumentUpdated?: () => void;
}

const subTabs = [
  { id: "booking-details", label: "Booking Details" },
  { id: "documents", label: "Documents" },
];

export function BookingInfoSubTabs({
  bookingId,
  currentUser,
  children,
  segments,
  activeSegmentId,
  onSegmentChange,
  onAddSegment,
  onDeleteSegment,
  isEditing,
  booking,
  onDocumentUpdated,
}: BookingInfoSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<BookingInfoSubTab>("booking-details");

  const showSegments = segments && segments.length > 0 && onSegmentChange && onAddSegment;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-tab row */}
      <SubTabRow
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as BookingInfoSubTab)}
      />

      {/* Segment selector — shown under sub-tabs when segments exist */}
      {showSegments && activeSubTab === "booking-details" && (
        <SegmentSelector
          segments={segments}
          activeSegmentId={activeSegmentId || segments[0]?.segmentId || ""}
          onSegmentChange={onSegmentChange}
          onAddSegment={onAddSegment}
          onDeleteSegment={onDeleteSegment}
          isEditing={isEditing}
        />
      )}

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "booking-details" && children}

        {activeSubTab === "documents" && (
          <DocumentsSubTab
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={onDocumentUpdated}
          />
        )}
      </div>
    </div>
  );
}
