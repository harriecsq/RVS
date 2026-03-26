import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '@/utils/api-config';

interface Client {
  id: string;
  name: string;
  company_name: string;
  industry: string;
  status: string;
}

// Fallback hardcoded clients in case backend is unavailable
const FALLBACK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'ABC Corporation',
    company_name: 'ABC Corporation',
    industry: 'Manufacturing',
    status: 'Active'
  },
  {
    id: 'client-2',
    name: 'XYZ Trading Inc.',
    company_name: 'XYZ Trading Inc.',
    industry: 'Retail',
    status: 'Active'
  },
  {
    id: 'client-3',
    name: 'Global Imports Ltd.',
    company_name: 'Global Imports Ltd.',
    industry: 'Import/Export',
    status: 'Active'
  },
  {
    id: 'client-4',
    name: 'Tech Solutions Co.',
    company_name: 'Tech Solutions Co.',
    industry: 'Technology',
    status: 'Active'
  },
  {
    id: 'client-5',
    name: 'Philippine Exports Inc.',
    company_name: 'Philippine Exports Inc.',
    industry: 'Agriculture',
    status: 'Active'
  }
];

interface ClientSelectorProps {
  value?: string;
  onSelect: (client: Client | null) => void;
  placeholder?: string;
  disabled?: boolean;
  initialClientId?: string;
  initialClientName?: string;
  excludeClientIds?: string[];
  autoOpen?: boolean;
}

export function ClientSelector({ 
  value, 
  onSelect, 
  placeholder = "Select client...", 
  disabled = false,
  initialClientId,
  initialClientName,
  excludeClientIds = [],
  autoOpen = false
}: ClientSelectorProps) {
  const [open, setOpen] = useState(autoOpen);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use either value or initialClientId
  const clientId = value || initialClientId || '';

  useEffect(() => {
    fetchClients();
  }, []);

  // Auto-open when autoOpen prop is true
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[ClientSelector] Fetch result:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        // Only show active clients from backend
        const activeClients = result.data.filter((c: Client) => c.status === 'Active');
        setClients(activeClients);
        console.log(`[ClientSelector] Loaded ${activeClients.length} active clients from backend`);
      } else {
        // No clients in backend, use fallback
        console.log('[ClientSelector] No clients in backend, using fallback clients');
        setClients(FALLBACK_CLIENTS);
      }
    } catch (error) {
      console.error('[ClientSelector] Error fetching clients:', error);
      // Fallback to hardcoded clients
      console.log('[ClientSelector] Using fallback clients due to error');
      setClients(FALLBACK_CLIENTS);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Sort alphabetically by name or company_name
    const nameA = (a.name || a.company_name || '').toLowerCase();
    const nameB = (b.name || b.company_name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  }).filter(client => !excludeClientIds.includes(client.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          style={{
            width: '100%',
            justifyContent: 'space-between',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid #E5E9F0',
            background: disabled ? '#F9FAFB' : '#FFFFFF',
            color: selectedClient ? '#12332B' : '#667085',
            fontWeight: selectedClient ? 500 : 400,
            fontSize: '14px'
          }}
        >
          {loading ? (
            "Loading clients..."
          ) : selectedClient ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 600, color: '#12332B' }}>{selectedClient.name}</span>
              <span style={{ fontSize: '12px', color: '#667085' }}>{selectedClient.industry}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ width: '400px', padding: 0 }}>
        <Command>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E5E9F0', padding: '8px' }}>
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#12332B'
              }}
            />
          </div>
          <CommandEmpty style={{ padding: '16px', textAlign: 'center', color: '#667085', fontSize: '14px' }}>
            No clients found.
          </CommandEmpty>
          <CommandGroup style={{ maxHeight: '300px', overflowY: 'auto', padding: '4px' }}>
            {filteredClients.map((client) => (
              <CommandItem
                key={client.id}
                value={client.id}
                onSelect={() => {
                  onSelect(client.id === value ? null : client);
                  setOpen(false);
                }}
                className="hover:bg-[#E8F5F3] data-[selected=true]:bg-[#E8F5F3]"
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '8px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <Check
                  className={`h-4 w-4 ${client.id === value ? 'opacity-100' : 'opacity-0'}`}
                  style={{ color: '#0F766E' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#12332B', fontSize: '14px' }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#667085' }}>
                    {client.industry}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}