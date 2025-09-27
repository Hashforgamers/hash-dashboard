"use client";

import { useState, useEffect } from "react";
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
  Package,
  CheckCircle2,
  Save,
  Copy
} from "lucide-react";
import axios from "axios";
import { ProcessorOption } from "./constant";
import {
  GraphiCoptions,
  RamSizeOptions,
  StorageOptions,
  XboxPlaystation,
  VRPlaystation,
  PS5playstation,
} from "./constant";
import { AddConsoleFormProps, FormData } from "./interfaces";
import { getHardWareSpecification } from "./utils";

export function AddConsoleForm({ consoleType }: AddConsoleFormProps) {
  const [vendorId, setVendorId] = useState<number | null>(null);
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

      setformdata({
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
      });
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
      const consoleNumberStr = formdata.consoleDetails.consoleNumber.replace("console-", "");
      const consoleNumber = parseInt(consoleNumberStr, 10);
      if (isNaN(consoleNumber)) {
        throw new Error("Invalid console number format");
      }

      const payload = {
        availablegametype: formdata.availablegametype,
        vendorId: vendorId,
        consoleDetails: {
          consoleNumber: consoleNumber,
          modelNumber: formdata.consoleDetails.ModelNumber,
          serialNumber: formdata.consoleDetails.SerialNumber,
          brand: formdata.consoleDetails.Brand,
          consoleType: formdata.consoleDetails.consoleType,
          releaseDate: formdata.consoleDetails.ReleaseDate,
          description: formdata.consoleDetails.Description,
        },
        hardwareSpecifications: { ...formdata.hardwareSpecifications },
        maintenanceStatus: {
          availableStatus: formdata.maintenanceStatus.AvailableStatus,
          condition: formdata.maintenanceStatus.Condition,
          lastMaintenance: formdata.maintenanceStatus.LastMaintenance,
          nextMaintenance: formdata.maintenanceStatus.NextScheduledMaintenance,
          maintenanceNotes: formdata.maintenanceStatus.MaintenanceNotes,
        },
        priceAndCost: {
          price: parseFloat(formdata.priceAndCost.price) || 0,
          rentalPrice: parseFloat(formdata.priceAndCost.Rentalprice) || 0,
          warrantyPeriod: formdata.priceAndCost.Warrantyperiod,
          insuranceStatus: formdata.priceAndCost.InsuranceStatus,
        },
        additionalDetails: {
          supportedGames: formdata.additionalDetails.ListOfSupportedGames,
          accessories: formdata.additionalDetails.AccessoriesDetails,
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

  const renderHardwareSpecifications = () => {
    if (consoleType === "pc") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="processorType">Processor Type</Label>
            <Select
              value={formdata.hardwareSpecifications?.processorType || ""}
              onValueChange={(value) =>
                setformdata((prev) => ({
                  ...prev,
                  hardwareSpecifications: {
                    ...prev.hardwareSpecifications,
                    processorType: value,
                  },
                }))
              }
            >
              <SelectTrigger id="processorType">
                <SelectValue placeholder="Select processor type" />
              </SelectTrigger>
              <SelectContent>
                {ProcessorOption.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="graphicsCard">Graphics Card</Label>
            <Select
              value={formdata.hardwareSpecifications.graphicsCard}
              onValueChange={(value) =>
                setformdata((prev) => ({
                  ...prev,
                  hardwareSpecifications: {
                    ...prev.hardwareSpecifications,
                    graphicsCard: value,
                  },
                }))
              }
            >
              <SelectTrigger id="graphicsCard">
                <SelectValue placeholder="Select graphics card" />
              </SelectTrigger>
              <SelectContent>
                {GraphiCoptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ramSize">RAM Size</Label>
            <Select
              value={formdata.hardwareSpecifications.ramSize}
              onValueChange={(value) =>
                setformdata((prev) => ({
                  ...prev,
                  hardwareSpecifications: {
                    ...prev.hardwareSpecifications,
                    ramSize: value,
                  },
                }))
              }
            >
              <SelectTrigger id="ramSize">
                <SelectValue placeholder="Select RAM size" />
              </SelectTrigger>
              <SelectContent>
                {RamSizeOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storageCapacity">Storage Capacity</Label>
            <Select
              value={formdata.hardwareSpecifications.storageCapacity}
              onValueChange={(value) =>
                setformdata((prev) => ({
                  ...prev,
                  hardwareSpecifications: {
                    ...prev.hardwareSpecifications,
                    storageCapacity: value,
                  },
                }))
              }
            >
              <SelectTrigger id="storageCapacity">
                <SelectValue placeholder="Select storage capacity" />
              </SelectTrigger>
              <SelectContent>
                {StorageOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="connectivity">Connectivity</Label>
            <Input
              id="connectivity"
              placeholder="Enter connectivity options"
              value={formdata.hardwareSpecifications.connectivity}
              onChange={(e) =>
                setformdata((prev) => ({
                  ...prev,
                  hardwareSpecifications: {
                    ...prev.hardwareSpecifications,
                    connectivity: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      );
    } else if (consoleType === "ps5") {
      return (
        <div className="space-y-2">
          <Label htmlFor="playstationType">Types of PS5 PlayStation</Label>
          <Select
            value={formdata.hardwareSpecifications.consoleModelType}
            onValueChange={(value) =>
              setformdata((prev) => ({
                ...prev,
                hardwareSpecifications: {
                  ...prev.hardwareSpecifications,
                  consoleModelType: value,
                },
              }))
            }
          >
            <SelectTrigger id="playstationType">
              <SelectValue placeholder="Select PS5 PlayStation type" />
            </SelectTrigger>
            <SelectContent>
              {PS5playstation.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (consoleType === "xbox") {
      return (
        <div className="space-y-2">
          <Label htmlFor="playstationType">Types of Xbox PlayStation</Label>
          <Select
            value={formdata.hardwareSpecifications.consoleModelType}
            onValueChange={(value) =>
              setformdata((prev) => ({
                ...prev,
                hardwareSpecifications: {
                  ...prev.hardwareSpecifications,
                  consoleModelType: value,
                },
              }))
            }
          >
            <SelectTrigger id="playstationType">
              <SelectValue placeholder="Select Xbox Playstation" />
            </SelectTrigger>
            <SelectContent>
              {XboxPlaystation.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (consoleType === "vr") {
      return (
        <div className="space-y-2">
          <Label htmlFor="playstationType">Types of VR Playstation</Label>
          <Select
            value={formdata.hardwareSpecifications.consoleModelType}
            onValueChange={(value) =>
              setformdata((prev) => ({
                ...prev,
                hardwareSpecifications: {
                  ...prev.hardwareSpecifications,
                  consoleModelType: value,
                },
              }))
            }
          >
            <SelectTrigger id="playstationType">
              <SelectValue placeholder="Select VR Type" />
            </SelectTrigger>
            <SelectContent>
              {VRPlaystation.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return <div>Hardware specifications not available for this console type</div>;
  };

  return (
    <div className="w-full">
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-green-700 font-medium">Console added successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Add New {consoleType.toUpperCase()} Console
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Fill out the information below to add a new console to your gaming cafe inventory
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Quick Setup (Copy Console) */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardTitle className="flex items-center gap-3">
              <Copy className="w-6 h-6 text-blue-600" />
              Quick Setup
            </CardTitle>
            <CardDescription className="text-base">
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Console Details */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
            <CardTitle className="flex items-center gap-3">
              <Gamepad2 className="w-6 h-6 text-emerald-600" />
              Console Details
            </CardTitle>
            <CardDescription className="text-base">
              Enter the basic information about the console
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="consoleNumber">Console Number</Label>
                <Input
                  id="consoleNumber"
                  value={formdata.consoleDetails.consoleNumber}
                  readOnly
                  className="bg-gray-100 dark:bg-gray-800 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelNumber">Model Number</Label>
                <Input
                  id="modelNumber"
                  placeholder="Enter model number"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consoleType">Console Type</Label>
                <Input 
                  id="consoleType" 
                  value={consoleType || ""} 
                  readOnly 
                  className="bg-gray-100 dark:bg-gray-800 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="releaseDate">Release Date</Label>
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
                />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter console description and additional notes"
                value={formdata.consoleDetails.Description}
                onChange={(e) =>
                  setformdata((prev) => ({
                    ...prev,
                    consoleDetails: {
                      ...prev.consoleDetails,
                      Description: e.target.value,
                    },
                  }))
                }
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Hardware Specifications */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardTitle className="flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-purple-600" />
              Hardware Specifications
            </CardTitle>
            <CardDescription className="text-base">
              Enter the technical specifications and hardware details
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {renderHardwareSpecifications()}
          </CardContent>
        </Card>

        {/* Section 4: Maintenance & Status */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
            <CardTitle className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-orange-600" />
              Maintenance & Status
            </CardTitle>
            <CardDescription className="text-base">
              Enter maintenance and availability information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="availableStatus">Available Status</Label>
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
                <Label htmlFor="condition">Condition</Label>
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
                <Label htmlFor="lastMaintenance">Last Maintenance</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextMaintenance">Next Scheduled Maintenance</Label>
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
                />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Label htmlFor="maintenanceNotes">Maintenance Notes</Label>
              <Textarea
                id="maintenanceNotes"
                placeholder="Enter maintenance notes and history"
                value={formdata.maintenanceStatus.MaintenanceNotes}
                onChange={(e) =>
                  setformdata((prev) => ({
                    ...prev,
                    maintenanceStatus: {
                      ...prev.maintenanceStatus,
                      MaintenanceNotes: e.target.value,
                    },
                  }))
                }
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Price & Cost */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardTitle className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-green-600" />
              Price & Cost Information
            </CardTitle>
            <CardDescription className="text-base">
              Enter pricing and warranty information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Purchase Price</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentalPrice">Rental Price (per hour/slot)</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warrantyPeriod">Warranty Period</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceStatus">Insurance Status</Label>
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

        {/* Section 6: Additional Details */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardTitle className="flex items-center gap-3">
              <Package className="w-6 h-6 text-indigo-600" />
              Additional Details
            </CardTitle>
            <CardDescription className="text-base">
              Enter games and accessories information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="supportedGames">List of Supported Games</Label>
                <Textarea
                  id="supportedGames"
                  placeholder="Enter supported games, separated by commas or new lines"
                  className="min-h-[120px] resize-none"
                  value={formdata.additionalDetails.ListOfSupportedGames}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      additionalDetails: {
                        ...prev.additionalDetails,
                        ListOfSupportedGames: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessories">Accessories Details</Label>
                <Textarea
                  id="accessories"
                  placeholder="List all included accessories (controllers, cables, headsets, etc.)"
                  className="min-h-[120px] resize-none"
                  value={formdata.additionalDetails.AccessoriesDetails}
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      additionalDetails: {
                        ...prev.additionalDetails,
                        AccessoriesDetails: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center py-8">
          <Button
            type="submit"
            size="lg"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
