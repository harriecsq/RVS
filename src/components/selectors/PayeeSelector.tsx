import { toast } from 'sonner@2.0.3';
import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Payee {
  id: string;
  name: string;
  type?: string; // e.g. "Vendor", "Contractor", "Employee", "Shipping Line", "Trucker"
  status?: string;
}

interface PayeeSelectorProps {
  value: string; // The payee name string
  onSelect: (payeeName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Tailwind/inline class for the trigger button */
  className?: string;
  /** Use inline styles matching neuron design tokens (for ViewVoucherScreen) */
  useInlineStyles?: boolean;
}

export function PayeeSelector({
  value,
  onSelect,
  placeholder = "Select payee...",
  disabled = false,
  className,
  useInlineStyles = false,
}: PayeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPayees();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const fetchPayees = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8/payees`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        setPayees(result.data);
      } else {
        setPayees([]);
      }
    } catch (error) {
      console.error('[PayeeSelector] Error fetching payees:', error);
      setPayees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayees = payees
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.type || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Check if search query exactly matches an existing payee (case-insensitive)
  const exactMatch = payees.some(
    (p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );
  const canAddNew = searchQuery.trim().length > 0 && !exactMatch;

  const handleAddPayee = async () => {
    const name = searchQuery.trim();
    if (!name) return;
    setIsAdding(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8/payees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        }
      );
      const result = await response.json();
      if (result.success && result.data) {
        setPayees((prev) => [...prev, result.data]);
        onSelect(result.data.name);
        setOpen(false);
        setSearchQuery('');
        toast.success(`Payee "${name}" added`);
      } else {
        toast.error(result.error || 'Failed to add payee');
      }
    } catch (error) {
      console.error('[PayeeSelector] Error adding payee:', error);
      toast.error('Failed to add payee');
    } finally {
      setIsAdding(false);
    }
  };

  const triggerStyles: React.CSSProperties = useInlineStyles
    ? {
        width: '100%',
        height: '42px',
        padding: '0 14px',
        borderRadius: '6px',
        border: '1px solid #E5E9F0',
        background: disabled ? '#F9FAFB' : '#FFFFFF',
        color: value ? '#12332B' : '#667085',
        fontWeight: value ? 500 : 400,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        transition: 'border-color 0.15s ease',
      }
    : {
        width: '100%',
        height: '40px',
        padding: '0 12px',
        borderRadius: '12px',
        border: '1px solid #E5E9F0',
        background: disabled ? '#F9FAFB' : '#FFFFFF',
        color: value ? '#12332B' : '#667085',
        fontWeight: value ? 500 : 400,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        transition: 'border-color 0.15s ease',
      };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setSearchQuery('');
          }
        }}
        style={triggerStyles}
        className={className}
        onMouseEnter={(e) => {
          if (!disabled) (e.currentTarget as HTMLButtonElement).style.borderColor = '#0F766E';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E9F0';
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Loading...' : value || placeholder}
        </span>
        <ChevronsUpDown
          size={16}
          style={{ flexShrink: 0, opacity: 0.5, marginLeft: '8px' }}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: '280px',
            background: 'white',
            border: '1px solid #E5E9F0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderBottom: '1px solid #E5E9F0',
              gap: '8px',
            }}
          >
            <Search size={16} style={{ flexShrink: 0, opacity: 0.4, color: '#667085' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or type to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canAddNew) {
                  e.preventDefault();
                  handleAddPayee();
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#12332B',
                background: 'transparent',
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '4px' }}>
            {/* Add new payee option */}
            {canAddNew && (
              <div
                onClick={handleAddPayee}
                style={{
                  padding: '10px 12px',
                  cursor: isAdding ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderRadius: '8px',
                  transition: 'background-color 0.15s ease',
                  background: 'transparent',
                  borderBottom: filteredPayees.length > 0 ? '1px solid #E5E9F0' : 'none',
                  marginBottom: filteredPayees.length > 0 ? '4px' : '0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0FDF4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Plus
                  size={16}
                  style={{ flexShrink: 0, color: '#0F766E' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#0F766E', fontSize: '14px' }}>
                    {isAdding ? 'Adding...' : `Add "${searchQuery.trim()}"`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#667085' }}>
                    Save as new payee
                  </div>
                </div>
              </div>
            )}

            {filteredPayees.length === 0 && !canAddNew ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                {loading ? 'Loading payees...' : 'No payees found. Type to add a new one.'}
              </div>
            ) : (
              filteredPayees.map((payee) => {
                const isSelected = value === payee.name;
                return (
                  <div
                    key={payee.id}
                    onClick={() => {
                      onSelect(isSelected ? '' : payee.name);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderRadius: '8px',
                      transition: 'background-color 0.15s ease',
                      background: isSelected ? '#E8F5F3' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? '#E8F5F3' : 'transparent';
                    }}
                  >
                    <Check
                      size={16}
                      style={{
                        flexShrink: 0,
                        color: '#0F766E',
                        opacity: isSelected ? 1 : 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#12332B',
                          fontSize: '14px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {payee.name}
                      </div>
                      {payee.type && (
                        <div style={{ fontSize: '12px', color: '#667085' }}>{payee.type}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}