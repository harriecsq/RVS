import { toast } from 'sonner@2.0.3';
import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, Plus } from 'lucide-react';
import { PortalDropdown } from '../shared/PortalDropdown';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '@/utils/api-config';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPayees();
  }, []);

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
        `${API_BASE_URL}/payees`,
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
        `${API_BASE_URL}/payees`,
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

  const triggerStyles: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid #E5E9F0',
    background: disabled ? '#F9FAFB' : '#FFFFFF',
    color: value ? '#12332B' : '#9CA3AF',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: disabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    gap: '8px',
    opacity: disabled ? 0.7 : 1,
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); setSearchQuery(''); } }}
        style={triggerStyles}
        className={className}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {loading ? 'Loading...' : value || placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
      </button>

      <PortalDropdown
        isOpen={open}
        onClose={() => { setOpen(false); setSearchQuery(''); }}
        triggerRef={triggerRef}
        minWidth="280px"
        align="left"
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #E5E9F0', gap: '8px' }}>
          <Search size={16} style={{ flexShrink: 0, opacity: 0.4, color: '#667085' }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search or type to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canAddNew) { e.preventDefault(); handleAddPayee(); } }}
            autoFocus
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#0A1D4D', background: 'transparent' }}
          />
        </div>

        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
          {canAddNew && (
            <div
              onClick={handleAddPayee}
              style={{
                padding: '10px 12px', cursor: isAdding ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '14px', color: '#237F66',
                borderBottom: '1px solid #E5E9F0',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8F2EE'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Plus size={14} style={{ flexShrink: 0 }} />
              <span>{isAdding ? 'Adding...' : `Add "${searchQuery.trim()}"`}</span>
            </div>
          )}

          {filteredPayees.length === 0 && !canAddNew ? (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
              {loading ? 'Loading payees...' : 'No payees found. Type to add a new one.'}
            </div>
          ) : (
            filteredPayees.map((payee, idx) => {
              const isSelected = value === payee.name;
              const isLast = idx === filteredPayees.length - 1;
              return (
                <div
                  key={payee.id}
                  onClick={() => { onSelect(isSelected ? '' : payee.name); setOpen(false); setSearchQuery(''); }}
                  style={{
                    padding: '10px 12px', cursor: 'pointer', fontSize: '14px', color: '#12332B',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    backgroundColor: isSelected ? '#E8F2EE' : 'transparent',
                    borderBottom: isLast ? 'none' : '1px solid #E5E9F0',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? '#E8F2EE' : 'transparent'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {payee.name}
                    </div>
                    {payee.type && <div style={{ fontSize: '12px', color: '#6B7A76' }}>{payee.type}</div>}
                  </div>
                  {isSelected && <Check size={14} style={{ flexShrink: 0, color: '#237F66' }} />}
                </div>
              );
            })
          )}
        </div>
      </PortalDropdown>
    </div>
  );
}