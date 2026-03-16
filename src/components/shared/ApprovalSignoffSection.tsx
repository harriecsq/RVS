import { PayeeSelector } from "../selectors/PayeeSelector";

interface ApprovalSignoffSectionProps {
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  onPreparedByChange: (value: string) => void;
  onCheckedByChange: (value: string) => void;
  onApprovedByChange: (value: string) => void;
  disabled?: boolean;
}

export function ApprovalSignoffSection({
  preparedBy,
  checkedBy,
  approvedBy,
  onPreparedByChange,
  onCheckedByChange,
  onApprovedByChange,
  disabled = false,
}: ApprovalSignoffSectionProps) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
        overflow: "hidden",
        marginTop: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #E5E7EB",
          background: "#F9FAFB",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#12332B",
            margin: 0,
          }}
        >
          Approvals
        </h3>
      </div>

      {/* Fields */}
      <div style={{ padding: "24px" }}>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {/* Prepared By */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--neuron-ink-base, #12332B)",
                marginBottom: "8px",
              }}
            >
              Prepared by
            </label>
            {disabled ? (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: !preparedBy ? "white" : "#F9FAFB",
                  border: !preparedBy
                    ? "2px dashed #E5E7EB"
                    : "1px solid #E5E7EB",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: !preparedBy
                    ? "#9CA3AF"
                    : "var(--neuron-ink-primary, #12332B)",
                  minHeight: "42px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {preparedBy || "\u2014"}
              </div>
            ) : (
              <PayeeSelector
                value={preparedBy}
                onSelect={onPreparedByChange}
                placeholder="Select or type name..."
                useInlineStyles
              />
            )}
          </div>

          {/* Checked By */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--neuron-ink-base, #12332B)",
                marginBottom: "8px",
              }}
            >
              Checked by
            </label>
            {disabled ? (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: !checkedBy ? "white" : "#F9FAFB",
                  border: !checkedBy
                    ? "2px dashed #E5E7EB"
                    : "1px solid #E5E7EB",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: !checkedBy
                    ? "#9CA3AF"
                    : "var(--neuron-ink-primary, #12332B)",
                  minHeight: "42px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {checkedBy || "\u2014"}
              </div>
            ) : (
              <PayeeSelector
                value={checkedBy}
                onSelect={onCheckedByChange}
                placeholder="Select or type name..."
                useInlineStyles
              />
            )}
          </div>

          {/* Approved By */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--neuron-ink-base, #12332B)",
                marginBottom: "8px",
              }}
            >
              Approved by
            </label>
            {disabled ? (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: !approvedBy ? "white" : "#F9FAFB",
                  border: !approvedBy
                    ? "2px dashed #E5E7EB"
                    : "1px solid #E5E7EB",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: !approvedBy
                    ? "#9CA3AF"
                    : "var(--neuron-ink-primary, #12332B)",
                  minHeight: "42px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {approvedBy || "\u2014"}
              </div>
            ) : (
              <PayeeSelector
                value={approvedBy}
                onSelect={onApprovedByChange}
                placeholder="Select or type name..."
                useInlineStyles
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
