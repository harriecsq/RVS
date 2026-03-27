import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, DollarSign } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { formatAmount } from "../../utils/formatAmount";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface LineItem {
  id: string;
  particulars: string;
  unitPrice: number;
  per: "40" | "BL";
  autoMultiply: boolean;     // NEW: Per-item toggle (default: true)
  manualAmount: number;      // NEW: Manual override amount
  currency: string;
  voucherNo: string;
}

interface Category {
  id: string;
  name: string;
  items: LineItem[];
  isExpanded: boolean;
}

interface ChargeCategoriesProps {
  containerCount?: number;
  onChange?: (categories: Category[]) => void;
  onChargesChange?: (charges: any[]) => void;  // New prop to send formatted charges
}

const CURRENCIES = ["USD", "PHP", "EUR", "GBP", "JPY"];

const AVAILABLE_CATEGORIES = [
  "SHIPPING",
  "CUSTOMS",
  "PORT CHARGES",
  "FORM E",
  "MISCELLANEOUS",
  "TRUCKING",
];

export function ChargeCategories({ containerCount = 0, onChange, onChargesChange }: ChargeCategoriesProps) {
  const [mainCurrency, setMainCurrency] = useState("PHP");
  const [categories, setCategories] = useState<Category[]>([]);

  const handleCategoriesChange = (newCategories: Category[]) => {
    setCategories(newCategories);
    onChange?.(newCategories);
    
    // Format and send charges to parent
    const formattedCharges = newCategories.flatMap((category) =>
      category.items.map((item) => ({
        category: category.name,
        description: item.particulars,
        amount: calculateItemAmount(item),
        unitPrice: item.unitPrice,
        per: item.per,
        currency: item.currency,
        voucherNo: item.voucherNo,
      }))
    );
    onChargesChange?.(formattedCharges);
  };

  const handleMainCurrencyChange = (newCurrency: string) => {
    setMainCurrency(newCurrency);
    
    // Update all line items to use the new currency
    const updatedCategories = categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        currency: newCurrency,
      })),
    }));
    
    handleCategoriesChange(updatedCategories);
  };

  const addCategory = (categoryName: string) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: categoryName,
      items: [],
      isExpanded: true,
    };
    handleCategoriesChange([...categories, newCategory]);
  };

  // Get categories that haven't been added yet
  const getAvailableCategoriesToAdd = () => {
    const existingNames = categories.map((cat) => cat.name);
    return AVAILABLE_CATEGORIES.filter((name) => !existingNames.includes(name));
  };

  const formatCategoryName = (categoryName: string) => {
    if (categoryName === "FORM E") {
      return "Form E";
    }
    if (categoryName === "PORT CHARGES") {
      return "Port Charges";
    }
    return categoryName.charAt(0) + categoryName.slice(1).toLowerCase();
  };

  const deleteCategory = (categoryId: string) => {
    handleCategoriesChange(categories.filter((cat) => cat.id !== categoryId));
  };

  const toggleCategory = (categoryId: string) => {
    handleCategoriesChange(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    );
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    handleCategoriesChange(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, name: newName } : cat
      )
    );
  };

  const addItem = (categoryId: string) => {
    const newItem: LineItem = {
      id: `${categoryId}-${Date.now()}`,
      particulars: "",
      unitPrice: 0,
      per: "40",
      autoMultiply: true,     // NEW: Default ON
      manualAmount: 0,        // NEW: Default 0
      currency: mainCurrency,
      voucherNo: "",
    };

    handleCategoriesChange(
      categories.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: [...cat.items, newItem] }
          : cat
      )
    );
  };

  const deleteItem = (categoryId: string, itemId: string) => {
    handleCategoriesChange(
      categories.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
          : cat
      )
    );
  };

  const updateItem = (
    categoryId: string,
    itemId: string,
    field: keyof LineItem,
    value: any
  ) => {
    handleCategoriesChange(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) => {
                if (item.id === itemId) {
                  const updatedItem = { ...item, [field]: value };
                  
                  // Special handling for autoMultiply toggle
                  if (field === "autoMultiply") {
                    if (value === false) {
                      // Unchecked: Pre-fill manualAmount with unitPrice
                      updatedItem.manualAmount = item.unitPrice;
                    } else {
                      // Checked: Clear manualAmount
                      updatedItem.manualAmount = 0;
                    }
                  }
                  
                  return updatedItem;
                }
                return item;
              }),
            }
          : cat
      )
    );
  };

  const calculateItemAmount = (item: LineItem) => {
    if (item.per === "40") {
      if (item.autoMultiply) {
        // AUTO-MULTIPLY ON: Use calculated amount (unitPrice × containerCount)
        return item.unitPrice * containerCount;
      } else {
        // AUTO-MULTIPLY OFF: Use manual amount
        return item.manualAmount;
      }
    } else {
      // Per is "BL": Just unit price (no multiplication)
      return item.unitPrice;
    }
  };

  const calculateContainerMultipliedAmount = (item: LineItem) => {
    // Only multiply if: (1) Per is "40", AND (2) Toggle is enabled
    if (item.per === "40" && item.autoMultiply) {
      // If "40" is chosen AND toggle is ON: Unit Price × Number of containers
      return item.unitPrice * containerCount;
    } else {
      // If toggle is OFF or Per is "BL": Return 0 (will display as "-")
      return 0;
    }
  };

  const calculateCategoryTotal = (category: Category) => {
    return category.items.reduce(
      (sum, item) => sum + calculateItemAmount(item),
      0
    );
  };

  const calculateGrandTotal = () => {
    return categories.reduce(
      (sum, category) => sum + calculateCategoryTotal(category),
      0
    );
  };

  return (
    <div className="border border-[#E5E9F0] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E9F0] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#0F766E]" />
          <h3 className="text-[#0A1D4D] font-semibold">
            CHARGE CATEGORIES & LINE ITEMS
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Set default currency */}
          <Select value={mainCurrency} onValueChange={handleMainCurrencyChange}>
            <SelectTrigger className="w-24 border-[#E5E9F0] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent zIndex="z-[1100]">
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Category button */}
          <Select
            value=""
            onValueChange={(value) => {
              if (value) {
                addCategory(value);
              }
            }}
          >
            <SelectTrigger className="w-44 h-9 bg-[#0F766E] hover:bg-[#0d6560] border-[#0F766E] [&>span]:text-white [&_svg]:text-white">
              <div className="flex items-center text-white">
                <Plus className="w-4 h-4 mr-1 text-white" />
                <span className="text-white font-medium">Add Category</span>
              </div>
            </SelectTrigger>
            <SelectContent zIndex="z-[1100]">
              {getAvailableCategoriesToAdd().length > 0 ? (
                getAvailableCategoriesToAdd().map((categoryName) => (
                  <SelectItem key={categoryName} value={categoryName}>
                    {formatCategoryName(categoryName)}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-[#667085]">
                  All categories added
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-[#FAFBFC]">
        {categories.map((category) => (
          <div
            key={category.id}
            className="border-b border-[#E5E9F0] last:border-b-0"
          >
            {/* Category Header */}
            <div className="bg-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="text-[#667085] hover:text-[#0A1D4D]"
                >
                  {category.isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <Input
                  value={category.name}
                  onChange={(e) =>
                    updateCategoryName(category.id, e.target.value.toUpperCase())
                  }
                  className="font-semibold text-[#0A1D4D] border-0 shadow-none focus-visible:ring-0 px-0 h-auto uppercase max-w-xs"
                />
                <span className="text-sm text-[#667085]">
                  ({category.items.length} item{category.items.length !== 1 ? "s" : ""})
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => addItem(category.id)}
                  variant="outline"
                  size="sm"
                  className="border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5 h-8"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
                <div className="text-[#0F766E] font-semibold min-w-24 text-right">
                  {mainCurrency} {formatAmount(calculateCategoryTotal(category))}
                </div>
                <button
                  type="button"
                  onClick={() => deleteCategory(category.id)}
                  className="text-[#EF4444] hover:bg-red-50 p-1.5 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Line Items */}
            {category.isExpanded && (
              <div className="bg-white">
                {category.items.length > 0 && (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-[2.5fr_0.8fr_0.6fr_0.5fr_0.8fr_1fr_1.2fr_1fr_auto] gap-2 px-4 py-2 bg-[#FAFBFC] border-y border-[#E5E9F0] text-xs text-[#667085] font-medium">
                      <div>Particulars</div>
                      <div>Unit Price</div>
                      <div>Per</div>
                      <div>Auto</div>
                      <div>Currency</div>
                      <div>{containerCount}X40'HC</div>
                      <div>Voucher No</div>
                      <div className="text-right">Voucher Amount</div>
                      <div></div>
                    </div>

                    {/* Items */}
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[2.5fr_0.8fr_0.6fr_0.5fr_0.8fr_1fr_1.2fr_1fr_auto] gap-2 px-4 py-3 border-b border-[#E5E9F0] last:border-b-0 items-center"
                      >
                        {/* Particulars */}
                        <Input
                          value={item.particulars}
                          onChange={(e) =>
                            updateItem(
                              category.id,
                              item.id,
                              "particulars",
                              e.target.value
                            )
                          }
                          placeholder="Enter particulars..."
                          className="border-[#E5E9F0] h-9 text-sm"
                        />

                        {/* Unit Price */}
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateItem(
                              category.id,
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="border-[#E5E9F0] h-9 text-sm text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />

                        {/* Per */}
                        <Select
                          value={item.per}
                          onValueChange={(value) =>
                            updateItem(category.id, item.id, "per", value)
                          }
                        >
                          <SelectTrigger className="border-[#E5E9F0] h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent zIndex="z-[1100]">
                            <SelectItem value="40">40'HC</SelectItem>
                            <SelectItem value="BL">BL</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Auto Multiply Toggle */}
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={item.autoMultiply}
                            disabled={item.per === "BL"}
                            onChange={(e) =>
                              updateItem(
                                category.id,
                                item.id,
                                "autoMultiply",
                                e.target.checked
                              )
                            }
                            className={`w-4 h-4 rounded focus:ring-2 focus:ring-[#0F766E] cursor-pointer accent-[#0F766E] ${
                              item.per === "BL"
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          />
                        </div>

                        {/* Currency */}
                        <Select
                          value={item.currency}
                          onValueChange={(value) =>
                            updateItem(category.id, item.id, "currency", value)
                          }
                        >
                          <SelectTrigger className="border-[#E5E9F0] h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent zIndex="z-[1100]">
                            {CURRENCIES.map((curr) => (
                              <SelectItem key={curr} value={curr}>
                                {curr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Container Multiplier (#X40'HC) - Conditional: Read-only or Editable */}
                        {item.autoMultiply ? (
                          // AUTO-MULTIPLY ON: Read-only, show calculated value
                          <div className="text-sm text-[#0A1D4D] font-medium text-center bg-[#FAFBFC] px-3 py-2 rounded border border-[#E5E9F0]">
                            {item.per === "40"
                              ? formatAmount(item.unitPrice * containerCount)
                              : "-"}
                          </div>
                        ) : (
                          // AUTO-MULTIPLY OFF: Editable input for manual amount
                          <Input
                            type="number"
                            step="0.01"
                            value={item.manualAmount || ""}
                            onChange={(e) =>
                              updateItem(
                                category.id,
                                item.id,
                                "manualAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="border-[#E5E9F0] h-9 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                        )}

                        {/* Voucher No */}
                        <div className="text-sm text-[#667085] px-3 py-2 rounded border border-[#E5E9F0] bg-[#FAFBFC] h-9 flex items-center">
                          {item.voucherNo || "-"}
                        </div>

                        {/* Voucher Amount */}
                        <div className="text-sm text-[#0A1D4D] font-medium text-right">
                          {formatAmount(calculateItemAmount(item))}
                        </div>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => deleteItem(category.id, item.id)}
                          className="text-[#EF4444] hover:bg-red-50 p-1.5 rounded ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grand Total */}
      <div className="bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#0F766E]" />
          <h3 className="text-[#0A1D4D] font-semibold">
            GRAND TOTAL
          </h3>
        </div>
        <div className="text-[#0F766E] font-semibold min-w-24 text-right">
          {mainCurrency} {formatAmount(calculateGrandTotal())}
        </div>
      </div>
    </div>
  );
}