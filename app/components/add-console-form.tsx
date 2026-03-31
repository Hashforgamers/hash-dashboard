"use client";


import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { 
  Gamepad2, 
  HardDrive, 
  Wrench, 
  DollarSign, 
  CheckCircle2,
  Save,
  Copy
} from "lucide-react";
import axios from "axios";
import type { ConsoleCatalogItem } from "./console-catalog";
import { AddConsoleFormProps, FormData } from "./interfaces";
import { getHardWareSpecification } from "./utils";
import {
  buildConsoleFormProfile,
  buildInitialDynamicAttributes,
  findCatalogItemForConsole,
} from "./add-console/catalog-profile";
import { buildHardwarePayloadByProfile, fillMissingFormData } from "./add-console/defaults";
import { DynamicHardwareFields } from "./add-console/hardware-fields";
import { applyAttributesToAdditionalDetails } from "./add-console/payload";
import type { ConsoleDynamicAttributes } from "./add-console/types";


export function AddConsoleForm({ consoleType }: AddConsoleFormProps) {
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [consoleCatalog, setConsoleCatalog] = useState<ConsoleCatalogItem[]>([]);
  const [formdata, setformdata] = useState<FormData>({
    availablegametype: consoleType,
    vendorId: null,
    consoleDetails: {
      consoleNumber: "",
      ModelNumber: "",
      SerialNumber: "",
      Brand: "",
      consoleType: consoleType,
      ReleaseDate: "",
      Description: "",
    },
    hardwareSpecifications: getHardWareSpecification(consoleType),
    maintenanceStatus: {
      AvailableStatus: "",
      Condition: "",
      LastMaintenance: "",
      NextScheduledMaintenance: "",
      MaintenanceNotes: "",
    },
    priceAndCost: {
      price: "",
      Rentalprice: "",
      Warrantyperiod: "",
      InsuranceStatus: "",
    },
    additionalDetails: {
      ListOfSupportedGames: "",
      AccessoriesDetails: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [consoles, setConsoles] = useState<any[]>([]);
  const [selectedConsoleId, setSelectedConsoleId] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const selectedCatalogItem = useMemo(
    () => findCatalogItemForConsole(consoleType, consoleCatalog),
    [consoleType, consoleCatalog]
  );
  const formProfile = useMemo(
    () => buildConsoleFormProfile(consoleType, selectedCatalogItem),
    [consoleType, selectedCatalogItem]
  );
  const [dynamicAttributes, setDynamicAttributes] = useState<ConsoleDynamicAttributes>(
    buildInitialDynamicAttributes(formProfile)
  );


  const router = useRouter();


  // Fetch vendor ID
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      const vendor_id = decoded_token.sub.id;
      setVendorId(vendor_id);
      setformdata((prev) => ({ ...prev, vendorId: vendor_id }));
    }
  }, []);


  // Fetch consoles and set consoleNumber
  useEffect(() => {
    if (vendorId) {
      const fetchConsoles = async () => {
        try {
          const response = await axios.get(
            `${DASHBOARD_URL}/api/getConsoles/vendor/${vendorId}`
          );
          const fetchedConsoles = Array.isArray(response.data) ? response.data : [];
          setConsoles(fetchedConsoles);


          const sameTypeConsoles = fetchedConsoles.filter(
            (c) => c?.type === consoleType
          );
          const maxConsoleNumber = sameTypeConsoles.length
            ? Math.max(
                ...sameTypeConsoles.map((c) =>
                  c?.number && !isNaN(parseInt(c.number, 10))
                    ? parseInt(c.number, 10)
                    : 0
                )
              )
            : 0;
          setformdata((prev) => ({
            ...prev,
            consoleDetails: {
              ...prev.consoleDetails,
              consoleNumber: `console-${maxConsoleNumber + 1}`,
            },
          }));
        } catch (error) {
          console.error("Error fetching consoles:", error);
          setConsoles([]);
        }
      };
      fetchConsoles();
    }
  }, [vendorId, consoleType, refresh]);

  useEffect(() => {
    if (!vendorId) return;
    let mounted = true;
    const loadCatalog = async () => {
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/console-types?vendor_id=${vendorId}`);
        const data = await response.json();
        const items = Array.isArray(data?.console_types) ? (data.console_types as ConsoleCatalogItem[]) : [];
        if (!mounted) return;
        setConsoleCatalog(items.filter((item) => item?.is_active !== false));
      } catch {
        if (mounted) setConsoleCatalog([]);
      }
    };
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, [vendorId]);

  useEffect(() => {
    setDynamicAttributes(buildInitialDynamicAttributes(formProfile));
  }, [
    formProfile.slug,
    formProfile.inputMode,
    formProfile.defaultCapacity,
    formProfile.defaultControllerPolicy,
    formProfile.defaultSupportsMultiplayer,
    formProfile.showPlayArea,
  ]);


  // Hide success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);


  const handleCopyConsole = async () => {
    if (!selectedConsoleId) return;
    try {
      const response = await axios.get(
        `${DASHBOARD_URL}/api/console/${selectedConsoleId}`
      );
      const consoleData = response.data;


      const copiedData: FormData = {
        ...formdata,
        consoleDetails: {
          ...formdata.consoleDetails,
          ModelNumber: consoleData.console.model_number,
          SerialNumber: consoleData.console.serial_number,
          Brand: consoleData.console.brand,
          ReleaseDate: consoleData.console.release_date,
          Description: consoleData.console.description,
        },
        hardwareSpecifications: {
          ...formdata.hardwareSpecifications,
          processorType: consoleData.hardwareSpecification.processorType || "",
          graphicsCard: consoleData.hardwareSpecification.graphicsCard || "",
          ramSize: consoleData.hardwareSpecification.ramSize || "",
          storageCapacity: consoleData.hardwareSpecification.storageCapacity || "",
          connectivity: consoleData.hardwareSpecification.connectivity || "",
          consoleModelType: consoleData.hardwareSpecification.consoleModelType || "",
        },
        maintenanceStatus: {
          AvailableStatus: consoleData.maintenanceStatus.availableStatus,
          Condition: consoleData.maintenanceStatus.condition,
          LastMaintenance: consoleData.maintenanceStatus.lastMaintenance,
          NextScheduledMaintenance: consoleData.maintenanceStatus.nextMaintenance,
          MaintenanceNotes: consoleData.maintenanceStatus.maintenanceNotes,
        },
        priceAndCost: {
          price: consoleData.priceAndCost.price.toString(),
          Rentalprice: consoleData.priceAndCost.rentalPrice.toString(),
          Warrantyperiod: consoleData.priceAndCost.warrantyPeriod,
          InsuranceStatus: consoleData.priceAndCost.insuranceStatus,
        },
        additionalDetails: {
          ListOfSupportedGames: consoleData.additionalDetails.supportedGames,
          AccessoriesDetails: consoleData.additionalDetails.accessories,
        },
      };

      setformdata(fillMissingFormData(copiedData, formProfile, dynamicAttributes));
    } catch (error) {
      console.error("Error copying console data:", error);
    }
  };


  const handelfetch = async () => {
    setLoading(true);
    if (!vendorId) {
      alert("Vendor ID is missing. Please log in again.");
      setLoading(false);
      return;
    }
    try {
      const completedForm = fillMissingFormData(formdata, formProfile, dynamicAttributes);
      setformdata(completedForm);

      const consoleNumberStr = completedForm.consoleDetails.consoleNumber.replace("console-", "");
      const consoleNumber = parseInt(consoleNumberStr, 10);
      if (isNaN(consoleNumber)) {
        throw new Error("Invalid console number format");
      }


      const mappedAdditionalDetails = applyAttributesToAdditionalDetails(
        completedForm,
        formProfile,
        dynamicAttributes
      );

      const payload = {
        availablegametype: completedForm.availablegametype,
        vendorId: vendorId,
        consoleDetails: {
          consoleNumber: consoleNumber,
          name: completedForm.consoleDetails.ModelNumber,
          modelNumber: completedForm.consoleDetails.ModelNumber,
          serialNumber: completedForm.consoleDetails.SerialNumber,
          brand: completedForm.consoleDetails.Brand,
          consoleType: completedForm.consoleDetails.consoleType,
          releaseDate: completedForm.consoleDetails.ReleaseDate,
          description: completedForm.consoleDetails.Description || "",
        },
        hardwareSpecifications: buildHardwarePayloadByProfile(formProfile, completedForm.hardwareSpecifications),
        maintenanceStatus: {
          availableStatus: completedForm.maintenanceStatus.AvailableStatus,
          condition: completedForm.maintenanceStatus.Condition,
          lastMaintenance: completedForm.maintenanceStatus.LastMaintenance,
          nextMaintenance: completedForm.maintenanceStatus.NextScheduledMaintenance,
          maintenanceNotes: completedForm.maintenanceStatus.MaintenanceNotes || "",
        },
        priceAndCost: {
          price: parseFloat(completedForm.priceAndCost.price) || 0,
          rentalPrice: parseFloat(completedForm.priceAndCost.Rentalprice) || 0,
          warrantyPeriod: completedForm.priceAndCost.Warrantyperiod,
          insuranceStatus: completedForm.priceAndCost.InsuranceStatus,
        },
        additionalDetails: {
          supportedGames: mappedAdditionalDetails.ListOfSupportedGames || "",
          accessories: mappedAdditionalDetails.AccessoriesDetails || "",
        },
        consoleAttributes: {
          slug: formProfile.slug,
          inputMode: dynamicAttributes.inputMode,
          controllerPolicy: dynamicAttributes.controllerPolicy,
          supportsMultiplayer: dynamicAttributes.supportsMultiplayer,
          capacity: dynamicAttributes.capacity,
          playAreaSqft: dynamicAttributes.playAreaSqft || 0,
        },
      };


      const response = await axios.post(`${DASHBOARD_URL}/api/addConsole`, payload);
      if (!response) {
        throw new Error("No response from server");
      }


      // On success: show message, reset form
      setShowSuccess(true);
      setRefresh((prev) => prev + 1);
      setformdata({
        availablegametype: consoleType,
        vendorId: vendorId,
        consoleDetails: {
          consoleNumber: "",
          ModelNumber: "",
          SerialNumber: "",
          Brand: "",
          consoleType: consoleType,
          ReleaseDate: "",
          Description: "",
        },
        hardwareSpecifications: getHardWareSpecification(consoleType),
        maintenanceStatus: {
          AvailableStatus: "",
          Condition: "",
          LastMaintenance: "",
          NextScheduledMaintenance: "",
          MaintenanceNotes: "",
        },
        priceAndCost: {
          price: "",
          Rentalprice: "",
          Warrantyperiod: "",
          InsuranceStatus: "",
        },
        additionalDetails: {
          ListOfSupportedGames: "",
          AccessoriesDetails: "",
        },
      });
      setDynamicAttributes(buildInitialDynamicAttributes(formProfile));
    } catch (error) {
      console.error("Error submitting console:", error);
      alert("Failed to add console. Please check the form and try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handelfetch();
  };


  return (
    <div className="add-console-form dashboard-module dashboard-typography w-full">
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 shadow-sm dark:border-emerald-400/35 dark:bg-emerald-500/12">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          <span className="font-medium text-emerald-800 dark:text-emerald-200">Console added successfully!</span>
        </div>
      )}


      {/* Header */}
      <div className="mb-8">
        <h1 className="premium-heading mb-2 !text-2xl sm:!text-3xl md:!text-4xl">
          Add New {formProfile.displayName.toUpperCase()} Console
        </h1>
        <p className="premium-subtle">
          Fill out the information below to add a new console to your gaming cafe inventory
        </p>
      </div>


      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Quick Setup (Copy Console) */}
        <Card className="add-console-card">
          <CardHeader className="add-console-card-header">
            <CardTitle className="flex items-center gap-3 dash-title !text-lg">
              <Copy className="h-5 w-5 text-slate-700 dark:text-cyan-300" />
              Quick Setup
            </CardTitle>
            <CardDescription className="dash-subtitle premium-subtle">
              Copy data from an existing console to speed up the process
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="copyConsole">Copy From Existing Console</Label>
                <Select
                  value={selectedConsoleId}
                  onValueChange={setSelectedConsoleId}
                >
                  <SelectTrigger id="copyConsole">
                    <SelectValue placeholder="Select console to copy data from" />
                  </SelectTrigger>
                  <SelectContent>
                    {consoles
                      .filter((c) => c?.type === consoleType)
                      .map((console) => (
                        <SelectItem key={console.id} value={console.id.toString()}>
                          {`console-${console.number}`} - {console.brand}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={handleCopyConsole}
                disabled={!selectedConsoleId}
                className="ui-action-primary"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Data
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Section 2: Console Details */}
        <Card className="add-console-card">
          <CardHeader className="add-console-card-header">
            <CardTitle className="flex items-center gap-3 dash-title !text-lg">
              <Gamepad2 className="h-5 w-5 text-slate-700 dark:text-emerald-300" />
              Console Details
            </CardTitle>
            <CardDescription className="dash-subtitle premium-subtle">
              Enter the basic information about the console
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="consoleNumber">
                  Console Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="consoleNumber"
                  value={formdata.consoleDetails.consoleNumber}
                  readOnly
                  className="font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelNumber">
                  Console Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modelNumber"
                  placeholder="Enter console name (e.g. HASH_1, PS5_2)"
                  value={formdata.consoleDetails.ModelNumber}
                  onChange={(e) => {
                    setformdata((prev) => ({
                      ...prev,
                      consoleDetails: {
                        ...prev.consoleDetails,
                        ModelNumber: e.target.value,
                      },
                    }));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">
                  Serial Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serialNumber"
                  placeholder="Enter serial number"
                  value={formdata.consoleDetails.SerialNumber}
                  onChange={(e) => {
                    setformdata((prev) => ({
                      ...prev,
                      consoleDetails: {
                        ...prev.consoleDetails,
                        SerialNumber: e.target.value,
                      },
                    }));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">
                  Brand <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="brand"
                  placeholder="Enter brand name"
                  value={formdata.consoleDetails.Brand}
                  onChange={(e) => {
                    setformdata((prev) => ({
                      ...prev,
                      consoleDetails: {
                        ...prev.consoleDetails,
                        Brand: e.target.value,
                      },
                    }));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consoleType">
                  Console Type <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="consoleType" 
                  value={formProfile.displayName || ""} 
                  readOnly 
                  className="font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="releaseDate">
                  Release Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={formdata.consoleDetails.ReleaseDate}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      consoleDetails: {
                        ...prev.consoleDetails,
                        ReleaseDate: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Section 3: Hardware Specifications */}
        <Card className="add-console-card">
          <CardHeader className="add-console-card-header">
            <CardTitle className="flex items-center gap-3 dash-title !text-lg">
              <HardDrive className="h-5 w-5 text-slate-700 dark:text-violet-300" />
              Hardware Specifications
            </CardTitle>
            <CardDescription className="dash-subtitle premium-subtle">
              Enter the technical specifications and hardware details
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <DynamicHardwareFields
              profile={formProfile}
              formdata={formdata}
              setformdata={setformdata}
              dynamicAttributes={dynamicAttributes}
              setDynamicAttributes={setDynamicAttributes}
            />
          </CardContent>
        </Card>


        {/* Section 4: Maintenance & Status */}
        <Card className="add-console-card">
          <CardHeader className="add-console-card-header">
            <CardTitle className="flex items-center gap-3 dash-title !text-lg">
              <Wrench className="h-5 w-5 text-slate-700 dark:text-orange-300" />
              Maintenance & Status
            </CardTitle>
            <CardDescription className="dash-subtitle premium-subtle">
              Enter maintenance and availability information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="availableStatus">
                  Available Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formdata.maintenanceStatus.AvailableStatus}
                  onValueChange={(value) =>
                    setformdata((prev) => ({
                      ...prev,
                      maintenanceStatus: {
                        ...prev.maintenanceStatus,
                        AvailableStatus: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger id="availableStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="inUse">In Use</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">
                  Condition <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formdata.maintenanceStatus.Condition}
                  onValueChange={(value) =>
                    setformdata((prev) => ({
                      ...prev,
                      maintenanceStatus: {
                        ...prev.maintenanceStatus,
                        Condition: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastMaintenance">
                  Last Maintenance <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastMaintenance"
                  type="date"
                  value={formdata.maintenanceStatus.LastMaintenance}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      maintenanceStatus: {
                        ...prev.maintenanceStatus,
                        LastMaintenance: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextMaintenance">
                  Next Scheduled Maintenance <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nextMaintenance"
                  type="date"
                  value={formdata.maintenanceStatus.NextScheduledMaintenance}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      maintenanceStatus: {
                        ...prev.maintenanceStatus,
                        NextScheduledMaintenance: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Section 5: Price & Cost */}
        <Card className="add-console-card">
          <CardHeader className="add-console-card-header">
            <CardTitle className="flex items-center gap-3 dash-title !text-lg">
              <DollarSign className="h-5 w-5 text-slate-700 dark:text-emerald-300" />
              Price & Cost Information
            </CardTitle>
            <CardDescription className="dash-subtitle premium-subtle">
              Enter pricing and warranty information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Purchase Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter purchase price"
                  value={formdata.priceAndCost.price}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      priceAndCost: {
                        ...prev.priceAndCost,
                        price: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentalPrice">
                  Rental Price (per hour/slot) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rentalPrice"
                  type="number"
                  placeholder="Enter rental price"
                  value={formdata.priceAndCost.Rentalprice}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      priceAndCost: {
                        ...prev.priceAndCost,
                        Rentalprice: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warrantyPeriod">
                  Warranty Period <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="warrantyPeriod"
                  placeholder="e.g., 2 years, 24 months"
                  value={formdata.priceAndCost.Warrantyperiod}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      priceAndCost: {
                        ...prev.priceAndCost,
                        Warrantyperiod: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceStatus">
                  Insurance Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formdata.priceAndCost.InsuranceStatus}
                  onValueChange={(value) =>
                    setformdata((prev) => ({
                      ...prev,
                      priceAndCost: {
                        ...prev.priceAndCost,
                        InsuranceStatus: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger id="insuranceStatus">
                    <SelectValue placeholder="Select insurance status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insured">Insured</SelectItem>
                    <SelectItem value="notInsured">Not Insured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Submit Button */}
        <div className="flex justify-center py-8">
          <Button
            type="submit"
            size="lg"
            className="ui-action-primary px-12 py-4 text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Adding Console...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-3" />
                Add Console to Inventory
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
