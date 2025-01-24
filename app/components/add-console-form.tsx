"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface AddConsoleFormProps {
  consoleType: string;
}

export function AddConsoleForm({ consoleType }: AddConsoleFormProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log("Form submitted");
  };

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
                  <Select>
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
                  <Input id="modelNumber" placeholder="Enter model number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input id="serialNumber" placeholder="Enter serial number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" placeholder="Enter brand name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consoleType">Console Type</Label>
                  <Input
                    id="consoleType"
                    value={consoleType}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="releaseDate">Release Date</Label>
                  <Input id="releaseDate" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter console description"
                />
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
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
                  <Input
                    id="processorType"
                    placeholder="Enter processor type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graphicsCard">Graphics Card</Label>
                  <Input
                    id="graphicsCard"
                    placeholder="Enter graphics card details"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ramSize">RAM Size</Label>
                  <Input id="ramSize" placeholder="Enter RAM size" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageCapacity">Storage Capacity</Label>
                  <Input
                    id="storageCapacity"
                    placeholder="Enter storage capacity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connectivity">Connectivity</Label>
                  <Input
                    id="connectivity"
                    placeholder="Enter connectivity options"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <Select>
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
                  <Select>
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
                  <Input id="lastMaintenance" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextMaintenance">
                    Next Scheduled Maintenance
                  </Label>
                  <Input id="nextMaintenance" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceNotes">Maintenance Notes</Label>
                <Textarea
                  id="maintenanceNotes"
                  placeholder="Enter maintenance notes"
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
                  <Input id="price" type="number" placeholder="Enter price" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentalPrice">Rental Price</Label>
                  <Input
                    id="rentalPrice"
                    type="number"
                    placeholder="Enter rental price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warrantyPeriod">Warranty Period</Label>
                  <Input
                    id="warrantyPeriod"
                    placeholder="Enter warranty period"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceStatus">Insurance Status</Label>
                  <Select>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessories">Accessories Details</Label>
                <Textarea
                  id="accessories"
                  placeholder="Enter accessories details"
                  className="min-h-[100px]"
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
          <Button type="submit" className="bg-green-500 hover:bg-green-600">
            Submit
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
