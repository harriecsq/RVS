import { createContext, useContext, useState, useCallback } from "react";
import type { TemplateDocType } from "../../../types/document-templates";
import { extractTemplatableFields } from "../../../constants/template-excluded-fields";

interface TemplateSaveState {
  /** Whether template-save mode is active */
  active: boolean;
  /** Set of field keys currently selected (included) */
  selectedFields: Set<string>;
  /** All templatable field keys with their values */
  templatableFields: Record<string, any>;
  /** Toggle a single field */
  toggleField: (key: string) => void;
  /** Check if a field key is selected */
  isFieldSelected: (key: string) => boolean;
  /** Check if a field key is templatable (eligible for selection) */
  isTemplatable: (key: string) => boolean;
}

const TemplateSaveContext = createContext<TemplateSaveState>({
  active: false,
  selectedFields: new Set(),
  templatableFields: {},
  toggleField: () => {},
  isFieldSelected: () => false,
  isTemplatable: () => false,
});

export function useTemplateSave() {
  return useContext(TemplateSaveContext);
}

interface TemplateSaveProviderProps {
  active: boolean;
  docType: TemplateDocType | null;
  docData: Record<string, any>;
  selectedFields: Set<string>;
  onToggleField: (key: string) => void;
  children: React.ReactNode;
}

export function TemplateSaveProvider({
  active,
  docType,
  docData,
  selectedFields,
  onToggleField,
  children,
}: TemplateSaveProviderProps) {
  const templatableFields = docType ? extractTemplatableFields(docType, docData) : {};

  const isFieldSelected = useCallback(
    (key: string) => selectedFields.has(key),
    [selectedFields]
  );

  const isTemplatable = useCallback(
    (key: string) => key in templatableFields,
    [templatableFields]
  );

  return (
    <TemplateSaveContext.Provider
      value={{
        active,
        selectedFields,
        templatableFields,
        toggleField: onToggleField,
        isFieldSelected,
        isTemplatable,
      }}
    >
      {children}
    </TemplateSaveContext.Provider>
  );
}
