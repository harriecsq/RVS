import { useState, useEffect } from "react";
import { Plus, FileText, Save, Trash2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "../../ui/toast-utils";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { API_BASE_URL } from '@/utils/api-config';

interface FSITabProps {
  bookingId: string;
  currentUser?: { name: string; email: string; department: string } | null;
}

interface ContainerDetail {
  id: string;
  containerNumber: string;
  sealNumber: string;
  grossWeight: string;
  netWeight: string;
  bags: string;
  cbm: string;
}

interface FSIData {
  id?: string;
  bookingId: string;
  shipperName: string;
  shipperAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  notifyParty: string;
  portOfLoading: string;
  finalDestination: string;
  vesselVoyage: string;
  etd: string;
  cargoDescription: string;
  productDescription: string;
  netWeight: string;
  containers: ContainerDetail[];
  specialInstructions: string;
  createdAt?: string;
  updatedAt?: string;
}

export function FSITab({ bookingId, currentUser }: FSITabProps) {
  const [fsiData, setFsiData] = useState<FSIData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<FSIData>({
    bookingId,
    shipperName: "",
    shipperAddress: "",
    consigneeName: "",
    consigneeAddress: "",
    notifyParty: "",
    portOfLoading: "",
    finalDestination: "",
    vesselVoyage: "",
    etd: "",
    cargoDescription: "",
    productDescription: "",
    netWeight: "",
    containers: [
      {
        id: "1",
        containerNumber: "",
        sealNumber: "",
        grossWeight: "",
        netWeight: "",
        bags: "",
        cbm: "",
      },
    ],
    specialInstructions: "",
  });

  useEffect(() => {
    fetchFSI();
  }, [bookingId]);

  const fetchFSI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/fsi?bookingId=${bookingId}`, {
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
        setFsiData(result.data);
        setFormData(result.data);
      } else {
        setFsiData(null);
      }
    } catch (error) {
      console.error("Error fetching FSI:", error);
      setFsiData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = fsiData?.id ? "PUT" : "POST";
      const url = fsiData?.id
        ? `${API_BASE_URL}/fsi/${fsiData.id}`
        : `${API_BASE_URL}/fsi`;

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
          fsiData?.id
            ? "FSI updated successfully"
            : "FSI created successfully"
        );
        setFsiData(result.data);
        setFormData(result.data);
        setIsEditing(false);
        await fetchFSI();
      } else {
        throw new Error(result.error || "Failed to save FSI");
      }
    } catch (error) {
      console.error("Error saving FSI:", error);
      toast.error("Failed to save FSI");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContainer = () => {
    setFormData({
      ...formData,
      containers: [
        ...formData.containers,
        {
          id: Date.now().toString(),
          containerNumber: "",
          sealNumber: "",
          grossWeight: "",
          netWeight: "",
          bags: "",
          cbm: "",
        },
      ],
    });
  };

  const handleRemoveContainer = (containerId: string) => {
    setFormData({
      ...formData,
      containers: formData.containers.filter((c) => c.id !== containerId),
    });
  };

  const handleContainerChange = (
    containerId: string,
    field: keyof ContainerDetail,
    value: string
  ) => {
    setFormData({
      ...formData,
      containers: formData.containers.map((container) =>
        container.id === containerId ? { ...container, [field]: value } : container
      ),
    });
  };

  const calculateTotals = () => {
    const totals = formData.containers.reduce(
      (acc, container) => {
        const grossWeight = parseFloat(container.grossWeight) || 0;
        const netWeight = parseFloat(container.netWeight) || 0;
        const bags = parseInt(container.bags) || 0;
        const cbm = parseFloat(container.cbm) || 0;

        return {
          grossWeight: acc.grossWeight + grossWeight,
          netWeight: acc.netWeight + netWeight,
          bags: acc.bags + bags,
          cbm: acc.cbm + cbm,
        };
      },
      { grossWeight: 0, netWeight: 0, bags: 0, cbm: 0 }
    );

    return totals;
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
          <div className="text-[#12332B]/60">Loading FSI...</div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div style={{ padding: "32px 48px" }}>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[#12332B] text-[18px] font-semibold mb-2">
              FSI - Final Shipping Instructions
            </h3>
            <p className="text-[#12332B]/60 text-[14px] leading-[20px]">
              Final shipping instructions and bill of lading details
            </p>
          </div>
          {!fsiData && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0F766E]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create FSI
            </button>
          ) : fsiData && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#0F766E] text-[#0F766E] rounded-lg hover:bg-[#0F766E]/5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Edit FSI
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (fsiData) {
                    setFormData(fsiData);
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
                {isSaving ? "Saving..." : "Save FSI"}
              </button>
            </div>
          )}
        </div>

        {/* FSI Content */}
        {!fsiData && !isEditing ? (
          <div className="flex flex-col items-center justify-center h-64 border border-[#12332B]/10 rounded-lg">
            <FileText className="w-12 h-12 text-[#12332B]/20 mb-4" />
            <div className="text-[#12332B]/60 mb-2">No FSI document yet</div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-[#0F766E] hover:underline"
            >
              Create FSI document
            </button>
          </div>
        ) : (
          <div className="border border-[#12332B]/10 rounded-lg overflow-hidden bg-white">
            <div className="p-6 space-y-6">
              {/* Shipper Section */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                  SHIPPER
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={formData.shipperName}
                      onChange={(e) =>
                        setFormData({ ...formData, shipperName: e.target.value })
                      }
                      className="mb-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter shipper name"
                    />
                    <Textarea
                      value={formData.shipperAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, shipperAddress: e.target.value })
                      }
                      rows={4}
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter shipper address"
                    />
                  </>
                ) : (
                  <div className="text-[#12332B] text-sm">
                    <div className="font-semibold">{formData.shipperName || "—"}</div>
                    <div className="whitespace-pre-line mt-1">
                      {formData.shipperAddress || "—"}
                    </div>
                  </div>
                )}
              </div>

              {/* Consignee Section */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                  CONSIGNEE
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={formData.consigneeName}
                      onChange={(e) =>
                        setFormData({ ...formData, consigneeName: e.target.value })
                      }
                      className="mb-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter consignee name"
                    />
                    <Textarea
                      value={formData.consigneeAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consigneeAddress: e.target.value,
                        })
                      }
                      rows={4}
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter consignee address"
                    />
                  </>
                ) : (
                  <div className="text-[#12332B] text-sm">
                    <div className="font-semibold">
                      {formData.consigneeName || "—"}
                    </div>
                    <div className="whitespace-pre-line mt-1">
                      {formData.consigneeAddress || "—"}
                    </div>
                  </div>
                )}
              </div>

              {/* Notify Party Section */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                  NOTIFY PARTY
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.notifyParty}
                    onChange={(e) =>
                      setFormData({ ...formData, notifyParty: e.target.value })
                    }
                    className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                    placeholder="Enter notify party"
                  />
                ) : (
                  <div className="text-[#12332B] text-sm">
                    {formData.notifyParty || "—"}
                  </div>
                )}
              </div>

              {/* Shipping Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                    PORT OF LOADING
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.portOfLoading}
                      onChange={(e) =>
                        setFormData({ ...formData, portOfLoading: e.target.value })
                      }
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter port of loading"
                    />
                  ) : (
                    <div className="text-[#12332B] text-sm font-semibold">
                      {formData.portOfLoading || "—"}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                    FINAL DESTINATION
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.finalDestination}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          finalDestination: e.target.value,
                        })
                      }
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter final destination"
                    />
                  ) : (
                    <div className="text-[#12332B] text-sm font-semibold">
                      {formData.finalDestination || "—"}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                    VESSEL/VOYAGE
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.vesselVoyage}
                      onChange={(e) =>
                        setFormData({ ...formData, vesselVoyage: e.target.value })
                      }
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter vessel/voyage"
                    />
                  ) : (
                    <div className="text-[#12332B] text-sm font-semibold">
                      {formData.vesselVoyage || "—"}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                    ETD MANILA
                  </Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.etd}
                      onChange={(e) =>
                        setFormData({ ...formData, etd: e.target.value })
                      }
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                    />
                  ) : (
                    <div className="text-[#12332B] text-sm font-semibold">
                      {formData.etd ? formatDate(formData.etd) : "—"}
                    </div>
                  )}
                </div>
              </div>

              {/* Cargo Description */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                  CARGO DESCRIPTION
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={formData.cargoDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cargoDescription: e.target.value,
                        })
                      }
                      className="mb-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                    />
                    <Input
                      value={formData.productDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productDescription: e.target.value,
                        })
                      }
                      className="mb-2 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                    />
                    <Input
                      value={formData.netWeight}
                      onChange={(e) =>
                        setFormData({ ...formData, netWeight: e.target.value })
                      }
                      className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                    />
                  </>
                ) : (
                  <div className="text-[#12332B] text-sm">
                    <div className="font-semibold">
                      {formData.cargoDescription || "—"}
                    </div>
                    <div className="mt-1">{formData.productDescription || "—"}</div>
                    <div className="mt-1 font-semibold">
                      {formData.netWeight || "—"}
                    </div>
                  </div>
                )}
              </div>

              {/* Container Details Table */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                  CONTAINER/SEAL NUMBER
                </Label>
                <div className="border border-[#12332B]/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#12332B]/[0.02]">
                      <tr className="border-b border-[#12332B]/10">
                        <th className="text-left px-3 py-2 text-[#12332B]/60 font-medium text-xs">
                          Container/Seal Number
                        </th>
                        <th className="text-right px-3 py-2 text-[#12332B]/60 font-medium text-xs">
                          Gross Weight (KGS)
                        </th>
                        <th className="text-right px-3 py-2 text-[#12332B]/60 font-medium text-xs">
                          Net Weight (KGS)
                        </th>
                        <th className="text-right px-3 py-2 text-[#12332B]/60 font-medium text-xs">
                          Bags
                        </th>
                        <th className="text-right px-3 py-2 text-[#12332B]/60 font-medium text-xs">
                          CBM
                        </th>
                        {isEditing && <th className="w-[5%]"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {formData.containers.map((container) => (
                        <tr
                          key={container.id}
                          className="border-b border-[#12332B]/5"
                        >
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <div className="space-y-1">
                                <Input
                                  value={container.containerNumber}
                                  onChange={(e) =>
                                    handleContainerChange(
                                      container.id,
                                      "containerNumber",
                                      e.target.value
                                    )
                                  }
                                  className="text-xs bg-[#F9FAFB] border border-[#D1D5DB]"
                                  placeholder="Container number"
                                />
                                <Input
                                  value={container.sealNumber}
                                  onChange={(e) =>
                                    handleContainerChange(
                                      container.id,
                                      "sealNumber",
                                      e.target.value
                                    )
                                  }
                                  className="text-xs bg-[#F9FAFB] border border-[#D1D5DB]"
                                  placeholder="Seal number"
                                />
                              </div>
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                <div>{container.containerNumber || "—"}</div>
                                <div className="mt-1">
                                  {container.sealNumber || "—"}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            {isEditing ? (
                              <Input
                                value={container.grossWeight}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "grossWeight",
                                    e.target.value
                                  )
                                }
                                className="text-xs text-right bg-[#F9FAFB] border border-[#D1D5DB]"
                                placeholder="0.00"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {container.grossWeight
                                  ? parseFloat(container.grossWeight).toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )
                                  : "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            {isEditing ? (
                              <Input
                                value={container.netWeight}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "netWeight",
                                    e.target.value
                                  )
                                }
                                className="text-xs text-right bg-[#F9FAFB] border border-[#D1D5DB]"
                                placeholder="0.00"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {container.netWeight
                                  ? parseFloat(container.netWeight).toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )
                                  : "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            {isEditing ? (
                              <Input
                                value={container.bags}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "bags",
                                    e.target.value
                                  )
                                }
                                className="text-xs text-right bg-[#F9FAFB] border border-[#D1D5DB]"
                                placeholder="0"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {container.bags || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            {isEditing ? (
                              <Input
                                value={container.cbm}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "cbm",
                                    e.target.value
                                  )
                                }
                                className="text-xs text-right bg-[#F9FAFB] border border-[#D1D5DB]"
                                placeholder="0"
                              />
                            ) : (
                              <div className="text-[#12332B] text-xs">
                                {container.cbm || "—"}
                              </div>
                            )}
                          </td>
                          {isEditing && (
                            <td className="px-3 py-2 align-top">
                              {formData.containers.length > 1 && (
                                <button
                                  onClick={() => handleRemoveContainer(container.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-[#12332B]/[0.02] font-semibold">
                        <td className="px-3 py-2 text-[#12332B] text-xs">TOTAL</td>
                        <td className="px-3 py-2 text-right text-[#12332B] text-xs">
                          {totals.grossWeight.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2 text-right text-[#12332B] text-xs">
                          {totals.netWeight.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2 text-right text-[#12332B] text-xs">
                          {totals.bags.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-[#12332B] text-xs">
                          {totals.cbm.toLocaleString()}
                        </td>
                        {isEditing && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {isEditing && (
                  <button
                    onClick={handleAddContainer}
                    className="mt-2 text-[#0F766E] text-sm hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Container
                  </button>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <Label className="text-[12px] text-[#667085] mb-2 block font-semibold">
                  SPECIAL INSTRUCTIONS
                </Label>
                {isEditing ? (
                  <Textarea
                    value={formData.specialInstructions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialInstructions: e.target.value,
                      })
                    }
                    rows={3}
                    className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm"
                    placeholder="Enter special instructions..."
                  />
                ) : (
                  <div className="text-[#12332B] text-sm bg-yellow-50 border border-yellow-300 rounded p-3">
                    {formData.specialInstructions || "—"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}