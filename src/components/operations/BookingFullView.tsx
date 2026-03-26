// TODO: Wire up booking fetch from API — currently receives booking=null from App.tsx.
// Needs: fetch by bookingId from URL param, then pass to detail component.
import { ArrowLeft } from "lucide-react";

interface BookingFullViewProps {
  booking: any;
  onBack: () => void;
}

export function BookingFullView({ booking, onBack }: BookingFullViewProps) {
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Booking Details</h1>
          {booking && <p className="text-sm text-gray-500">{booking.id}</p>}
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <p className="mb-2">Booking details component is currently unavailable.</p>
          <button 
            onClick={onBack}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Return to list
          </button>
        </div>
      </div>
    </div>
  );
}
