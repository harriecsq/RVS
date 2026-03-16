# Shipment Details - Edit Mode Code

Replace lines 1831-1938 in ViewBillingScreen.tsx with this code:

```typescript
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
  {/* Vessel/Voyage */}
  {(billing.vessel || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        Vessel/Voyage
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedVessel}
          onChange={(e) => setEditedVessel(e.target.value)}
          placeholder="Enter vessel/voyage"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.vessel}
        </div>
      )}
    </div>
  )}

  {/* BL Number */}
  {(billing.blNumber || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        BL Number
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedBlNumber}
          onChange={(e) => setEditedBlNumber(e.target.value)}
          placeholder="Enter BL number"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.blNumber}
        </div>
      )}
    </div>
  )}

  {/* Destination */}
  {(billing.destination || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        Destination
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedDestination}
          onChange={(e) => setEditedDestination(e.target.value)}
          placeholder="Enter destination"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.destination}
        </div>
      )}
    </div>
  )}

  {/* Volume */}
  {(billing.volume || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        Volume
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedVolume}
          onChange={(e) => setEditedVolume(e.target.value)}
          placeholder="Enter volume"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.volume}
        </div>
      )}
    </div>
  )}

  {/* Commodity */}
  {(billing.commodity || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        Commodity
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedCommodity}
          onChange={(e) => setEditedCommodity(e.target.value)}
          placeholder="Enter commodity"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.commodity}
        </div>
      )}
    </div>
  )}

  {/* Contract Number */}
  {(billing.contractNumber || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        Contract Number
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedContractNumber}
          onChange={(e) => setEditedContractNumber(e.target.value)}
          placeholder="Enter contract number"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.contractNumber}
        </div>
      )}
    </div>
  )}

  {/* Exchange Rate */}
  {(billing.exchangeRate || isEditing) && (
    <div>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "4px" }}>
        Exchange Rate
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editedExchangeRate}
          onChange={(e) => setEditedExchangeRate(e.target.value)}
          placeholder="Enter exchange rate"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1.5px solid #E5E9F0",
            borderRadius: "8px",
            color: "#12332B",
            backgroundColor: "white",
            outline: "none",
            transition: "border-color 0.2s ease"
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
        />
      ) : (
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#12332B" }}>
          {billing.exchangeRate}
        </div>
      )}
    </div>
  )}

  {/* Container Numbers */}
  {(billing.containerNumbers && billing.containerNumbers.length > 0) || isEditing) && (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={{ fontSize: "12px", color: "#667085", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Container Numbers ({editedContainerNumbers.length})</span>
        {isEditing && (
          <button
            onClick={() => {
              setEditedContainerNumbers([...editedContainerNumbers, ""]);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#3B82F6",
              backgroundColor: "#EFF6FF",
              border: "1px solid #3B82F6",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3B82F6";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#EFF6FF";
              e.currentTarget.style.color = "#3B82F6";
            }}
          >
            <Plus size={14} />
            Add Container
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {isEditing ? (
          <>
            {editedContainerNumbers.map((containerNum, index) => (
              <div
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  backgroundColor: "#F0F9FF",
                  border: "1px solid #3B82F6",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#3B82F6",
                  fontFamily: "monospace"
                }}
              >
                <input
                  type="text"
                  value={containerNum}
                  onChange={(e) => {
                    const updated = [...editedContainerNumbers];
                    updated[index] = e.target.value;
                    setEditedContainerNumbers(updated);
                  }}
                  placeholder="Container #"
                  style={{
                    width: "120px",
                    padding: "4px 8px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#3B82F6",
                    outline: "none"
                  }}
                />
                <button
                  onClick={() => {
                    const updated = editedContainerNumbers.filter((_, i) => i !== index);
                    setEditedContainerNumbers(updated);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#3B82F6",
                    borderRadius: "4px",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#3B82F6";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#3B82F6";
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {editedContainerNumbers.length === 0 && (
              <div style={{ fontSize: "13px", color: "#667085", fontStyle: "italic" }}>
                No containers. Click "Add Container" to add one.
              </div>
            )}
          </>
        ) : (
          billing.containerNumbers.filter(cn => cn && cn.trim() !== "").map((containerNum, index) => (
            <div
              key={index}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                backgroundColor: "#F0F9FF",
                border: "1px solid #3B82F6",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#3B82F6",
                fontFamily: "monospace"
              }}
            >
              {containerNum}
            </div>
          ))
        )}
      </div>
    </div>
  )}
</div>
```

This code makes all shipment details fields editable with proper Neuron styling!
