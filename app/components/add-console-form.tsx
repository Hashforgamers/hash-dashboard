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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gamepad2, HardDrive, Wrench, DollarSign, Package } from "lucide-react";
import axios from "axios";
import { ProcessorOption } from "./constant";
import {
  GraphiCoptions,
  RamSizeOptions,
  StorageOptions,
  XboxPlaystation,
  VRPlaystation,
  PS5playstation,
  defaultSpecs
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [consoles, setConsoles] = useState<any[]>([]);
  const [selectedConsoleId, setSelectedConsoleId] = useState<string>("");

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

  useEffect(() => {
    if (vendorId) {
      const fetchConsoles = async () => {
        try {
          const response = await axios.get(
            `${DASHBOARD_URL}/api/getConsoles/vendor/${vendorId}`
          );
          console.log("API Response:", response.data);

          console.log("consoleType ", consoleType);
          const fetchedConsoles = Array.isArray(response.data) ? response.data : [];
          setConsoles(fetchedConsoles);

          const sameTypeConsoles = fetchedConsoles.filter(
            (c) => c?.type === consoleType
          );
          console.log("Filtered Consoles:", sameTypeConsoles);

          const maxConsoleNumber = sameTypeConsoles.length
            ? Math.max(
                ...sameTypeConsoles.map((c) => {
                  const consoleNumber = c?.number;
                  return consoleNumber && !isNaN(parseInt(consoleNumber, 10))
                    ? parseInt(consoleNumber, 10)
                    : 0;
                })
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
  }, [vendorId, consoleType]);

  // Handle copying console data
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
      // Parse consoleNumber to extract the numeric part
      const consoleNumberStr = formdata.consoleDetails.consoleNumber.replace("console-", "");
      const consoleNumber = parseInt(consoleNumberStr, 10);
      if (isNaN(consoleNumber)) {
        throw new Error("Invalid console number format");
      }

      const payload = {
        availablegametype: formdata.availablegametype,
        vendorId: vendorId,
        consoleDetails: {
          consoleNumber: consoleNumber, // Send integer instead of string
          modelNumber: formdata.consoleDetails.ModelNumber,
          serialNumber: formdata.consoleDetails.SerialNumber,
          brand: formdata.consoleDetails.Brand,
          consoleType: formdata.consoleDetails.consoleType,
          releaseDate: formdata.consoleDetails.ReleaseDate,
          description: formdata.consoleDetails.Description,
        },
        hardwareSpecifications: {
          ...formdata.hardwareSpecifications,
        },
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

      const response = await axios.post(
        `${DASHBOARD_URL}/api/addConsole`,
        payload
      );
      if (!response) {
        throw new Error("No response from server");
      }
      router.push("/gaming");
    } catch (error) {
      console.error("Error submitting console:", error);
      alert("Failed to add console. Please check the form and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConsoleTypeChange = (e: any) => {
    const newConsoleType = e.target.value;
    setformdata((prev) => ({
      ...prev,
      consoleDetails: {
        ...prev.consoleDetails,
        consoleType: newConsoleType,
      },
      hardwareSpecifications: getHardWareSpecification(newConsoleType),
    }));
  };

  const handleHardwareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setformdata((prev) => ({
      ...prev,
      hardwareSpecifications: {
        ...prev.hardwareSpecifications,
        [name]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step === index + 1
                ? "bg-blue-500 text-white"
                : step > index + 1
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {step > index + 1 ? "✓" : index + 1}
          </div>
          {index < 4 && (
            <div
              className={`h-1 w-16 mx-2 ${
                step > index + 1 ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-blue-500" />
                Console Details
              </CardTitle>
              <CardDescription>
                Enter the basic information about the console
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="copyConsole">Copy From Existing Console</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedConsoleId}
                    onValueChange={setSelectedConsoleId}
                  >
                    <SelectTrigger id="copyConsole">
                      <SelectValue placeholder="Select console to copy" />
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
                  <Button
                    onClick={handleCopyConsole}
                    disabled={!selectedConsoleId}
                  >
                    Copy Data
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consoleNumber">Console Number</Label>
                  <Input
                    id="consoleNumber"
                    value={formdata.consoleDetails.consoleNumber}
                    readOnly
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
                {consoleType === "pc" || consoleType === "ps5" || consoleType === "xbox" || consoleType === "vr" ? (
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
                ) : (
                  <div>Not found anything</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="consoleType">Console Type</Label>
                  <Input id="consoleType" value={consoleType || ""} readOnly />
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
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter console description"
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
                />
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <>
            {consoleType === "pc" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-6 h-6 text-blue-500" />
                    Hardware Specifications
                  </CardTitle>
                  <CardDescription>
                    Enter the technical specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
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
                </CardContent>
              </Card>
            ) : consoleType === "ps5" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-6 h-6 text-blue-500" />
                    Hardware Specifications
                  </CardTitle>
                  <CardDescription>
                    Enter the technical specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playstationType">
                      Types of PS5 PlayStation
                    </Label>
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
                </CardContent>
              </Card>
            ) : consoleType === "xbox" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-6 h-6 text-blue-500" />
                    Hardware Specifications
                  </CardTitle>
                  <CardDescription>
                    Enter the technical specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playstationType">
                      Types of Xbox PlayStation
                    </Label>
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
                </CardContent>
              </Card>
            ) : consoleType === "vr" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-6 h-6 text-blue-500" />
                    Hardware Specifications
                  </CardTitle>
                  <CardDescription>
                    Enter the technical specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playstationType">
                      Types of VR Playstation
                    </Label>
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
                </CardContent>
              </Card>
            ) : (
              <div>default Rendering</div>
            )}
          </>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-6 h-6 text-blue-500" />
                Maintenance & Status
              </CardTitle>
              <CardDescription>
                Enter maintenance and availability information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="maintenance">
                        Under Maintenance
                      </SelectItem>
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
                  <Label htmlFor="nextMaintenance">
                    Next Scheduled Maintenance
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceNotes">Maintenance Notes</Label>
                <Textarea
                  id="maintenanceNotes"
                  placeholder="Enter maintenance notes"
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
                />
              </div>
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-500" />
                Price & Cost
              </CardTitle>
              <CardDescription>
                Enter pricing and warranty information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="Enter price"
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
                  <Label htmlFor="rentalPrice">Rental Price</Label>
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
                    placeholder="Enter warranty period"
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
                      <SelectValue placeholder="Select status" />
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
        );
      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-500" />
                Additional Details
              </CardTitle>
              <CardDescription>
                Enter games and accessories information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supportedGames">List of Supported Games</Label>
                <Textarea
                  id="supportedGames"
                  placeholder="Enter games, separated by commas"
                  className="min-h-[100px]"
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
                  placeholder="Enter accessories details"
                  className="min-h-[100px]"
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
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto py-8">
      {renderStepIndicator()}
      {renderStepContent()}
      <div className="flex justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Previous
        </Button>
        {step === 5 ? (
          <Button
            type="submit"
            className="bg-green-500 hover:bg-green-600"
            onClick={handelfetch}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Next
          </Button>
        )}
      </div>
    </form>
  );
}