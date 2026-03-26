import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from '@/utils/api-config';

interface Booking {
  id: string;
  trackingNo: string;
  client: string;
  clientName?: string;
  shipper?: string;
  status: string;
  bl_number?: string;
  awbBlNo?: string;
  booking_number?: string;
  shipmentType?: string;
  mode?: string;
}

interface BookingSelectorProps {
  value?: string;
  onSelect: (booking: Booking | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function BookingSelector({
  value,
  onSelect,
  className,
  placeholder = "Select booking...",
  disabled = false
}: BookingSelectorProps) {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        // Use the new unified endpoint with retry logic for transient failures
        let response: Response | null = null;
        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await fetch(`${API_BASE_URL}/bookings`, {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            });
            break; // Success, exit retry loop
          } catch (fetchErr) {
            lastError = fetchErr;
            console.warn(`Booking fetch attempt ${attempt + 1} failed:`, fetchErr);
            if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        
        if (!response) throw lastError || new Error("Failed to fetch bookings after retries");
        if (!response.ok) throw new Error("Failed to fetch bookings");
        
        const result = await response.json();
        if (result.success) {
          const mappedBookings = result.data.map((b: any) => ({
            ...b, // Spread original properties
            id: b.id || b.bookingId,
            trackingNo: b.trackingNumber || b.trackingNo || b.booking_number || b.id || b.bookingId,
            client: b.client || b.clientName || b.customerName || b.customer_name || b.shipper || "Unknown Client",
            status: b.status,
            bl_number: b.bl_number || b.blNumber || b.awbBlNo || b.awb_bl_no || "",
            shipmentType: b.shipmentType || b.booking_type || "Unknown",
            mode: b.mode || "Unknown"
          }));
          // Sort by most recent first (using createdAt, created_at, or date fields)
          mappedBookings.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.created_at || a.date || a.bookingDate || a.booking_date || 0).getTime();
            const dateB = new Date(b.createdAt || b.created_at || b.date || b.bookingDate || b.booking_date || 0).getTime();
            return dateB - dateA;
          });
          setBookings(mappedBookings);
        }
      } catch (error) {
        console.error("Error loading bookings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if ((open || (value && bookings.length === 0)) && !isLoading) {
      fetchBookings();
    }
  }, [open, value]);

  const selectedBooking = bookings.find((b) => b.id === value) || null;

  const filteredBookings = bookings.filter((booking) => {
    const searchLower = searchQuery.toLowerCase();
    const trackingNo = booking.trackingNo || "";
    const client = booking.client || "";
    const blNumber = booking.bl_number || "";
    
    return (
      trackingNo.toLowerCase().includes(searchLower) ||
      client.toLowerCase().includes(searchLower) ||
      (blNumber && blNumber.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-11 text-left font-normal border-[#E5E9F0] bg-white hover:bg-[#F9FAFB]", className)}
          disabled={disabled}
        >
          {selectedBooking ? (
            <div className="flex flex-col items-start gap-0.5 overflow-hidden">
              <span className="font-medium text-[#12332B] truncate w-full flex items-center gap-2">
                {selectedBooking.trackingNo}
              </span>
              <span className="text-xs text-[#667085] truncate w-full">
                {selectedBooking.client} {selectedBooking.bl_number ? `• BL: ${selectedBooking.bl_number}` : ""}
              </span>
            </div>
          ) : (
            <span className="text-[#667085]">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-[9999]" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search by Booking Ref, BL Number, or Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading bookings...</div>
            ) : filteredBookings.length === 0 ? (
              <CommandEmpty>No booking found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredBookings.slice(0, 50).map((booking, index) => (
                  <CommandItem
                    key={`${booking.id}-${index}`}
                    value={booking.id}
                    onSelect={() => {
                      onSelect(booking);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-medium text-[#12332B]">
                        <span>{booking.trackingNo}</span>
                        {booking.id === value && <Check className="h-4 w-4 ml-2 text-[#0F766E]" />}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#667085]">
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#667085] w-full truncate">
                      <span className="font-medium text-[#4B5563]">{booking.client}</span>
                      {booking.bl_number && (
                        <>
                          <span className="mx-1">•</span>
                          <span>BL: {booking.bl_number}</span>
                        </>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}