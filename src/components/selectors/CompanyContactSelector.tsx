import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, User, Building2, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { Client, Contact } from '../../types/operations';
import { API_BASE_URL } from '@/utils/api-config';

interface CompanyContactSelectorProps {
  companyId?: string;
  contactId?: string;
  onSelect: (data: { company: Client | null; contact: Contact | null }) => void;
  disabled?: boolean;
  showContact?: boolean;
  showLabels?: boolean;
}

export function CompanyContactSelector({ 
  companyId, 
  contactId, 
  onSelect,
  disabled = false,
  showContact = true,
  showLabels = true
}: CompanyContactSelectorProps) {
  // Company State
  const [openCompany, setOpenCompany] = useState(false);
  const [companies, setCompanies] = useState<Client[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');

  // Contact State
  const [openContact, setOpenContact] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchContact, setSearchContact] = useState('');

  // Initial Fetch Companies
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch Contacts when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchContacts(companyId);
    } else {
      setContacts([]);
    }
  }, [companyId]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await fetch(`${API_BASE_URL}/clients`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });
      const result = await response.json();
      if (result.success) {
        setCompanies(result.data.filter((c: Client) => c.status === 'Active'));
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchContacts = async (clientId: string) => {
    setLoadingContacts(true);
    try {
      // Backend expects 'customer_id' filter, not 'client_id'
      const response = await fetch(`${API_BASE_URL}/contacts?customer_id=${clientId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });
      const result = await response.json();
      if (result.success) {
        // Construct displayName from first_name and last_name if name is missing
        const mappedContacts = result.data.map((c: any) => ({
          ...c,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed Contact'
        }));
        setContacts(mappedContacts);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === companyId);
  const selectedContact = contacts.find(c => c.id === contactId);

  const filteredCompanies = companies.filter(c => 
    (c.name || c.company_name || '').toLowerCase().includes(searchCompany.toLowerCase())
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchContact.toLowerCase())
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const buttonStyle = {
    width: "100%",
    padding: "10px 14px",
    height: "auto",
    minHeight: "42px",
    backgroundColor: disabled ? "#FAFBFC" : "white",
    border: disabled ? "1px solid #E5E7EB" : "1px solid #0F766E",
    borderRadius: "6px",
    fontSize: "14px",
    color: "var(--neuron-ink-primary)",
    justifyContent: "space-between",
    fontWeight: 400
  };

  return (
    <div className="flex gap-4 w-full">
      {/* Company Selector */}
      <div className="flex-1">
        {showLabels && (
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--neuron-ink-primary)" }}>
            Company <span style={{ color: "#EF4444" }}>*</span>
          </label>
        )}
        <Popover open={openCompany} onOpenChange={setOpenCompany}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={openCompany}
              disabled={disabled}
              className="hover:bg-transparent"
              style={buttonStyle}
            >
              {loadingCompanies ? (
                <div className="flex items-center gap-2 text-[#667085]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                </div>
              ) : selectedCompany ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#0F766E]" />
                  <span className="font-medium text-[#12332B]">{selectedCompany.name || selectedCompany.company_name}</span>
                </div>
              ) : (
                <span className="text-[#667085]">{disabled ? "—" : "Select company..."}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#667085]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-[#667085]" />
                <input
                  placeholder="Search companies..."
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 text-[#12332B]"
                />
              </div>
              <CommandList>
                <CommandEmpty className="py-6 text-center text-sm" style={{ color: "#667085" }}>No companies found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-auto">
                  {filteredCompanies.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.id}
                      onSelect={() => {
                        onSelect({ 
                          company: company, 
                          contact: null // Reset contact when company changes
                        });
                        setOpenCompany(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                      style={{ color: "#12332B" }}
                    >
                      <Check
                        className={`h-4 w-4 ${company.id === companyId ? "opacity-100" : "opacity-0"} text-[#0F766E]`}
                      />
                      <span style={{ color: "#12332B" }}>{company.name || company.company_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Contact Selector */}
      {showContact && (
        <div className="flex-1" style={{ position: "relative" }}>
          {showLabels && (
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--neuron-ink-primary)" }}>
              Contact Person <span style={{ color: "#667085", fontWeight: 400, fontSize: "12px" }}>(Optional)</span>
            </label>
          )}
          <Popover open={openContact} onOpenChange={setOpenContact}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                role="combobox"
                aria-expanded={openContact}
                disabled={!companyId || disabled || loadingContacts}
                className="hover:bg-transparent"
                style={buttonStyle}
              >
                {loadingContacts ? (
                  <div className="flex items-center gap-2 text-[#667085]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </div>
                ) : selectedContact ? (
                  <div className="flex items-center gap-2 flex-1">
                    <User className="h-4 w-4 text-[#0F766E]" />
                    <span className="font-medium text-[#12332B]">{selectedContact.name}</span>
                  </div>
                ) : (
                  <span className="text-[#667085]">{disabled ? "—" : "Select contact..."}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#667085]" />
              </Button>
            </PopoverTrigger>
            {/* Clear contact button */}
            {selectedContact && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ company: selectedCompany || null, contact: null });
                }}
                style={{
                  position: "absolute",
                  right: "36px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  color: "#667085",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#EF4444"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#667085"; }}
                title="Clear contact"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-[#667085]" />
                  <input
                    placeholder="Search contacts..."
                    value={searchContact}
                    onChange={(e) => setSearchContact(e.target.value)}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 text-[#12332B]"
                  />
                </div>
                <CommandList>
                  <CommandEmpty className="py-6 text-center text-sm" style={{ color: "#667085" }}>No contacts found.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.id}
                        onSelect={() => {
                          onSelect({ 
                            company: selectedCompany || null,
                            contact: contact 
                          });
                          setOpenContact(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                        style={{ color: "#12332B" }}
                      >
                        <Check
                          className={`h-4 w-4 ${contact.id === contactId ? "opacity-100" : "opacity-0"} text-[#0F766E]`}
                        />
                        <div className="flex flex-col">
                          <span style={{ color: "#12332B" }}>{contact.name}</span>
                          {contact.title && <span className="text-xs" style={{ color: "#667085" }}>{contact.title}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}