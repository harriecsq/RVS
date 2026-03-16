
import { useState } from "react";
// import { QuotationDetail } from "./pricing/QuotationDetail";
// import { QuotationsListWithFilters } from "./pricing/QuotationsListWithFilters";
// import { QuotationBuilderV3 } from "./pricing/quotations/QuotationBuilderV3";
import type { QuotationNew } from "../types/pricing";

export type PricingView = "contacts" | "customers" | "quotations" | "projects" | "vendors" | "reports";

interface PricingProps {
  view?: PricingView;
  onViewInquiry?: (inquiryId: string) => void;
  inquiryId?: string | null;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function Pricing({ view = "quotations", onViewInquiry, inquiryId, currentUser }: PricingProps) {
  
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Pricing Module Unavailable</h2>
        <p className="text-gray-600">
          The Pricing module components are currently missing or have been deprecated in the recent migration.
          Please use the new Project-Centric workflow.
        </p>
      </div>
    </div>
  );
}
