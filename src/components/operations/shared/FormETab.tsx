import { useState, useEffect } from "react";
import { Plus, FileText, Save, Trash2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "../../ui/toast-utils";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { API_BASE_URL } from '@/utils/api-config';

interface FormETabProps {
  bookingId: string;
  currentUser?: { name: string; email: string; department: string } | null;
}

interface FormEItem {
  id: string;
  marksAndNumbers: string;
  numberOfPackages: string;
  description: string;
  originCriterion: string;
  grossWeight: string;
  invoiceNumber: string;
}

interface FormEData {
  id?: string;
  bookingId: string;
  referenceNo: string;
  exporterName: string;
  exporterAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  meansOfTransport: string;
  departureDate: string;
  vesselName: string;
  portOfDischarge: string;
  portOfDischargeCountry: string;
  items: FormEItem[];
  declarationByExporter: string;
  declarationPlace: string;
  declarationDate: string;
  certification: string;
  certificationPlace: string;
  certificationDate: string;
  authorizedSignatory: string;
  createdAt?: string;
  updatedAt?: string;
}

export function FormETab({ bookingId, currentUser }: FormETabProps) {
  const [formEData, setFormEData] = useState<FormEData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<FormEData>({
    bookingId,
    referenceNo: "",
    exporterName: "",
    exporterAddress: "",
    consigneeName: "",
    consigneeAddress: "",
    consigneeCountry: "",
    meansOfTransport: "SEAFREIGHT",
    departureDate: "",
    vesselName: "",
    portOfDischarge: "",
    portOfDischargeCountry: "",
    items: [
      {
        id: "1",
        marksAndNumbers: "",
        numberOfPackages: "",
        description: "",
        originCriterion: "",
        grossWeight: "",
        invoiceNumber: "",
      },
    ],
    declarationByExporter: "The undersigned hereby declares that the above details and statements are correct; that all the goods were produced in",
    declarationPlace: "PHILIPPINES",
    declarationDate: "",
    certification: "It is hereby certified, on the basis of control carried out, that the declaration by the exporter is correct.",
    certificationPlace: "XIAMEN, CHINA",
    certificationDate: "",
    authorizedSignatory: "MANILA, PHILIPPINES",
  });

  useEffect(() => {
    fetchFormE();
  }, [bookingId]);

  const fetchFormE = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/form-e?bookingId=${bookingId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setFormEData(result.data);
        setFormData(result.data);
      } else {
        setFormEData(null);
      }
    } catch (error) {
      console.error("Error fetching Form E:", error);
      setFormEData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = formEData?.id ? "PUT" : "POST";
      const url = formEData?.id
        ? `${API_BASE_URL}/form-e/${formEData.id}`
        : `${API_BASE_URL}/form-e`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          formEData?.id
            ? "Form E updated successfully"
            : "Form E created successfully"
        );
        setFormEData(result.data);
        setFormData(result.data);
        setIsEditing(false);
        await fetchFormE();
      } else {
        throw new Error(result.error || "Failed to save Form E");
      }
    } catch (error) {
      console.error("Error saving Form E:", error);
      toast.error("Failed to save Form E");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          id: Date.now().toString(),
          marksAndNumbers: "",
          numberOfPackages: "",
          description: "",
          originCriterion: "",
          grossWeight: "",
          invoiceNumber: "",
        },
      ],
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item) => item.id !== itemId),
    });
  };

  const handleItemChange = (
    itemId: string,
    field: keyof FormEItem,
    value: string
  ) => {
    setFormData({
      ...formData,
      items: formData.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-[#12332B]/60">Loading Form E...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px" }}>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[#12332B] text-[18px] font-semibold mb-2">
              Form E - Certificate of Origin
            </h3>
            <p className="text-[#12332B]/60 text-[14px] leading-[20px]">
              ASEAN-China Free Trade Area Preferential Tariff Certificate of Origin
            </p>
          </div>
          {!formEData && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0F766E]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Form E
            </button>
          ) : formEData && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#0F766E] text-[#0F766E] rounded-lg hover:bg-[#0F766E]/5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Edit Form E
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (formEData) {
                    setFormData(formEData);
                  }
                }}
                className="px-4 py-2 border border-[#12332B]/20 text-[#12332B] rounded-lg hover:bg-[#12332B]/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0F766E]/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Form E"}
              </button>
            </div>
          )}
        </div>

        {/* Form E Content */}
        {!formEData && !isEditing ? (
          <div className="flex flex-col items-center justify-center h-64 border border-[#12332B]/10 rounded-lg">
            <FileText className="w-12 h-12 text-[#12332B]/20 mb-4" />
            <div className="text-[#12332B]/60 mb-2">No Form E certificate yet</div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-[#0F766E] hover:underline"
            >
              Create Form E certificate
            </button>
          </div>
        ) : (
          <div className="border border-[#12332B]/10 rounded-lg overflow-hidden bg-white">
            <div className="p-6 space-y-6">
              {/* Reference Number */}
              <div className="flex justify-between items-start pb-4 border-b border-[#12332B]/10">
                <div>
                  <h4 className="text-[#12332B] font-semibold mb-1">Duplicate</h4>
                </div>
                <div className="text-right">
                  <Label className="text-[12px] text-[#667085] mb-1">Reference No.</Label>
                  {isEditing ? (
                    <Input
                      value={formData.referenceNo}
                      onChange={(e) =>
                        setFormData({ ...formData, referenceNo: e.target.value })
                      }
                      placeholder="00284415042"
                      className="text-right"
                    />
                  ) : (
                    <div className="text-[#12332B] font-mono">{formData.referenceNo || "—"}</div>
                  )}
                </div>
              </div>

              {/* Section 1: Exporter Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    1. Goods consigned from (Exporter's business name, address, country)
                  </Label>
                  {isEditing ? (
                    <>
                      <Input
                        value={formData.exporterName}
                        onChange={(e) =>
                          setFormData({ ...formData, exporterName: e.target.value })
                        }
                        placeholder="Company Name"
                        className="mb-2"
                      />
                      <Textarea
                        value={formData.exporterAddress}
                        onChange={(e) =>
                          setFormData({ ...formData, exporterAddress: e.target.value })
                        }
                        placeholder="Complete address"
                        rows={4}
                      />
                    </>
                  ) : (
                    <div className="text-[#12332B] text-sm">
                      <div className="font-semibold">{formData.exporterName || "—"}</div>
                      <div className="whitespace-pre-line mt-1">
                        {formData.exporterAddress || "—"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Consignee Details */}
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    2. Goods consigned to (Consignee's name, address, country)
                  </Label>
                  {isEditing ? (
                    <>
                      <Input
                        value={formData.consigneeName}
                        onChange={(e) =>
                          setFormData({ ...formData, consigneeName: e.target.value })
                        }
                        placeholder="Company Name"
                        className="mb-2"
                      />
                      <Textarea
                        value={formData.consigneeAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consigneeAddress: e.target.value,
                          })
                        }
                        placeholder="Complete address"
                        rows={3}
                        className="mb-2"
                      />
                      <Input
                        value={formData.consigneeCountry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consigneeCountry: e.target.value,
                          })
                        }
                        placeholder="Country"
                      />
                    </>
                  ) : (
                    <div className="text-[#12332B] text-sm">
                      <div className="font-semibold">{formData.consigneeName || "—"}</div>
                      <div className="whitespace-pre-line mt-1">
                        {formData.consigneeAddress || "—"}
                      </div>
                      <div className="mt-1">{formData.consigneeCountry || "—"}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3 & 4: Transport Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    3. Means of transport and route (as far as known)
                  </Label>
                  {isEditing ? (
                    <>
                      <Input
                        value={formData.meansOfTransport}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            meansOfTransport: e.target.value,
                          })
                        }
                        placeholder="SEAFREIGHT"
                        className="mb-2"
                      />
                      <Label className="text-[12px] text-[#667085] mb-1 block">
                        Departure Date
                      </Label>
                      <Input
                        type="date"
                        value={formData.departureDate}
                        onChange={(e) =>
                          setFormData({ ...formData, departureDate: e.target.value })
                        }
                      />
                    </>
                  ) : (
                    <div className="text-[#12332B] text-sm">
                      <div className="font-semibold">{formData.meansOfTransport || "—"}</div>
                      <div className="mt-2">
                        {formData.departureDate
                          ? formatDate(formData.departureDate)
                          : "—"}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    4. For Official Use
                  </Label>
                  <div className="text-[#12332B]/40 text-sm italic">
                    Preferential Treatment Given
                  </div>
                  <div className="text-[#12332B]/40 text-sm italic mt-4">
                    Preferential Treatment Not Given (Please state reason/s)
                  </div>
                </div>
              </div>

              {/* Vessel and Port Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    Vessel Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.vesselName}
                      onChange={(e) =>
                        setFormData({ ...formData, vesselName: e.target.value })
                      }
                      placeholder="OSG ADMIRAL V-2545N"
                    />
                  ) : (
                    <div className="text-[#12332B] font-semibold">
                      {formData.vesselName || "—"}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    Signature of Authorized Signatory of the Exporting Party
                  </Label>
                  <div className="text-[#12332B]/60 text-sm italic">
                    {formData.authorizedSignatory || "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    Port of Discharge
                  </Label>
                  {isEditing ? (
                    <>
                      <Input
                        value={formData.portOfDischarge}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portOfDischarge: e.target.value,
                          })
                        }
                        placeholder="XIAMEN"
                        className="mb-2"
                      />
                      <Input
                        value={formData.portOfDischargeCountry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portOfDischargeCountry: e.target.value,
                          })
                        }
                        placeholder="CHINA"
                      />
                    </>
                  ) : (
                    <div className="text-[#12332B] font-semibold">
                      {formData.portOfDischarge
                        ? `${formData.portOfDischarge}, ${formData.portOfDischargeCountry}`
                        : "—"}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 8: Items Table */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block">
                  8. Item description
                </Label>
                <div className="border border-[#12332B]/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#12332B]/[0.02]">
                      <tr className="border-b border-[#12332B]/10">
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[5%]">
                          No.
                        </th>
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[15%]">
                          Marks and Numbers
                        </th>
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[10%]">
                          Number & Type of Packages
                        </th>
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[30%]">
                          Description of Goods
                        </th>
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[15%]">
                          Origin Criterion
                        </th>
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[10%]">
                          Gross Weight
                        </th>
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs w-[10%]">
                          Invoice No.
                        </th>
                        {isEditing && (
                          <th className="w-[5%]"></th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr
                          key={item.id}
                          className="border-b border-[#12332B]/5"
                        >
                          <td className="px-3 py-2 text-[#12332B] align-top">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Input
                                value={item.marksAndNumbers}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "marksAndNumbers",
                                    e.target.value
                                  )
                                }
                                placeholder="N/M"
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {item.marksAndNumbers || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Input
                                value={item.numberOfPackages}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "numberOfPackages",
                                    e.target.value
                                  )
                                }
                                placeholder="2420 BAGS"
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {item.numberOfPackages || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Textarea
                                value={item.description}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="SHIPPERS LOAD COUNT AND SEALED SAID TO CONTAIN..."
                                rows={3}
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs whitespace-pre-line">
                                {item.description || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Input
                                value={item.originCriterion}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "originCriterion",
                                    e.target.value
                                  )
                                }
                                placeholder="WO"
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {item.originCriterion || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Input
                                value={item.grossWeight}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "grossWeight",
                                    e.target.value
                                  )
                                }
                                placeholder="75,240.00 KGS"
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {item.grossWeight || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Input
                                value={item.invoiceNumber}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "invoiceNumber",
                                    e.target.value
                                  )
                                }
                                placeholder="0490"
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {item.invoiceNumber || "—"}
                              </div>
                            )}
                          </td>
                          {isEditing && (
                            <td className="px-3 py-2 align-top">
                              {formData.items.length > 1 && (
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isEditing && (
                  <button
                    onClick={handleAddItem}
                    className="mt-2 text-[#0F766E] text-sm hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                )}
              </div>

              {/* Section 11: Declaration by Exporter */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    11. Declaration by the exporter
                  </Label>
                  {isEditing ? (
                    <>
                      <Textarea
                        value={formData.declarationByExporter}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            declarationByExporter: e.target.value,
                          })
                        }
                        rows={4}
                        className="mb-2"
                      />
                      <Input
                        value={formData.declarationPlace}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            declarationPlace: e.target.value,
                          })
                        }
                        placeholder="PHILIPPINES"
                        className="mb-2"
                      />
                      <Label className="text-[12px] text-[#667085] mb-1 block">
                        Date
                      </Label>
                      <Input
                        type="date"
                        value={formData.declarationDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            declarationDate: e.target.value,
                          })
                        }
                      />
                    </>
                  ) : (
                    <div className="text-[#12332B] text-sm">
                      <div className="mb-2">{formData.declarationByExporter}</div>
                      <div className="font-semibold mt-4">
                        {formData.declarationPlace || "—"}
                      </div>
                      <div className="text-[#12332B]/60 mt-2">
                        {formData.declarationDate
                          ? formatDate(formData.declarationDate)
                          : "—"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 12: Certification */}
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block">
                    12. Certification
                  </Label>
                  {isEditing ? (
                    <>
                      <Textarea
                        value={formData.certification}
                        onChange={(e) =>
                          setFormData({ ...formData, certification: e.target.value })
                        }
                        rows={4}
                        className="mb-2"
                      />
                      <Input
                        value={formData.certificationPlace}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            certificationPlace: e.target.value,
                          })
                        }
                        placeholder="XIAMEN, CHINA"
                        className="mb-2"
                      />
                      <Label className="text-[12px] text-[#667085] mb-1 block">
                        Date
                      </Label>
                      <Input
                        type="date"
                        value={formData.certificationDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            certificationDate: e.target.value,
                          })
                        }
                      />
                    </>
                  ) : (
                    <div className="text-[#12332B] text-sm">
                      <div className="mb-2">{formData.certification}</div>
                      <div className="font-semibold mt-4">
                        {formData.certificationPlace || "—"}
                      </div>
                      <div className="text-[#12332B]/60 mt-2">
                        {formData.certificationDate
                          ? formatDate(formData.certificationDate)
                          : "—"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
