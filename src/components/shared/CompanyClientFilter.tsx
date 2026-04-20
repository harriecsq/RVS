import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Search, Building2, User, X, Check } from "lucide-react";

interface CompanyClientFilterProps {
  extraEntries?: Array<{ company: string; client: string }>;
  selectedCompany: string | null;
  selectedClient: string | null;
  onCompanyChange: (company: string | null) => void;
  onClientChange: (client: string | null) => void;
  placeholder?: string;
}

export function CompanyClientFilter({
  extraEntries,
  selectedCompany,
  selectedClient,
  onCompanyChange,
  onClientChange,
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
    for (const { company, client } of (extraEntries ?? [])) {
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
        setExpandedCompanies(new Set());
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const toggleExpand = (company: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  const close = () => { setIsOpen(false); setSearch(""); setExpandedCompanies(new Set()); };
  const selectCompany = (company: string) => { onCompanyChange(company); onClientChange(null); close(); };
  const selectClient = (company: string, client: string) => { onCompanyChange(company); onClientChange(client); close(); };
  const clearAll = () => { onCompanyChange(null); onClientChange(null); close(); };

  const displayLabel = selectedCompany
    ? selectedClient ? `${selectedCompany} › ${selectedClient}` : selectedCompany
    : placeholder;
  const hasSelection = selectedCompany !== null;

  // Flatten visible entries to determine which ones get a bottom border
  const flatEntries: Array<{ type: "all" | "company" | "client"; company?: string; client?: string }> = [
    { type: "all" },
    ...Array.from(filteredHierarchy.entries()).flatMap(([company, clients]) => {
      const isExpanded = expandedCompanies.has(company);
      return [
        { type: "company" as const, company },
        ...(isExpanded ? clients.map((client) => ({ type: "client" as const, company, client })) : []),
      ];
    }),
  ];

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
              maxHeight: 320,
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

            {/* Options list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredHierarchy.size === 0 ? (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
                  No companies found
                </div>
              ) : (
                flatEntries.map((entry, idx) => {
                  const isLast = idx === flatEntries.length - 1;
                  const borderBottom = isLast ? "none" : "1px solid #E5E9F0";

                  if (entry.type === "all") {
                    const selected = !selectedCompany;
                    return (
                      <div
                        key="__all__"
                        onClick={clearAll}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#12332B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: selected ? "#E8F2EE" : "transparent",
                          borderBottom,
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? "#E8F2EE" : "transparent"; }}
                      >
                        {placeholder}
                        {selected && <Check size={14} style={{ color: "#237F66", flexShrink: 0 }} />}
                      </div>
                    );
                  }

                  if (entry.type === "company") {
                    const company = entry.company!;
                    const clients = filteredHierarchy.get(company) ?? [];
                    const hasClients = clients.length > 0;
                    const isExpanded = expandedCompanies.has(company);
                    const selected = selectedCompany === company && selectedClient === null;
                    const isParentOfSelected = selectedCompany === company;
                    return (
                      <div
                        key={`co:${company}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "14px",
                          color: "#12332B",
                          backgroundColor: selected ? "#E8F2EE" : isParentOfSelected ? "#F3F8F6" : "transparent",
                          borderBottom,
                          userSelect: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = selected ? "#E8F2EE" : isParentOfSelected ? "#F3F8F6" : "transparent";
                        }}
                      >
                        {/* Expand chevron */}
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

                        {/* Company name */}
                        <div
                          onClick={() => selectCompany(company)}
                          style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", padding: "10px 12px 10px 0", overflow: "hidden" }}
                        >
                          <Building2 size={13} style={{ flexShrink: 0, color: "#9CA3AF" }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selected ? 500 : 400 }}>
                            {company}
                          </span>
                          {hasClients && (
                            <span style={{ fontSize: "11px", color: "#9CA3AF", flexShrink: 0 }}>({clients.length})</span>
                          )}
                        </div>

                        {selected && <Check size={14} style={{ color: "#237F66", flexShrink: 0, marginRight: 12 }} />}
                      </div>
                    );
                  }

                  // type === "client"
                  const company = entry.company!;
                  const client = entry.client!;
                  const selected = selectedCompany === company && selectedClient === client;
                  return (
                    <div
                      key={`cl:${company}__${client}`}
                      onClick={() => selectClient(company, client)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                        padding: "10px 12px 10px 44px",
                        fontSize: "13px",
                        color: "#12332B",
                        backgroundColor: selected ? "#E8F2EE" : "transparent",
                        borderBottom,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? "#E8F2EE" : "transparent"; }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                        <User size={12} style={{ flexShrink: 0, color: "#9CA3AF" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selected ? 500 : 400 }}>
                          {client}
                        </span>
                      </span>
                      {selected && <Check size={14} style={{ color: "#237F66", flexShrink: 0 }} />}
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
