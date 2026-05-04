import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, User, Building2, Loader2, X } from 'lucide-react';
import { PortalDropdown } from '../shared/PortalDropdown';
import { publicAnonKey } from '../../utils/supabase/info';
import type { Client, Contact } from '../../types/operations';
import { API_BASE_URL } from '@/utils/api-config';

interface CompanyContactSelectorProps {
  companyId?: string;
  contactId?: string;
  onSelect: (data: { company: Client | null; contact: Contact | null }) => void;
  disabled?: boolean;
  showContact?: boolean;
  showLabels?: boolean;
  companyLabel?: string;
  contactLabel?: string;
  contactRequired?: boolean;
}

const triggerStyle = (disabled: boolean, hasValue: boolean): React.CSSProperties => ({
  width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
  border: '1px solid #E5E9F0', background: disabled ? '#F9FAFB' : '#FFFFFF',
  color: hasValue ? '#12332B' : '#9CA3AF', fontSize: '14px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none', gap: '8px',
  opacity: disabled ? 0.7 : 1,
});

export function CompanyContactSelector({
  companyId,
  contactId,
  onSelect,
  disabled = false,
  showContact = true,
  showLabels = true,
  companyLabel = "Company",
  contactLabel = "Contact Person",
  contactRequired = false,
}: CompanyContactSelectorProps) {
  const [openCompany, setOpenCompany] = useState(false);
  const [companies, setCompanies] = useState<Client[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');
  const companyTriggerRef = useRef<HTMLButtonElement>(null);

  const [openContact, setOpenContact] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchContact, setSearchContact] = useState('');
  const contactTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => {
    if (companyId) fetchContacts(companyId);
    else setContacts([]);
  }, [companyId]);
  useEffect(() => { if (!openCompany) setSearchCompany(''); }, [openCompany]);
  useEffect(() => { if (!openContact) setSearchContact(''); }, [openContact]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch(`${API_BASE_URL}/clients`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      const result = await res.json();
      if (result.success) setCompanies(result.data.filter((c: Client) => c.status === 'Active'));
    } catch { /* silent */ } finally { setLoadingCompanies(false); }
  };

  const fetchContacts = async (clientId: string) => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/contacts?customer_id=${clientId}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      const result = await res.json();
      if (result.success) {
        setContacts(result.data.map((c: any) => ({
          ...c,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed Contact',
        })));
      } else { setContacts([]); }
    } catch { setContacts([]); } finally { setLoadingContacts(false); }
  };

  const selectedCompany = companies.find(c => c.id === companyId);
  const selectedContact = contacts.find(c => c.id === contactId);

  const filteredCompanies = companies
    .filter(c => (c.name || c.company_name || '').toLowerCase().includes(searchCompany.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filteredContacts = contacts
    .filter(c => (c.name || '').toLowerCase().includes(searchContact.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div className="flex gap-4 w-full">
      {/* Company Selector */}
      <div className="flex-1">
        {showLabels && (
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
            {companyLabel} <span style={{ color: "#EF4444" }}>*</span>
          </label>
        )}
        <div style={{ position: "relative" }}>
          <button
            ref={companyTriggerRef}
            type="button"
            disabled={disabled}
            onClick={() => { if (!disabled) setOpenCompany(!openCompany); }}
            style={triggerStyle(disabled, !!selectedCompany)}
          >
            {loadingCompanies ? (
              <span style={{ color: "#9CA3AF", display: "flex", alignItems: "center", gap: "6px" }}>
                <Loader2 size={14} className="animate-spin" /> Loading...
              </span>
            ) : selectedCompany ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                <Building2 size={14} style={{ color: "#237F66", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedCompany.name || selectedCompany.company_name}
                </span>
              </span>
            ) : (
              <span>{disabled ? "—" : `Select ${companyLabel.toLowerCase()}...`}</span>
            )}
            <ChevronDown size={16} style={{ flexShrink: 0, color: "#9CA3AF", transform: openCompany ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
          </button>

          <PortalDropdown isOpen={openCompany && !disabled} onClose={() => setOpenCompany(false)} triggerRef={companyTriggerRef} align="left">
            <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type="text" value={searchCompany} onChange={(e) => setSearchCompany(e.target.value)}
                  placeholder="Search companies..." autoFocus onClick={(e) => e.stopPropagation()}
                  style={{ width: "100%", padding: "8px 12px 8px 30px", fontSize: "13px", border: "1px solid #E5E9F0", borderRadius: "6px", outline: "none", color: "#12332B", backgroundColor: "#F9FAFB", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#237F66"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
                />
              </div>
            </div>
            {filteredCompanies.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>No companies found.</div>
            ) : filteredCompanies.map((company, idx) => {
              const isSelected = company.id === companyId;
              const isLast = idx === filteredCompanies.length - 1;
              return (
                <div
                  key={company.id}
                  onClick={() => { onSelect({ company, contact: null }); setOpenCompany(false); }}
                  style={{
                    padding: "10px 12px", cursor: "pointer", fontSize: "14px", color: "#12332B",
                    display: "flex", alignItems: "center", gap: "10px",
                    backgroundColor: isSelected ? "#E8F2EE" : "transparent",
                    borderBottom: isLast ? "none" : "1px solid #E5E9F0",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#E8F2EE" : "transparent"; }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {company.name || company.company_name}
                  </span>
                  {isSelected && <Check size={14} style={{ color: "#237F66", flexShrink: 0 }} />}
                </div>
              );
            })}
          </PortalDropdown>
        </div>
      </div>

      {/* Contact Selector */}
      {showContact && (
        <div className="flex-1" style={{ position: "relative" }}>
          {showLabels && (
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
              {contactLabel} {!contactRequired && <span style={{ color: "#667085", fontWeight: 400, fontSize: "12px" }}>(Optional)</span>}
            </label>
          )}
          <div style={{ position: "relative" }}>
            <button
              ref={contactTriggerRef}
              type="button"
              disabled={!companyId || disabled || loadingContacts}
              onClick={() => { if (companyId && !disabled) setOpenContact(!openContact); }}
              style={triggerStyle(!companyId || disabled || loadingContacts, !!selectedContact)}
            >
              {loadingContacts ? (
                <span style={{ color: "#9CA3AF", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </span>
              ) : selectedContact ? (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                  <User size={14} style={{ color: "#237F66", flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedContact.name}
                  </span>
                </span>
              ) : (
                <span>{disabled ? "—" : "Select contact..."}</span>
              )}
              <ChevronDown size={16} style={{ flexShrink: 0, color: "#9CA3AF", transform: openContact ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
            </button>

            {selectedContact && !disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelect({ company: selectedCompany || null, contact: null }); }}
                style={{ position: "absolute", right: "36px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", color: "#667085", borderRadius: "50%" }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#EF4444"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#667085"; }}
              >
                <X size={14} />
              </button>
            )}

            <PortalDropdown isOpen={openContact && !!companyId && !disabled} onClose={() => setOpenContact(false)} triggerRef={contactTriggerRef} align="left">
              <div style={{ padding: "8px", borderBottom: "1px solid #E5E9F0", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input
                    type="text" value={searchContact} onChange={(e) => setSearchContact(e.target.value)}
                    placeholder="Search contacts..." autoFocus onClick={(e) => e.stopPropagation()}
                    style={{ width: "100%", padding: "8px 12px 8px 30px", fontSize: "13px", border: "1px solid #E5E9F0", borderRadius: "6px", outline: "none", color: "#12332B", backgroundColor: "#F9FAFB", boxSizing: "border-box" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#237F66"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
                  />
                </div>
              </div>
              {filteredContacts.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>No contacts found.</div>
              ) : filteredContacts.map((contact, idx) => {
                const isSelected = contact.id === contactId;
                const isLast = idx === filteredContacts.length - 1;
                return (
                  <div
                    key={contact.id}
                    onClick={() => { onSelect({ company: selectedCompany || null, contact }); setOpenContact(false); }}
                    style={{
                      padding: "10px 12px", cursor: "pointer", fontSize: "14px", color: "#12332B",
                      display: "flex", alignItems: "center", gap: "10px",
                      backgroundColor: isSelected ? "#E8F2EE" : "transparent",
                      borderBottom: isLast ? "none" : "1px solid #E5E9F0",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#E8F2EE" : "transparent"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.name}</div>
                      {contact.title && <div style={{ fontSize: "12px", color: "#6B7A76" }}>{contact.title}</div>}
                    </div>
                    {isSelected && <Check size={14} style={{ color: "#237F66", flexShrink: 0 }} />}
                  </div>
                );
              })}
            </PortalDropdown>
          </div>
        </div>
      )}
    </div>
  );
}
