import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { SubTabRow } from "./SubTabRow";
import { SegmentSelector } from "./SegmentSelector";
import { SalesContractTab } from "./SalesContractTab";
import { CommercialInvoiceTab } from "./CommercialInvoiceTab";
import { PackingListTab } from "./PackingListTab";
import { DeclarationTab } from "./DeclarationTab";
import { FormETab } from "./FormETab";
import { FSITab } from "./FSITab";
import type { BookingSegment } from "../../../types/operations";

type BookingInfoSubTab =
  | "booking-details"
  | "sales-contract"
  | "commercial-invoice"
  | "packing-list"
  | "declaration"
  | "form-e"
  | "fsi";

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
  { id: "sales-contract", label: "Sales Contract" },
  { id: "commercial-invoice", label: "Commercial Invoice" },
  { id: "packing-list", label: "Packing List" },
  { id: "declaration", label: "Declaration" },
  { id: "form-e", label: "Form E" },
  { id: "fsi", label: "FSI" },
];

/** Placeholder empty state matching TruckingTab's "no record" design */
function EmptyDocumentState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: "32px 48px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "280px",
        }}
      >
        <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
        <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", margin: "0 0 6px" }}>
          No {title} record
        </p>
        <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>
          {description}
        </p>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            border: "none",
            borderRadius: "8px",
            background: "#0F766E",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
          onClick={() => {
            // Placeholder — future implementation
          }}
        >
          <Plus size={15} /> Create {title}
        </button>
      </div>
    </div>
  );
}

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

        {activeSubTab === "sales-contract" && (
          <SalesContractTab
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={onDocumentUpdated}
          />
        )}

        {activeSubTab === "commercial-invoice" && (
          <CommercialInvoiceTab
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={onDocumentUpdated}
          />
        )}

        {activeSubTab === "packing-list" && (
          <PackingListTab
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={onDocumentUpdated}
          />
        )}

        {activeSubTab === "declaration" && (
          <DeclarationTab
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={onDocumentUpdated}
          />
        )}

        {activeSubTab === "form-e" && (
          <FormETab
            bookingId={bookingId}
            booking={booking}
            currentUser={currentUser}
            onDocumentUpdated={onDocumentUpdated}
          />
        )}

        {activeSubTab === "fsi" && (
          <FSITab
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
