import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Search, Building2, User, X, Check } from "lucide-react";

export type ClientSelection = { company: string; client: string | null };

interface CompanyClientFilterProps {
  extraEntries?: Array<{ company: string; client: string }>;
  selected: ClientSelection[];
  onChange: (selected: ClientSelection[]) => void;
  placeholder?: string;
}

export function clientSelectionMatches(
  selected: ClientSelection[],
  candidate: { company?: string | null; client?: string | null }
): boolean {
  if (selected.length === 0) return true;
  const company = (candidate.company ?? "").trim();
  const client = (candidate.client ?? "").trim();
  return selected.some((s) => {
    if (s.client === null) {
      return company === s.company || (!!client && client === s.company);
    }
    return client === s.client || company === s.client;
  });
}

export function CompanyClientFilter({
  extraEntries,
  selected,
  onChange,
  placeholder = "All Companies",
}: CompanyClientFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const hierarchy = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const { company, client } of extraEntries ?? []) {
      if (!company) continue;
      if (!map.has(company)) map.set(company, new Set());
      if (client && client !== company) map.get(company)!.add(client);
    }
    const sorted = new Map<string, string[]>();
    for (const key of Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))) {
      sorted.set(key, Array.from(map.get(key)!).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
    }
    return sorted;
  }, [extraEntries]);

  const filteredHierarchy = useMemo(() => {
    if (!search.trim()) return hierarchy;
    const term = search.toLowerCase();
    const result = new Map<string, string[]>();
    for (const [company, clients] of hierarchy) {
      const companyMatches = company.toLowerCase().includes(term);
      const matchingClients = clients.filter((c) => c.toLowerCase().includes(term));
      if (companyMatches || matchingClients.length > 0) {
        result.set(company, companyMatches ? clients : matchingClients);
      }
    }
    return result;
  }, [hierarchy, search]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Auto-expand companies that have selected sub-clients when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    const next = new Set<string>();
    for (const s of selected) {
      if (s.client !== null) next.add(s.company);
    }
    if (next.size > 0) setExpandedCompanies((prev) => new Set([...prev, ...next]));
  }, [isOpen, selected]);

  const toggleExpand = (company: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  const isCompanySelected = (company: string) =>
    selected.some((s) => s.company === company && s.client === null);
  const isClientSelected = (company: string, client: string) =>
    selected.some((s) => s.company === company && s.client === client);

  const toggleCompany = (company: string) => {
    const already = isCompanySelected(company);
    if (already) {
      onChange(selected.filter((s) => !(s.company === company && s.client === null)));
    } else {
      // Replace any sub-client selections of this company with a company-level selection
      onChange([...selected.filter((s) => s.company !== company), { company, client: null }]);
    }
  };

  const toggleClient = (company: string, client: string) => {
    const already = isClientSelected(company, client);
    if (already) {
      onChange(selected.filter((s) => !(s.company === company && s.client === client)));
    } else {
      // Drop any company-level selection for this company; add the client
      onChange([
        ...selected.filter((s) => !(s.company === company && s.client === null)),
        { company, client },
      ]);
    }
  };

  const clearAll = () => onChange([]);

  const selectionCount = selected.length;
  const displayLabel =
    selectionCount === 0
      ? placeholder
      : selectionCount === 1
      ? selected[0].client
        ? `${selected[0].company} › ${selected[0].client}`
        : selected[0].company
      : `${selectionCount} selected`;
  const hasSelection = selectionCount > 0;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 12px",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          fontSize: "14px",
          color: hasSelection ? "#12332B" : "#9CA3AF",
          backgroundColor: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          width: "100%",
          textAlign: "left",
          height: "40px",
          minWidth: 0,
        }}
      >
        <Building2 size={14} style={{ flexShrink: 0, color: "#9CA3AF" }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel}
        </span>
        {hasSelection ? (
          <X
            size={14}
            style={{ flexShrink: 0, color: "#9CA3AF", cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
          />
        ) : (
          <ChevronDown
            size={16}
            style={{ flexShrink: 0, color: "#9CA3AF", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
          />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: 360,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Search */}
            <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "6px 8px 6px 28px",
                    border: "1px solid #E5E9F0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none",
                    color: "#12332B",
                    backgroundColor: "#F9FAFB",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Selection summary / clear */}
            {hasSelection && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                  borderBottom: "1px solid #E5E9F0",
                  fontSize: "12px",
                  color: "#6B7A76",
                  backgroundColor: "#F9FAFB",
                  flexShrink: 0,
                }}
              >
                <span>{selectionCount} selected</span>
                <button
                  onClick={clearAll}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#237F66",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: 0,
                  }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Options list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredHierarchy.size === 0 ? (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
                  No companies found
                </div>
              ) : (
                Array.from(filteredHierarchy.entries()).map(([company, clients], companyIdx, arr) => {
                  const isExpanded = expandedCompanies.has(company);
                  const companyChecked = isCompanySelected(company);
                  const hasClients = clients.length > 0;
                  const isLastCompany = companyIdx === arr.length - 1;

                  return (
                    <div key={`co:${company}`}>
                      {/* Company row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "14px",
                          color: "#12332B",
                          backgroundColor: companyChecked ? "#E8F2EE" : "transparent",
                          borderBottom: !isExpanded && isLastCompany ? "none" : "1px solid #E5E9F0",
                          userSelect: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { if (!companyChecked) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = companyChecked ? "#E8F2EE" : "transparent"; }}
                      >
                        <button
                          onClick={(e) => hasClients && toggleExpand(company, e)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: 32, height: 40, border: "none", background: "transparent",
                            cursor: hasClients ? "pointer" : "default", padding: 0, flexShrink: 0,
                            color: "#9CA3AF",
                          }}
                        >
                          {hasClients && (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
                        </button>

                        <div
                          onClick={() => toggleCompany(company)}
                          style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px 10px 0", overflow: "hidden" }}
                        >
                          <Checkbox checked={companyChecked} />
                          <Building2 size={13} style={{ flexShrink: 0, color: "#9CA3AF" }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: companyChecked ? 500 : 400 }}>
                            {company}
                          </span>
                          {hasClients && (
                            <span style={{ fontSize: "11px", color: "#9CA3AF", flexShrink: 0 }}>({clients.length})</span>
                          )}
                        </div>
                      </div>

                      {/* Sub-client rows */}
                      {isExpanded && clients.map((client, clientIdx) => {
                        const checked = isClientSelected(company, client);
                        const isLastClient = clientIdx === clients.length - 1;
                        return (
                          <div
                            key={`cl:${company}__${client}`}
                            onClick={() => toggleClient(company, client)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "10px 12px 10px 44px",
                              fontSize: "13px",
                              color: "#12332B",
                              backgroundColor: checked ? "#E8F2EE" : "transparent",
                              borderBottom: isLastClient && isLastCompany ? "none" : "1px solid #E5E9F0",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                            onMouseEnter={(e) => { if (!checked) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = checked ? "#E8F2EE" : "transparent"; }}
                          >
                            <Checkbox checked={checked} />
                            <User size={12} style={{ flexShrink: 0, color: "#9CA3AF" }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: checked ? 500 : 400 }}>
                              {client}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1px solid ${checked ? "#237F66" : "#D1D5DB"}`,
        backgroundColor: checked ? "#237F66" : "#FFFFFF",
        flexShrink: 0,
        transition: "background-color 0.1s ease, border-color 0.1s ease",
      }}
    >
      {checked && <Check size={11} strokeWidth={3} style={{ color: "#FFFFFF" }} />}
    </span>
  );
}
