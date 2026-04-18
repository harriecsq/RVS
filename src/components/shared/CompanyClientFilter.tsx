/**
 * CompanyClientFilter
 *
 * A hierarchical dropdown filter that shows companies at the top level,
 * with expandable client sub-items nested under each company.
 * Clients are only revealed when a company's chevron is clicked.
 *
 * Designed to match existing filter dropdown styling in the Neuron OS system.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Search, Building2, User, X } from "lucide-react";

interface CompanyClientFilterProps<T> {
  items: T[];
  getCompany: (item: T) => string;
  getClient: (item: T) => string;
  selectedCompany: string | null;
  selectedClient: string | null;
  onCompanyChange: (company: string | null) => void;
  onClientChange: (client: string | null) => void;
  placeholder?: string;
}

export function CompanyClientFilter<T>({
  items,
  getCompany,
  getClient,
  selectedCompany,
  selectedClient,
  onCompanyChange,
  onClientChange,
  placeholder = "All Companies",
}: CompanyClientFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Build the hierarchy: Map<company, string[]>
  const hierarchy = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of items) {
      const company = getCompany(item)?.trim();
      const client = getClient(item)?.trim();
      if (!company) continue;
      if (!map.has(company)) map.set(company, new Set());
      if (client && client !== company) {
        map.get(company)!.add(client);
      }
    }
    // Sort companies, and sort clients within each
    const sorted = new Map<string, string[]>();
    const sortedKeys = Array.from(map.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    for (const key of sortedKeys) {
      sorted.set(
        key,
        Array.from(map.get(key)!).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
      );
    }
    return sorted;
  }, [items, getCompany, getClient]);

  // Filter by search
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

  // Position dropdown
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
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

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
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

  const selectCompany = (company: string) => {
    onCompanyChange(company);
    onClientChange(null);
    setIsOpen(false);
    setSearch("");
    setExpandedCompanies(new Set());
  };

  const selectClient = (company: string, client: string) => {
    onCompanyChange(company);
    onClientChange(client);
    setIsOpen(false);
    setSearch("");
    setExpandedCompanies(new Set());
  };

  const clearAll = () => {
    onCompanyChange(null);
    onClientChange(null);
    setIsOpen(false);
    setSearch("");
    setExpandedCompanies(new Set());
  };

  // Build display label
  const displayLabel = selectedCompany
    ? selectedClient
      ? `${selectedCompany} \u203A ${selectedClient}`
      : selectedCompany
    : placeholder;

  const hasSelection = selectedCompany !== null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 12px",
          border: "1px solid #E5E9F0",
          borderRadius: "8px",
          fontSize: "14px",
          color: hasSelection ? "#0A1D4D" : "#667085",
          backgroundColor: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          width: "100%",
          textAlign: "left",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minHeight: "42px",
          position: "relative",
        }}
      >
        <Building2 size={14} style={{ flexShrink: 0, color: "#667085" }} />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </span>
        {hasSelection ? (
          <X
            size={14}
            style={{ flexShrink: 0, color: "#667085", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
          />
        ) : (
          <ChevronDown size={14} style={{ flexShrink: 0, color: "#667085" }} />
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              bottom: dropdownPos.bottom,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Search */}
            <div
              style={{
                padding: "8px",
                borderBottom: "1px solid #E5E9F0",
                flexShrink: 0,
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                  }}
                />
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
                    color: "#0A1D4D",
                    backgroundColor: "#F9FAFB",
                  }}
                />
              </div>
            </div>

            {/* Options list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 0",
              }}
            >
              {/* All Companies option */}
              <button
                onClick={clearAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background:
                    !selectedCompany ? "rgba(0, 102, 68, 0.06)" : "transparent",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: !selectedCompany ? 600 : 400,
                  color: "#0A1D4D",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (selectedCompany)
                    (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    !selectedCompany ? "rgba(0, 102, 68, 0.06)" : "transparent";
                }}
              >
                <span style={{ width: 16 }} />
                {placeholder}
              </button>

              {filteredHierarchy.size === 0 && (
                <div
                  style={{
                    padding: "16px 12px",
                    textAlign: "center",
                    color: "#9CA3AF",
                    fontSize: "13px",
                  }}
                >
                  No companies found
                </div>
              )}

              {Array.from(filteredHierarchy.entries()).map(([company, clients]) => {
                const isExpanded = expandedCompanies.has(company);
                const hasClients = clients.length > 0;
                const isSelected =
                  selectedCompany === company && selectedClient === null;
                const isParentOfSelected = selectedCompany === company;

                return (
                  <div key={company}>
                    {/* Company row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        background: isSelected
                          ? "rgba(0, 102, 68, 0.06)"
                          : isParentOfSelected
                          ? "rgba(0, 102, 68, 0.03)"
                          : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background =
                            "#F9FAFB";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = isSelected
                          ? "rgba(0, 102, 68, 0.06)"
                          : isParentOfSelected
                          ? "rgba(0, 102, 68, 0.03)"
                          : "transparent";
                      }}
                    >
                      {/* Expand/collapse chevron */}
                      <button
                        onClick={(e) => hasClients && toggleExpand(company, e)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 36,
                          border: "none",
                          background: "transparent",
                          cursor: hasClients ? "pointer" : "default",
                          padding: 0,
                          flexShrink: 0,
                          marginLeft: "4px",
                          color: hasClients ? "#667085" : "transparent",
                        }}
                      >
                        {hasClients &&
                          (isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          ))}
                      </button>

                      {/* Company name */}
                      <button
                        onClick={() => selectCompany(company)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 12px 8px 0",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: isSelected ? 600 : 400,
                          color: "#0A1D4D",
                          textAlign: "left",
                          overflow: "hidden",
                        }}
                      >
                        <Building2
                          size={13}
                          style={{ flexShrink: 0, color: "#667085" }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {company}
                        </span>
                        {hasClients && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#9CA3AF",
                              flexShrink: 0,
                            }}
                          >
                            ({clients.length})
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Client sub-items (only when expanded) */}
                    {isExpanded &&
                      hasClients &&
                      clients.map((client) => {
                        const isClientSelected =
                          selectedCompany === company && selectedClient === client;
                        return (
                          <button
                            key={`${company}__${client}`}
                            onClick={() => selectClient(company, client)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              width: "100%",
                              padding: "7px 12px 7px 44px",
                              border: "none",
                              background: isClientSelected
                                ? "rgba(0, 102, 68, 0.06)"
                                : "transparent",
                              cursor: "pointer",
                              fontSize: "12.5px",
                              fontWeight: isClientSelected ? 600 : 400,
                              color: isClientSelected ? "#006644" : "#344054",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isClientSelected)
                                (e.currentTarget as HTMLElement).style.background =
                                  "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                isClientSelected
                                  ? "rgba(0, 102, 68, 0.06)"
                                  : "transparent";
                            }}
                          >
                            <User
                              size={12}
                              style={{ flexShrink: 0, color: "#9CA3AF" }}
                            />
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {client}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
