"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gamepad2, HardDrive, Wrench, DollarSign, Package } from "lucide-react";
import { Processor } from "postcss";
import { Console } from "console";
import axios from "axios";
import router, { Router } from "next/router";

interface AddConsoleFormProps {
  consoleType: string;
}

const ProcessorOption = [
  {
    value: "AMD Ryzen 5 5600X (Desktop) 3.70 GHz",
    label: "AMD Ryzen 5 5600X (Desktop) 3.70 GHz",
  },
  {
    value: "AMD Ryzen 5 7600X (Desktop) 4.70 GHz",
    label: "AMD Ryzen 5 7600X (Desktop) 4.70 GHz",
  },
  {
    value: "AMD Ryzen 7 7800X3D (Desktop) 4.20 GHz",
    label: "AMD Ryzen 7 7800X3D (Desktop) 4.20 GHz",
  },
  {
    value: "Intel Core i5-12400F (Desktop) 2.50 GHz",
    label: "Intel Core i5-12400F (Desktop) 2.50 GHz",
  },
  {
    value: "AMD Ryzen 7 5700X (Desktop) 3.40 GHz",
    label: "AMD Ryzen 7 5700X (Desktop) 3.40 GHz",
  },
  {
    value: "AMD Ryzen 5 5600 (Desktop) 3.50 GHz",
    label: "AMD Ryzen 5 5600 (Desktop) 3.50 GHz",
  },
  {
    value: "AMD Ryzen 7 9800X3D (Desktop) 4.70 GHz",
    label: "AMD Ryzen 7 9800X3D (Desktop) 4.70 GHz",
  },
  {
    value: "AMD Ryzen 5 5500 (Desktop) 3.60 GHz",
    label: "AMD Ryzen 5 5500 (Desktop) 3.60 GHz",
  },
];

const GraphiCoptions = [
  {
    value: "NVIDIA GeForce RTX 4060 (Desktop) 8192 MB",
    label: "NVIDIA GeForce RTX 4060 (Desktop) 8192 MB",
  },
  {
    value: "NVIDIA GeForce RTX 3060 (Desktop) 8192 MB",
    label: "NVIDIA GeForce RTX 3060 (Desktop) 8192 MB",
  },
  {
    value: "NVIDIA GeForce RTX 4070 SUPER (Desktop) 12288 MB",
    label: "NVIDIA GeForce RTX 4070 SUPER (Desktop) 12288 MB",
  },
  {
    value: "NVIDIA GeForce RTX 4060 Ti (Desktop) 16384 MB",
    label: "NVIDIA GeForce RTX 4060 Ti (Desktop) 16384 MB",
  },
  {
    value: "AMD Radeon RX 7800 XT (Desktop) 16384 MB",
    label: "AMD Radeon RX 7800 XT (Desktop) 16384 MB",
  },
  {
    value: "NVIDIA GeForce RTX 4070 (Desktop) 12288 MB",
    label: "NVIDIA GeForce RTX 4070 (Desktop) 12288 MB",
  },
  {
    value: "AMD Radeon RX 6600 (Desktop) 8192 MB",
    label: "AMD Radeon RX 6600 (Desktop) 8192 MB",
  },
];

const RamSizeOptions = [
  { value: "4gb", label: "4 GB" },
  { value: "8gb", label: "8 GB" },
  { value: "16gb", label: "16 GB" },
  { value: "32gb", label: "32 GB" },
  { value: "64gb", label: "64 GB" },
  { value: "128gb", label: "128 GB" },
];

const StorageOptions = [
  { value: "128gb", label: "128 GB" },
  { value: "256gb", label: "256 GB" },
  { value: "512gb", label: "512 GB" },
  { value: "1tb", label: "1 TB" },
  { value: "2tb", label: "2 TB" },
  { value: "4tb", label: "4 TB" },
  { value: "8tb", label: "8 TB" },
];

const XboxPlaystation = [
  { value: "Xbox Series S", label: "Xbox Series S" },
  { value: "Xbox Series X", label: "Xbox Series X" },
];

const VRPlaystation = [
  { value: "Meta Quest 3", label: "Meta Quest 3" },
  { value: "Meta Quest 3s", label: "Meta Quest 3s" },
  { value: "Meta Quest Pro", label: "Meta Quest PRO" },
  { value: "Sony Playstation VR2", label: "Sony Playstation VR2" },
];

const PS5playstation = [
  { value: "PS4", label: "PS4" },
  { value: "PS4 Slim", label: "PS4 Slim" },
  { value: "PS5", label: "PS5" },
  { value: "Ps5", label: "PS5 PRO" },
];


const defaultSpecs = {
  processorType: "",
  graphicsCard: "",
  ramSize: "",
  storageCapacity: "",
  connectivity: "",
  consoleModelType: "",
};

const getHardWareSpecification = (
  consoleType: string
): Record<string, string> => {
  const validTypes = ["pc", "ps5", "xbox", "vr"];
  return validTypes.includes(consoleType) ? { ...defaultSpecs } : {};
};

export function AddConsoleForm({ consoleType }: AddConsoleFormProps) {

  const [vendorId, setVendorId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      const vendor_id1 = decoded_token.sub.id;
      setVendorId(vendor_id1);
    }
  }, []);

  const [formdata, setformdata] = useState({
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

  const payload = {
    availablegametype: formdata.availablegametype,
    vendorId: vendorId,
    consoleDetails: {
      consoleNumber: formdata.consoleDetails.consoleNumber,
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
      price: parseFloat(formdata.priceAndCost.price),
      rentalPrice: parseFloat(formdata.priceAndCost.Rentalprice),
      warrantyPeriod: formdata.priceAndCost.Warrantyperiod,
      insuranceStatus: formdata.priceAndCost.InsuranceStatus,
    },
    additionalDetails: {
      supportedGames: formdata.additionalDetails.ListOfSupportedGames,
      accessories: formdata.additionalDetails.AccessoriesDetails,
    },
  };


  const handelfetch = async () => {
    setLoading(true);
    if (!vendorId) return; // 🚨 Don't fetch if vendorId is not ready
    try {
      const response = await axios.post(
        `${DASHBOARD_URL}/api/addConsole`,
        payload
      );
      if (!response) {
        console.log(`Something went wrong while sending post request`);
      } else {
        console.log(response?.data);
        const baseUrl = window.location.origin; // Get base URL
        const gamingUrl = `${baseUrl}/gaming`; // Append /gaming
        const data = (window.location.href = gamingUrl);
        console.log("data", data);
      }
    } catch (error) {
      console.log(`something went wrong`, error);
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
      hardwareSpecifications: getHardWareSpecification(newConsoleType), // Update specs
    }));
  };

  const handleHardwareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setformdata((prev) => ({
      ...prev,
      hardwareSpecifications: {
        ...prev.hardwareSpecifications, // Pehle ka data save rakho
        [name]: value, // Sirf jo change ho raha hai usko update karo
      },
    }));
  };

  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log("Form submitted");
  };

  console.log("form data ", formdata);
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {[...Array(totalSteps)].map((_, index) => (
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
          {index < totalSteps - 1 && (
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consoleNumber">Console Number</Label>
                  <Select
                    value={formdata.consoleDetails.consoleNumber} // Bind value from state
                    onValueChange={(value) =>
                      setformdata((prev) => ({
                        ...prev,
                        consoleDetails: {
                          ...prev.consoleDetails,
                          consoleNumber: value, // Update state correctly
                        },
                      }))
                    }
                  >
                    <SelectTrigger id="consoleNumber">
                      <SelectValue placeholder="Select console number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Console 1</SelectItem>
                      <SelectItem value="2">Console 2</SelectItem>
                      <SelectItem value="3">Console 3</SelectItem>
                    </SelectContent>
                  </Select>
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
                          SerialNumber: e.target.value, // Update state on input change
                        },
                      }));
                    }}
                  />
                </div>
                {consoleType === "pc" ? (<div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="Enter brand name"
                    value={formdata.consoleDetails.Brand} // Bind value from state
                    onChange={(e) => {
                      setformdata((prev) => ({
                        ...prev,
                        consoleDetails: {
                          ...prev.consoleDetails,
                          Brand: e.target.value, // Update state on input change
                        },
                      }));
                    }}
                  />
                </div>):consoleType === "ps5" ?(<div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>

                  <Input
                    id="brand"
                    placeholder="Enter brand name"
                    value={formdata.consoleDetails.Brand} // Bind value from state
                    onChange={(e) => {
                      setformdata((prev) => ({
                        ...prev,
                        consoleDetails: {
                          ...prev.consoleDetails,
                          Brand: e.target.value, // Update state on input change
                        },
                      }));
                    }}

                  />
                </div>) :consoleType === "xbox" ? (<div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="Enter brand name"
                    value={formdata.consoleDetails.Brand} // Bind value from state
                    onChange={(e) => {
                      setformdata((prev) => ({
                        ...prev,
                        consoleDetails: {
                          ...prev.consoleDetails,
                          Brand: e.target.value, // Update state on input change
                        },
                      }));
                    }}
                  />
                </div>):consoleType === "vr" ? (<div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="Enter brand name"
                    value={formdata.consoleDetails.Brand} // Bind value from state
                    onChange={(e) => {
                      setformdata((prev) => ({
                        ...prev,
                        consoleDetails: {
                          ...prev.consoleDetails,
                          Brand: e.target.value, // Update state on input change
                        },
                      }));
                    }}
                  />
                </div>):(<div>not found anything</div>)}
                
                <div className="space-y-2">
                  <Label htmlFor="consoleType">Console Type</Label>
                  <Input id="consoleType" value={consoleType || ""} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="releaseDate">Release Date</Label>
                  <Input
                    id="releaseDate"
                    type="date"
                    value={formdata.consoleDetails.ReleaseDate} // Bind state
                    onChange={(e) =>
                      setformdata((prev) => ({
                        ...prev,
                        consoleDetails: {
                          ...prev.consoleDetails,
                          ReleaseDate: e.target.value, // Update state on input change
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
                  value={formdata.consoleDetails.Description} // Bind state
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      consoleDetails: {
                        ...prev.consoleDetails,
                        Description: e.target.value, // Update state on input change
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
                        value={
                          formdata.hardwareSpecifications?.processorType || ""
                        }
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
                        <SelectValue placeholder="Select PS5  PlayStation type" />
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
                            consoleModelType: value, //
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
                    value={formdata.maintenanceStatus.AvailableStatus} // Bind to state
                    onValueChange={(value) =>
                      setformdata((prev) => ({
                        ...prev,
                        maintenanceStatus: {
                          ...prev.maintenanceStatus,
                          AvailableStatus: value, // Update state
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
                    value={formdata.maintenanceStatus.Condition} // Bind to state
                    onValueChange={(value) =>
                      setformdata((prev) => ({
                        ...prev,
                        maintenanceStatus: {
                          ...prev.maintenanceStatus,
                          Condition: value, // Update state
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
                    value={formdata.maintenanceStatus.LastMaintenance} // Bind to state
                    onChange={(e) =>
                      setformdata((prev) => ({
                        ...prev,
                        maintenanceStatus: {
                          ...prev.maintenanceStatus,
                          LastMaintenance: e.target.value, // Update state
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
                    id="lastMaintenance"
                    type="date"
                    value={formdata.maintenanceStatus.NextScheduledMaintenance} // Bind to state
                    onChange={(e) =>
                      setformdata((prev) => ({
                        ...prev,
                        maintenanceStatus: {
                          ...prev.maintenanceStatus,
                          NextScheduledMaintenance: e.target.value, // Update state
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
                  value={formdata.maintenanceStatus.MaintenanceNotes} // Bind to state
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      maintenanceStatus: {
                        ...prev.maintenanceStatus,
                        MaintenanceNotes: e.target.value, // Update state
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
                    value={formdata.priceAndCost.price} // Bind input to state
                    onChange={(e) =>
                      setformdata((prev) => ({
                        ...prev,
                        priceAndCost: {
                          ...prev.priceAndCost,
                          price: e.target.value, // Update state
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
                    value={formdata.priceAndCost.Rentalprice} // Bind input to state
                    onChange={(e) =>
                      setformdata((prev) => ({
                        ...prev,
                        priceAndCost: {
                          ...prev.priceAndCost,
                          Rentalprice: e.target.value, // Update state
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
                    value={formdata.priceAndCost.Warrantyperiod} // Bind input to state
                    onChange={(e) =>
                      setformdata((prev) => ({
                        ...prev,
                        priceAndCost: {
                          ...prev.priceAndCost,
                          Warrantyperiod: e.target.value, // Update state
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceStatus">Insurance Status</Label>
                  <Select
                    value={formdata.priceAndCost.InsuranceStatus} // Bind value to state
                    onValueChange={(value) =>
                      setformdata((prev) => ({
                        ...prev,
                        priceAndCost: {
                          ...prev.priceAndCost,
                          InsuranceStatus: value, // Update state
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
                  value={formdata.additionalDetails.ListOfSupportedGames} // Bind value to state
                  onChange={(e) =>
                    setformdata((prev) => ({
                      ...prev,
                      additionalDetails: {
                        ...prev.additionalDetails,
                        ListOfSupportedGames: e.target.value, // Update state
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
                    setformdata({
                      ...formdata,
                      additionalDetails: {
                        ...formdata.additionalDetails,
                        AccessoriesDetails: e.target.value,
                      },
                    })
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
        {step === totalSteps ? (
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

