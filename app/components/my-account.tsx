"use client";
import { useState, useEffect, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MapPin,
  Calendar,
  Clock,
  Mail,
  Phone,
  Lock,
  CreditCard,
  FileCheck,
  Camera,
  Building2,
  Sparkles,
  Shield,
  BellRing,
  Wallet,
  Settings,
  Globe,
  Coffee,
  Image,
  Ghost,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MyAccount() {
  const [cafeImages, setCafeImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=2071&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=1932&auto=format&fit=crop",
  ]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCafeImages([...cafeImages, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const [page, setPage] = useState<string | null>("Profile");
  const prevPageRef = useRef<string | null>(null);

  const handleViewInpage = (e) => {
    const label = e.target.dataset.label;
    setPage(label);
  };
  const handleRemoveImage = (indexToRemove: number) => {
    setCafeImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  useEffect(() => {
    if (prevPageRef.current !== page) {
      console.log("Page updated:", page);
    }
    prevPageRef.current = page;
  }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-2 space-y-8">
        {/* Page Header */}
        {/* <div>
          <h1 className="text-3xl font-semibold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your cafe's profile, subscription, and business settings
          </p>
        </div> */}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="col-span-12 md:col-span-3 space-y-4">
            {/* nav button element */}
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {[
                    { icon: User, label: "Profile" },
                    { icon: Building2, label: "Business Details" },
                    // { icon: Shield, label: "Security" },
                    { icon: Wallet, label: "Billing" },
                    // { icon: BellRing, label: "Notifications" },
                    { icon: FileCheck, label: "Verified Documents" },
                    // { icon: Image, label: "Cafe Gallery" },
                  ].map((item) => (
                    <Button
                      key={item.label}
                      variant="ghost"
                      className={`w-full justify-start ${
                        page === item.label
                          ? "border border-muted bg-muted"
                          : ""
                      }`}
                      onClick={(e) => handleViewInpage(e)}
                      data-label={item.label}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-12 md:col-span-9 space-y-3">
            <form className="space-y-6">
              {page === "Profile" && (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-3">
                          {/* image in profile */}
                          <div className="relative transition-transform duration-300 ease-in-out hover:scale-110">
                            <div className="h-48 w-48 rounded-full p-[4px] bg-gradient-to-r from-red-500 via-green-500 to-yellow-500 animate-spin-slow">
                              <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden ">
                                <img
                                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"
                                  alt="Avatar"
                                  className="h-full w-full object-cover rounded-full "
                                />
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <h3 className="font-medium">John's Cafe</h3>
                            <p className="text-sm text-muted-foreground">
                              Premium Member
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>cafe.example.com</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>contact@cafe.example.com</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Cafe Gallery</CardTitle>
                      <CardDescription>
                        Showcase your cafe's ambiance and offerings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {cafeImages.map((image, index) => (
                          <div
                            key={index}
                            className="relative group aspect-square"
                          >
                            <img
                              src={image}
                              alt={`Cafe ${index + 1}`}
                              className="w-full h-full object-cover rounded-md"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                              <X
                                className="absolute top-3 right-2 w-5 h-5  hover:bg-gray-500 cursor-pointer rounded-md"
                                onClick={() => handleRemoveImage(index)}
                              />

                              <Button variant="secondary" size="sm">
                                <Camera className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                        <label className="aspect-square flex items-center justify-center border-2 border-dashed border-muted rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleImageUpload}
                            accept="image/*"
                          />
                          <div className="text-center">
                            <Camera className="w-6 h-6 mx-auto text-muted-foreground" />
                            <span className="text-sm text-muted-foreground mt-2">
                              Add Photo
                            </span>
                          </div>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Conditional Rendering for Cafe Gallery */}
              {/* {page === "Cafe Gallery" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cafe Gallery</CardTitle>
                    <CardDescription>
                      Showcase your cafe's ambiance and offerings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {cafeImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative group aspect-square"
                        >
                          <img
                            src={image}
                            alt={`Cafe ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <X
                              className="absolute top-3 right-2 w-5 h-5 hover:text-red-600 cursor-pointer"
                              onClick={() => handleRemoveImage(index)}
                            />

                            <Button variant="secondary" size="sm">
                              <Camera className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                      <label className="aspect-square flex items-center justify-center border-2 border-dashed border-muted rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleImageUpload}
                          accept="image/*"
                        />
                        <div className="text-center">
                          <Camera className="w-6 h-6 mx-auto text-muted-foreground" />
                          <span className="text-sm text-muted-foreground mt-2">
                            Add Photo
                          </span>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )} */}

              {/* Conditional Rendering for Business Details */}
              {page === "Business Details" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Business Details</CardTitle>
                    <CardDescription>
                      Update your cafe's basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Business Name</Label>
                        <Input defaultValue="John's Cafe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Business Type</Label>
                        <Select defaultValue="cafe">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cafe">Cafe</SelectItem>
                            <SelectItem value="restaurant">
                              Restaurant
                            </SelectItem>
                            <SelectItem value="bakery">Bakery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input type="tel" defaultValue="+1 (555) 000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                          type="url"
                          defaultValue="https://cafe.example.com"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Address</Label>
                        <Textarea defaultValue="123 Cafe Street, Food District, City, 12345" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Operating Hours</Label>
                      <div className="space-y-4">
                        {days.map((day) => (
                          <div
                            key={day}
                            className="flex items-center space-x-4"
                          >
                            <div className="w-20">
                              <span className="text-sm font-medium">{day}</span>
                            </div>
                            <Checkbox id={`day-${day}`} defaultChecked />
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <Input type="time" defaultValue="09:00" />
                              <Input type="time" defaultValue="18:00" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conditional Rendering for Subscription & Billing */}
              {page === "Billing" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription & Billing</CardTitle>
                    <CardDescription>
                      Manage your subscription and payment details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">Premium Plan</h4>
                          <p className="text-sm text-muted-foreground">
                            $49/month, billed annually
                          </p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold">150k</h3>
                                <p className="text-sm text-muted-foreground">
                                  Monthly Views
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold">2.5k</h3>
                                <p className="text-sm text-muted-foreground">
                                  Orders/Month
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold">99.9%</h3>
                                <p className="text-sm text-muted-foreground">
                                  Uptime
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="flex justify-end space-x-4">
                          <Button variant="outline">
                            View Invoice History
                          </Button>
                          <Button>Upgrade Plan</Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Payment Method</h4>
                      <div className="flex items-center space-x-4 rounded-lg border p-4">
                        <CreditCard className="h-6 w-6" />
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-muted-foreground">
                            Expires 12/24
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto">
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conditional Rendering for Verified Documents */}
              {page === "Verified Documents" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Verified Documents</CardTitle>
                    <CardDescription>
                      Manage your business verification documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          name: "Business License",
                          status: "verified",
                          expiry: "2025-12-31",
                        },
                        {
                          name: "Food Safety Certificate",
                          status: "verified",
                          expiry: "2024-06-30",
                        },
                        {
                          name: "Tax Registration",
                          status: "verified",
                          expiry: "2024-12-31",
                        },
                        {
                          name: "Insurance Policy",
                          status: "pending",
                          expiry: "2024-12-31",
                        },
                      ].map((doc) => (
                        <div
                          key={doc.name}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center space-x-4">
                            <FileCheck
                              className={cn(
                                "h-5 w-5",
                                doc.status === "verified"
                                  ? "text-green-500"
                                  : "text-yellow-500"
                              )}
                            />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Expires: {doc.expiry}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              doc.status === "verified"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full">
                        <FileCheck className="mr-2 h-4 w-4" />
                        Upload New Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
