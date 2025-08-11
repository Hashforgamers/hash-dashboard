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
import { User, MapPin, Calendar, Clock, Mail, Phone, Lock, CreditCard, FileCheck, FileText, Camera, Building2, Sparkles, Shield, BellRing, Wallet, Settings, Globe, Coffee, ImageIcon, Ghost, X, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";
import {VENDOR_ONBOARD_URL} from "@/src/config/env"
import axios from "axios";
import HashLoader from "./ui/HashLoader";
import { motion } from "framer-motion";

export function MyAccount() {
  const [cafeImages, setCafeImages] = useState<string[]>([]);
  const [page, setPage] = useState<string | null>("Cafe Gallery");
  const prevPageRef = useRef<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [vendorId, setVendorId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState<string>("");

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded_token.sub.id);
        console.log("Vendor ID from token:", decoded_token.sub.id);
      } catch (error) {
        console.error('Error decoding token:', error);
        // Handle invalid token, e.g., redirect to login
      }
    } else {
      console.log("No JWT token found in localStorage.");
      // Handle no token, e.g., redirect to login
    }
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !vendorId) return;

    setUploadMessage("Uploading image..."); // Show loading message

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        `${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/add-image`, // Corrected URL to use DASHBOARD_URL
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        const uploadedImageUrl = response.data.image.url;
        setCafeImages((prevImages) => [...prevImages, uploadedImageUrl]);
        setUploadMessage("Image uploaded successfully!");
        setTimeout(() => setUploadMessage(null), 3000);
      } else {
        console.error("Upload failed:", response.data.message);
        setUploadMessage(`Upload failed: ${response.data.message}`);
        setTimeout(() => setUploadMessage(null), 5000);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadMessage("Error uploading image. Please try again.");
      setTimeout(() => setUploadMessage(null), 5000);
    } finally {
      event.target.value = ""; // Reset file input value
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setCafeImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleViewInpage = (e: React.MouseEvent<HTMLButtonElement>) => {
    const label = e.currentTarget.dataset.label;
    if (label) {
      setPage(label);
    }
  };

  const handleDocumentPreview = (documentUrl: string, documentName: string) => {
    setPreviewDocument(documentUrl);
    setPreviewDocumentName(documentName);
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewDocumentName("");
  };

  // Document Preview Modal Component
  const DocumentPreviewModal = () => {
    if (!previewDocument) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card rounded-lg p-4 md:p-6 max-w-5xl max-h-[90vh] w-full mx-auto shadow-2xl border border-border"
        >
          <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
            <h3 className="text-lg md:text-xl font-semibold text-foreground">Preview: {previewDocumentName}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePreview}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="w-full h-[70vh] bg-muted rounded-md overflow-hidden">
            <iframe
              src={previewDocument}
              className="w-full h-full border-0"
              title="Document Preview"
            />
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              onClick={closePreview}
              variant="outline"
              className="border-border text-foreground hover:bg-muted hover:text-foreground"
            >
              Close
            </Button>
            <Button
              onClick={() => window.open(previewDocument, '_blank')}
              variant="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Open in New Tab
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  // Fetch vendor dashboard on vendorId change
  useEffect(() => {
    async function fetchVendorDashboard() {
      if (!vendorId) {
        console.log("No vendorId available");
        return;
      }
      setLoading(true);
      try {
        console.log("Fetching dashboard for vendor:", vendorId);
        const res = await axios.get(
          `${DASHBOARD_URL}/api/vendor/${vendorId}/dashboard`
        );
        console.log("API Response:", res.data);

        if (res.data && res.data.cafeProfile) {
          setData(res.data);
          const imagesRaw = res.data.cafeGallery?.images || [];
          const images = imagesRaw.map((imgUrl: string) => {
            if (!imgUrl) return "";
            if (imgUrl.startsWith("http")) {
              return imgUrl;
            } else {
              return `${DASHBOARD_URL.replace(/\/$/, "")}${
                imgUrl.startsWith("/") ? "" : "/"
              }${imgUrl}`;
            }
          });
          setCafeImages(images);
        } else {
          console.error("Dashboard API returned no expected data:", res.data);
          setData(null);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchVendorDashboard();
  }, [vendorId]);

  useEffect(() => {
    if (prevPageRef.current !== page) {
      console.log("Page updated:", page);
    }
    prevPageRef.current = page;
  }, [page]);

  if (loading) return <HashLoader className="min-h-[500px]" />;
  if (!data) return <div className="text-center text-destructive p-8">Failed to load data. Please try again later.</div>;

  const { navigation, cafeProfile, businessDetails, operatingHours, billingDetails, verifiedDocuments } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container py-6 md:py-8 space-y-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="col-span-12 md:col-span-3 space-y-4"
          >
            {/* Cafe Profile Card - Now in sidebar */}
            {cafeProfile && (
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground">Cafe Profile</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your public profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Profile Image */}
                    <div className="relative transition-transform duration-300 ease-in-out hover:scale-105">
                      <div className="h-32 w-32 rounded-full p-[4px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 animate-spin-slow">
                        <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                          <img
                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"
                            alt="Avatar"
                            className="h-full w-full object-cover rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-foreground">{cafeProfile.name || "Cafe Name"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cafeProfile.membershipStatus || "Standard Member"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-foreground">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{cafeProfile.website || "Not Available"}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{cafeProfile.email || "No Email Provided"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Menu */}
            <Card className="bg-card border border-border shadow-lg">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {[
                    { icon: ImageIcon, label: "Cafe Gallery" },
                    { icon: Building2, label: "Business Details" },
                    { icon: Wallet, label: "Billing" },
                    { icon: FileCheck, label: "Verified Documents" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200",
                          page === item.label
                            ? "bg-muted text-foreground font-semibold"
                            : ""
                        )}
                        onClick={handleViewInpage}
                        data-label={item.label}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    </motion.div>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="col-span-12 md:col-span-9 space-y-6"
          >
            <form className="space-y-6">
              {page === "Cafe Gallery" && (
                <div>
                  {/* Cafe Gallery - Now in main content */}
                  <Card className="bg-card border border-border shadow-lg" >
                    <CardHeader>
                      <CardTitle className="text-foreground">Cafe Gallery</CardTitle>
                      <CardDescription className="text-muted-foreground" >
                        Showcase your cafe's ambiance and offerings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {uploadMessage && (
                        <div className={cn(
                          "p-3 rounded-md text-sm font-medium",
                          uploadMessage.includes("successfully") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {uploadMessage}
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {cafeImages.map((image, index) => (
                          <div
                            key={index}
                            className="relative group aspect-square flex items-center justify-center border border-border rounded-md overflow-hidden shadow-sm"
                          >
                            <img
                              src={image || "/placeholder.svg"}
                              alt={`Cafe Image ${index + 1}`}
                              className="object-cover w-full h-full rounded-md"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 text-white hover:bg-white/20"
                                onClick={() => handleRemoveImage(index)}
                              >
                                <X className="w-5 h-5" />
                                <span className="sr-only">Remove image</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                        <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/50 rounded-md cursor-pointer hover:border-primary/70 transition-colors duration-200 bg-muted/20 text-muted-foreground">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleImageUpload}
                            accept="image/*"
                          />
                          <div className="text-center">
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <span className="text-sm font-medium">Add Photo</span>
                          </div>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {page === "Business Details" && businessDetails && (
                <Card className="bg-card border border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-foreground">Business Details</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Update your cafe's basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-foreground">Business Name</Label>
                        <Input
                          defaultValue={businessDetails.businessName || "John's Cafe"}
                          className="bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Business Type</Label>
                        <Select
                          defaultValue={businessDetails.businessType || "cafe"}
                        >
                          <SelectTrigger className="bg-input border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover text-popover-foreground">
                            <SelectItem value="cafe">Cafe</SelectItem>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="bakery">Bakery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Phone</Label>
                        <Input
                          type="tel"
                          defaultValue={businessDetails.phone || "+1 (555) 000-0000"}
                          className="bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Website</Label>
                        <Input
                          type="url"
                          defaultValue={businessDetails.website || "https://cafe.example.com"}
                          className="bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-foreground">Address</Label>
                        <Textarea
                          defaultValue={businessDetails.address || "123 Cafe Street, Food District, City, 12345"}
                          className="bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-foreground">Operating Hours</Label>
                      <div className="space-y-4">
                        {operatingHours?.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center space-x-4">
                            <div className="w-20">
                              <span className="text-sm font-medium text-foreground">{entry.day}</span>
                            </div>
                            <Checkbox id={`day-${entry.day}`} defaultChecked className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <Input type="time" defaultValue={entry.open || "09:00"} className="bg-input border-input text-foreground" />
                              <Input type="time" defaultValue={entry.close || "18:00"} className="bg-input border-input text-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {page === "Billing" && billingDetails && (
                <Card className="bg-card border border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-foreground">Subscription & Billing</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage your subscription and payment details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-border p-4 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-foreground">Premium Plan</h4>
                          <p className="text-sm text-muted-foreground">
                            $49/month, billed annually
                          </p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-secondary border border-border shadow-sm">
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold text-foreground">150k</h3>
                                <p className="text-sm text-muted-foreground">
                                  Monthly Views
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-secondary border border-border shadow-sm">
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold text-foreground">2.5k</h3>
                                <p className="text-sm text-muted-foreground">
                                  Orders/Month
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-secondary border border-border shadow-sm">
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold text-foreground">99.9%</h3>
                                <p className="text-sm text-muted-foreground">
                                  Uptime
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="flex justify-end space-x-4">
                          <Button variant="outline" className="border-border text-foreground hover:bg-muted hover:text-foreground">
                            View Invoice History
                          </Button>
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Upgrade Plan</Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-foreground">Payment Method</h4>
                      <div className="flex items-center space-x-4 rounded-lg border border-border p-4 bg-muted/20">
                        <CreditCard className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                          <p className="text-sm text-muted-foreground">
                            Expires 12/24
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-foreground hover:bg-muted">
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {page === "Verified Documents" && (
                <Card className="bg-card border border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-foreground">Verified Documents</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage and preview your uploaded business documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {verifiedDocuments && verifiedDocuments.length > 0 ? (
                        verifiedDocuments.map((doc: any) => (
                          <div
                            key={doc.id || doc.name}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors duration-200"
                          >
                            <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                              <FileText
                                className={cn(
                                  "h-5 w-5",
                                  doc.status === "verified"
                                    ? "text-green-500"
                                    : doc.status === "rejected"
                                    ? "text-red-500"
                                    : "text-yellow-500"
                                )}
                              />
                              <div>
                                <button
                                  onClick={() => handleDocumentPreview(doc.documentUrl, doc.name)}
                                  className="font-medium text-primary hover:text-primary/80 hover:underline cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!doc.documentUrl}
                                  type="button"
                                >
                                  {doc.name}
                                </button>
                                <div className="text-sm text-muted-foreground">
                                  <p>Status: <span className={cn(
                                    "font-medium",
                                    doc.status === "verified" ? "text-green-600" :
                                    doc.status === "rejected" ? "text-red-600" : "text-yellow-600"
                                  )}>{doc.status}</span></p>
                                  {doc.uploadedAt && (
                                    <p>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                  )}
                                  <p>Expires: {doc.expiry}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                              <Badge
                                variant={
                                  doc.status === "verified"
                                    ? "default"
                                    : doc.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={cn(
                                  doc.status === "verified" && "bg-green-500/20 text-green-400",
                                  doc.status === "rejected" && "bg-red-500/20 text-red-400",
                                  doc.status === "pending" && "bg-yellow-500/20 text-yellow-400"
                                )}
                              >
                                {doc.status}
                              </Badge>
                              {doc.documentUrl && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDocumentPreview(doc.documentUrl, doc.name)}
                                    type="button"
                                    className="border-border text-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <FileText className="mr-1 h-4 w-4" />
                                    Preview
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(doc.documentUrl, '_blank')}
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                  >
                                    Open
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                          <h3 className="mt-2 text-sm font-medium text-foreground">No documents uploaded</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Upload your business documents to get verified.
                          </p>
                        </div>
                      )}
                      <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                        <FileCheck className="mr-2 h-4 w-4" />
                        Upload New Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {/**<div className="flex justify-end space-x-4">
                <Button variant="outline" className="border-border text-foreground hover:bg-muted hover:text-foreground">Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
              </div> **/}
            </form>
          </motion.div>
        </div>
      </div>
      <DocumentPreviewModal />
    </div>
  );
}
