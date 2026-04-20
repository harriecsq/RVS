export interface SignatorySlot {
  name: string;
  title: string;
  signaturePng?: string; // base64 data URL
}

export type StampPosition = "header-right" | "footer-center" | "over-signatures";

export interface StampSlot {
  pngData?: string; // base64 data URL
  position?: StampPosition;
}

export interface DocumentSettings {
  logoPng?: string; // base64 PNG — company letterhead/logo image shown at top of all templates
  signatories: {
    preparedBy?: SignatorySlot;
    approvedBy?: SignatorySlot;
    conforme?: SignatorySlot;
  };
  // Per-document stamps: keyed by a label (e.g. "buyer", "seller", "supplier", "company")
  stamps?: Record<string, StampSlot>;
  // Legacy single stamp — kept for backward compat, prefer stamps map
  stamp?: StampSlot;
  display: {
    showBankDetails: boolean;
    showTerms: boolean;
    showFooter: boolean;
  };
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  signatories: {},
  stamp: {},
  stamps: {},
  display: {
    showBankDetails: true,
    showTerms: true,
    showFooter: true,
  },
};
