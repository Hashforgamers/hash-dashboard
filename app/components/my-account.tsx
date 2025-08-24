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
import { User, MapPin, Calendar, Clock, Mail, Phone, Lock,  FileCheck, FileText, Camera, Building2, Sparkles, Shield, BellRing, Wallet, Settings, Globe, Coffee, ImageIcon, Save , Edit,  Ghost, X, Loader2, CreditCard , DollarSign } from 'lucide-react';
import { cn } from "@/lib/utils";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";
import {VENDOR_ONBOARD_URL} from "@/src/config/env"
import axios from "axios";
import HashLoader from "./ui/HashLoader";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'
import { OTPVerificationModal } from "./otpVerificationModal";

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
  const [cafeImageObjects, setCafeImageObjects] = useState<{id: number, url: string, public_id: string}[]>([]);


  // New state for operating hours editing
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [hoursData, setHoursData] = useState<any[]>([]);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);

  // Add these new state variables after your existing state
const [profileImage, setProfileImage] = useState<string>("");
const [uploadingProfile, setUploadingProfile] = useState<boolean>(false);
const [profileUploadMessage, setProfileUploadMessage] = useState<string | null>(null);

// Add these state variables after your existing ones
const [editingBusinessField, setEditingBusinessField] = useState<string | null>(null);
const [businessFormData, setBusinessFormData] = useState<any>({});
const [savingBusinessField, setSavingBusinessField] = useState<string | null>(null);

// Bank Transfer Details state
const [bankDetails, setBankDetails] = useState(null);
const [loadingBank, setLoadingBank] = useState(false);
const [bankForm, setBankForm] = useState({
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
});
const [editingBank, setEditingBank] = useState(false);
const [savingBank, setSavingBank] = useState(false);

// Payout state
const [payouts, setPayouts] = useState([]);
const [loadingPayouts, setLoadingPayouts] = useState(false);
const [payoutPage, setPayoutPage] = useState(1);
const [payoutTotalPages, setPayoutTotalPages] = useState(1);

// Add these new state variables after your existing bank states
const [showPaymentDialog, setShowPaymentDialog] = useState(false);
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank'); // 'bank' or 'upi'
const [tempPaymentSelection, setTempPaymentSelection] = useState('bank');

// Add these state variables to your MyAccount component
const [otpModalOpen, setOtpModalOpen] = useState(false);
const [pendingPage, setPendingPage] = useState(null);
const [verifiedPages, setVerifiedPages] = useState(new Set());

// Add OTP verification functions
const checkPageVerification = async (pageType) => {
  try {
    const response = await axios.get(`${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/check-verification?page_type=${pageType}`);
    return response.data.is_verified;
  } catch (error) {
    console.error('Error checking verification:', error);
    return false;
  }
};

const handleRestrictedPageClick = async (pageName) => {
  const pageType = pageName === "Bank Transfer" ? "bank_transfer" : "payout_history";
  
  // Check if already verified
  const isVerified = await checkPageVerification(pageType);
  
  if (isVerified || verifiedPages.has(pageType)) {
    setPage(pageName);
  } else {
    setPendingPage(pageName);
    setOtpModalOpen(true);
  }
};

const handleOTPVerifySuccess = () => {
  const pageType = pendingPage === "Bank Transfer" ? "bank_transfer" : "payout_history";
  setVerifiedPages(prev => new Set([...prev, pageType]));
  setPage(pendingPage);
  setPendingPage(null);
};




// Fetch bank details
const fetchBankDetails = async () => {
  if (!vendorId) return;
  setLoadingBank(true);
  try {
    const res = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/bank-details`);
    if (res.data.success) {
      setBankDetails(res.data.bankDetails);
      setBankForm({
        accountHolderName: res.data.bankDetails.accountHolderName || '',
        bankName: res.data.bankDetails.bankName || '',
        accountNumber: res.data.bankDetails.fullAccountNumber || '',
        ifscCode: res.data.bankDetails.ifscCode || '',
        upiId: res.data.bankDetails.upiId || '',
      });
    }
  } catch (error) {
    console.error('Error fetching bank details:', error);
    setBankDetails(null);
  } finally {
    setLoadingBank(false);
  }
};

// Fetch payouts
const fetchPayouts = async (page = 1) => {
  if (!vendorId) return;
  setLoadingPayouts(true);
  try {
    const res = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/payouts?page=${page}&per_page=10`);
    if (res.data.success && Array.isArray(res.data.payouts)) {
      setPayouts(res.data.payouts);
      setPayoutTotalPages(res.data.pagination?.total_pages || 1);
    } else {
      setPayouts([]); // Fallback to empty array
      setPayoutTotalPages(1);
    }
    } catch (error) {
    console.error('Error fetching payouts:', error);
    setPayouts([]); // Fallback to empty array on error
    setPayoutTotalPages(1);
  } finally {
    setLoadingPayouts(false);
  }
};

// Handle bank form changes
const handleBankFormChange = (field, value) => {
  setBankForm(prev => ({ ...prev, [field]: value }));
};

// Save bank details
const handleSaveBankDetails = async () => {
  setSavingBank(true);
  try {
    let dataToSend = {};
    
    // Conditional validation and data preparation
    if (selectedPaymentMethod === 'bank') {
      // Validate bank account fields
      if (!bankForm.accountHolderName?.trim()) {
        alert('Account holder name is required');
        setSavingBank(false);
        return;
      }
      if (!bankForm.bankName?.trim()) {
        alert('Bank name is required');
        setSavingBank(false);
        return;
      }
      if (!bankForm.accountNumber?.trim()) {
        alert('Account number is required');
        setSavingBank(false);
        return;
      }
      if (!bankForm.ifscCode?.trim() || bankForm.ifscCode.length !== 11) {
        alert('Valid IFSC code (11 characters) is required');
        setSavingBank(false);
        return;
      }
      
      // Prepare bank account data
      dataToSend = {
        accountHolderName: bankForm.accountHolderName.trim(),
        bankName: bankForm.bankName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        ifscCode: bankForm.ifscCode.toUpperCase().trim(),
        upiId: bankForm.upiId?.trim() || null // Optional UPI with bank
      };
    } else {
      // Validate UPI ID only
      if (!bankForm.upiId?.trim()) {
        alert('UPI ID is required');
        setSavingBank(false);
        return;
      }
      
      // Prepare UPI-only data
      dataToSend = {
        upiId: bankForm.upiId.trim(),
        // Explicitly set bank fields as null/empty for UPI-only
        accountHolderName: null,
        bankName: null,
        accountNumber: null,
        ifscCode: null
      };
    }

    console.log('Sending payment data:', dataToSend); // Debug log

    const response = await axios.post(`${DASHBOARD_URL}/api/vendor/${vendorId}/bank-details`, dataToSend);
    
    if (response.data.success) {
      alert(`${selectedPaymentMethod === 'bank' ? 'Bank account' : 'UPI'} details saved successfully!`);
      setEditingBank(false);
      fetchBankDetails();
    } else {
      alert(response.data.message || 'Failed to save payment details');
    }
  } catch (error) {
    console.error('Error saving payment details:', error);
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        'Failed to save payment details. Please try again.';
    alert(errorMessage);
  } finally {
    setSavingBank(false);
  }
};



// Add this to your existing useEffect or create a new one
useEffect(() => {
  if (page === "Bank Transfer") {
    fetchBankDetails();
  } else if (page === "Payout History") {
    fetchPayouts(payoutPage);
  } else if (page === "Operating Hours") {
    // Initialize hours data if needed
    if (!hoursData.length && data?.operatingHours) {
      const transformedHours = data.operatingHours.map(entry => ({
        day: entry.day,
        open: entry.open || "09:00",
        close: entry.close || "18:00", 
        slotDurationMinutes: entry.slotDurationMinutes || 30,
        isEnabled: entry.isEnabled !== undefined ? entry.isEnabled : true,
        hasChanges: false
      }));
      setHoursData(transformedHours);
    }
  }
}, [page, vendorId, payoutPage]);




// Add these handler functions after your existing ones
const handleEditBusinessField = (field: string) => {
  setEditingBusinessField(field);
  // Initialize form data with current values from API data
  setBusinessFormData({
    businessName: businessDetails.businessName || data?.cafeProfile?.name || "John's Cafe",
    businessType: businessDetails.businessType || "cafe", 
    phone: businessDetails.phone || "",
    website: businessDetails.website || "",
    address: businessDetails.address || ""
  });
};

const handleBusinessFieldChange = (field: string, value: string) => {
  setBusinessFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleSaveBusinessField = async (field: string) => {
  setSavingBusinessField(field);
  
  try {
    if (!vendorId) {
      throw new Error('Vendor ID not available');
    }

    // Prepare the data to send - only send the field being updated
    const updateData = {
      [field]: businessFormData[field]
    };

    console.log(`Saving ${field}:`, updateData);

    // Call your new API endpoint
    const response = await axios.patch(
      `${DASHBOARD_URL}/api/vendor/${vendorId}/business-details`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
        }
      }
    );

    if (response.data.success) {
      // Success notification
      alert(`${field} updated successfully!`);
      
      // Update local data to reflect the change
      setData(prevData => ({
        ...prevData,
        businessDetails: {
          ...prevData.businessDetails,
          [field]: businessFormData[field]
        },
        // Also update cafeProfile name if businessName was changed
        ...(field === 'businessName' && {
          cafeProfile: {
            ...prevData.cafeProfile,
            name: businessFormData[field]
          }
        })
      }));
      
      setEditingBusinessField(null);
      
      // Optionally refresh the entire dashboard data
      // window.dispatchEvent(new Event('refresh-dashboard'));
      
    } else {
      throw new Error(response.data.message || 'Update failed');
    }
    
  } catch (error: any) {
    console.error('Error saving business field:', error);
    
    // Better error handling
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Error saving changes. Please try again.';
    
    alert(`Error updating ${field}: ${errorMessage}`);
  } finally {
    setSavingBusinessField(null);
  }
};

const handleCancelBusinessEdit = () => {
  setEditingBusinessField(null);
  setBusinessFormData({});
};


// Profile image upload handler
const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !vendorId) return;

  setUploadingProfile(true);
  setProfileUploadMessage("Uploading profile image...");

  const formData = new FormData();
  formData.append("profileImage", file);

  try {
    const response = await axios.post(
      `${DASHBOARD_URL}/api/vendor/${vendorId}/update-profile-image`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    if (response.data.success) {
      const uploadedImageUrl = response.data.profileImage.url;
      setProfileImage(uploadedImageUrl);
      setProfileUploadMessage("Profile image updated successfully!");
      setTimeout(() => setProfileUploadMessage(null), 3000);
    } else {
      console.error("Profile upload failed:", response.data.message);
      setProfileUploadMessage(`Upload failed: ${response.data.message}`);
      setTimeout(() => setProfileUploadMessage(null), 5000);
    }
  } catch (error) {
    console.error("Error uploading profile image:", error);
    setProfileUploadMessage("Error uploading profile image. Please try again.");
    setTimeout(() => setProfileUploadMessage(null), 5000);
  } finally {
    setUploadingProfile(false);
    event.target.value = ""; // Reset file input
  }
};



    // Initialize hours data when data is loaded
 // Update these handler functions
// Utility function to convert 24h to 12h format for display
// Utility function to convert 24h to 12h format for API
const convertTo12HourFormat = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

// API function to update operating hours
const updateOperatingHours = async (vendorId, dayData) => {
  try {
    const payload = {
      start_time: convertTo12HourFormat(dayData.open), // Convert 24h to 12h
      end_time: convertTo12HourFormat(dayData.close),   // Convert 24h to 12h
      slot_duration: dayData.slotDurationMinutes,
      day: dayData.day.toLowerCase()
    };

    console.log('Sending payload:', payload); // Debug log

    const response = await fetch(`${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/updateSlot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update operating hours');
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating operating hours:', error);
    return { success: false, error: error.message };
  }
};

// Function to handle save slot (integrates with your existing UI)
// Updated handleSaveSlot function
const handleSaveSlot = async (day: string) => {
  setSavingSlot(day);
  
  try {
    const token = localStorage.getItem("jwtToken");
    if (!token) throw new Error('No authentication token found');
    
    const decodedToken = jwtDecode<{ sub: { id: number } }>(token);
    const currentVendorId = decodedToken.sub.id;
    
    const dayData = hoursData.find(entry => entry.day === day);
    
    if (!dayData) {
      throw new Error('Day data not found');
    }

    if (!dayData.open || !dayData.close || !dayData.slotDurationMinutes) {
      throw new Error('Please fill in all required fields');
    }

    // Show initial feedback
    console.log('Starting slot update process...');
    
    const result = await updateOperatingHours(currentVendorId, dayData);
    
    if (result.success) {
      alert(`${day.charAt(0).toUpperCase() + day.slice(1)} hours updated successfully!`);
      
      setHoursData(prevData => 
        prevData.map(entry => 
          entry.day === day 
            ? { ...entry, hasChanges: false }
            : entry
        )
      );

  
      
      setEditingSlot(null);
      window.dispatchEvent(new Event('refresh-dashboard'));
      
    } else {
      throw new Error(result.error);
    }
    
  } catch (error: any) {
    console.error('Error saving slot:', error);
    alert('Error: ' + (error.message || 'Failed to save operating hours'));
  } finally {
    setSavingSlot(null);
  }
};


// Function to handle time changes with validation
const handleTimeChange = (day, timeType, value) => {
  setHoursData(prevData => 
    prevData.map(entry => {
      if (entry.day === day) {
        return { ...entry, [timeType]: value, hasChanges: true };
      }
      return entry;
    })
  );
};

// Function to handle slot duration changes with validation
const handleSlotDurationChange = (day, duration) => {
  if (duration < 15 || duration > 240) {
    toast.error('Slot duration must be between 15 and 240 minutes');
    return;
  }
  
  setHoursData(prevData => 
    prevData.map(entry => 
      entry.day === day 
        ? { ...entry, slotDurationMinutes: duration, hasChanges: true }
        : entry
    )
  );
};

// Function to handle enable/disable toggle
const handleSlotToggle = (day, isEnabled) => {
  setHoursData(prevData => 
    prevData.map(entry => 
      entry.day === day 
        ? { ...entry, isEnabled, hasChanges: true }
        : entry
    )
  );
};


// Loading Overlay Component
const UpdatingOverlay = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
    >
      <div className="bg-card border border-border rounded-lg p-8 shadow-2xl max-w-md mx-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Animated Spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted rounded-full animate-spin border-t-primary"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary/30"></div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground">
            Updating Operating Hours
          </h3>
          
          {/* Description */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Please wait while we update your slot configurations.</p>
            <p className="font-medium text-yellow-400">
              This process may take 2-3 minutes.
            </p>
            <p>Please do not close this window or navigate away.</p>
          </div>
          
          {/* Progress Dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


// Add this useEffect to initialize hours data when data loads
useEffect(() => {
  if (data?.operatingHours) {
    // Transform the operating hours data from your dashboard API
    const transformedHours = data.operatingHours.map(entry => ({
      day: entry.day,
      open: entry.open || "09:00",
      close: entry.close || "18:00", 
      slotDurationMinutes: entry.slotDurationMinutes || 30,
      isEnabled: entry.isEnabled !== undefined ? entry.isEnabled : true,
      hasChanges: false
    }));
    setHoursData(transformedHours);
  } else {
    // Initialize with default hours if no data exists
    const defaultHours = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ].map(day => ({
      day: day.substring(0, 3), // mon, tue, etc.
      open: "09:00",
      close: "18:00",
      slotDurationMinutes: 30,
      isEnabled: true,
      hasChanges: false
    }));
    setHoursData(defaultHours);
  }
}, [data]);

// Add missing handleEditSlot function
const handleEditSlot = (day) => {
  setEditingSlot(day);
};

// Add missing handleCancelEdit function  
const handleCancelEdit = () => {
  setEditingSlot(null);
  // Reset any changes for the day being edited
  if (data?.operatingHours) {
    const originalData = data.operatingHours.find(entry => entry.day === editingSlot);
    if (originalData) {
      setHoursData(prevData => 
        prevData.map(entry => 
          entry.day === editingSlot 
            ? { ...originalData, hasChanges: false }
            : entry
        )
      );
    }
  }
};

// Add toast functionality (you can use react-hot-toast or any toast library)
const toast = {
  success: (message) => {
    // Replace with your actual toast implementation
    console.log('Success:', message);
    // For now, you can use browser alert or implement proper toast
    alert('Success: ' + message);
  },
  error: (message) => {
    // Replace with your actual toast implementation  
    console.log('Error:', message);
    // For now, you can use browser alert or implement proper toast
    alert('Error: ' + message);
  }
};




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

  const handleViewInpage = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const label = e.currentTarget.dataset.label;
    if (label === "Bank Transfer" || label === "Payout History") {
    await handleRestrictedPageClick(label);
  } else {
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

      // Set profile image
      const profileImg = res.data.cafeProfile.profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop";
      setProfileImage(profileImg);

      if (res.data && res.data.cafeProfile) {
        setData(res.data);
        
        const imagesData = res.data.cafeGallery?.images || [];
        console.log("Images data:", imagesData); // Debug log
        
        // Check if images are objects with IDs or just URLs
        if (imagesData.length > 0 && typeof imagesData[0] === 'object' && imagesData.id) {
          // New format: objects with IDs
          console.log("Using image objects format");
          setCafeImageObjects(imagesData);
          const imageUrls = imagesData.map((img: any) => img.url || "").filter(Boolean);
          setCafeImages(imageUrls);
        } else {
          // Old format: just URLs or mixed format - handle safely
          console.log("Using URL format");
          setCafeImageObjects([]);
          
          const images = imagesData
            .filter((item: any) => item !== null && item !== undefined) // Remove null/undefined
            .map((item: any) => {
              let imgUrl = "";
              
              // Handle different data types
              if (typeof item === 'string') {
                imgUrl = item;
              } else if (typeof item === 'object' && item.url) {
                imgUrl = item.url;
              } else if (typeof item === 'object' && item.path) {
                imgUrl = item.path;
              } else {
                console.warn("Unexpected image data format:", item);
                return "";
              }
              
              // Skip empty strings
              if (!imgUrl || imgUrl.trim() === "") return "";
              
              // Handle URL formatting
              if (imgUrl.startsWith("http")) {
                return imgUrl;
              } else {
                return `${DASHBOARD_URL.replace(/\/$/, "")}${
                  imgUrl.startsWith("/") ? "" : "/"
                }${imgUrl}`;
              }
            })
            .filter(Boolean); // Remove empty strings
            
          setCafeImages(images);
        }
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


const handleDeleteImageByUrl = async (imageIndex: number) => {
  console.log('handleDeleteImageByUrl called with index:', imageIndex);
  
  if (!vendorId) {
    console.log('No vendorId available');
    return;
  }

  setUploadMessage("Deleting image...");

  try {
    const imageUrl = cafeImages[imageIndex];
    console.log('Attempting to delete image URL:', imageUrl);
    
    if (!imageUrl) {
      throw new Error("Image URL not found");
    }

    const response = await axios.delete(
      `${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/delete-image-by-url`,
      {
        data: { imageUrl: imageUrl },
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log('Delete response:', response.data);

    if (response.data.success) {
      setCafeImages((prevImages) =>
        prevImages.filter((_, index) => index !== imageIndex)
      );
      
      setUploadMessage("Image deleted successfully!");
      setTimeout(() => setUploadMessage(null), 3000);
    } else {
      throw new Error(response.data.message || 'Delete failed');
    }
  } catch (error: any) {
    console.error("Error deleting image:", error);
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Error deleting image. Please try again.';
    setUploadMessage(errorMessage);
    setTimeout(() => setUploadMessage(null), 5000);
  }
};



  // Updated delete function using image IDs
const handleDeleteImage = async (imageIndex: number) => {
  if (!vendorId || !cafeImageObjects[imageIndex]) return;

  // Show loading state
  setUploadMessage("Deleting image...");

  try {
    const imageId = cafeImageObjects[imageIndex]?.id;
    
    if (!imageId) {
      throw new Error("Image ID not found");
    }

    const response = await axios.delete(
      `${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/delete-image/${imageId}`
    );

    if (response.data.success) {
      // Remove image from both arrays
      setCafeImages((prevImages) =>
        prevImages.filter((_, index) => index !== imageIndex)
      );
      
      setCafeImageObjects((prevImages) =>
        prevImages.filter((_, index) => index !== imageIndex)
      );
      
      // Show success message
      setUploadMessage("Image deleted successfully!");
      setTimeout(() => setUploadMessage(null), 3000);
      
      // Optional: Update with remaining images from backend
      if (response.data.remaining_images) {
        const remainingUrls = response.data.remaining_images.map((img: any) => img.url);
        setCafeImages(remainingUrls);
        setCafeImageObjects(response.data.remaining_images);
      }
      
    } else {
      throw new Error(response.data.message || 'Delete failed');
    }
  } catch (error: any) {
    console.error("Error deleting image:", error);
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Error deleting image. Please try again.';
    setUploadMessage(errorMessage);
    setTimeout(() => setUploadMessage(null), 5000);
  }
};





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
           {/** {cafeProfile && (
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground">Cafe Profile</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your public profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  <div className="flex flex-col items-center space-y-3">
                   
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
            )} **/}

            {/* Updated Cafe Profile Card with editable image */}
{cafeProfile && (
  <Card className="bg-card border border-border shadow-lg">
    <CardHeader>
      <CardTitle className="text-foreground">Cafe Profile</CardTitle>
      <CardDescription className="text-muted-foreground">
        Your public profile information
      </CardDescription>
    </CardHeader>
    <CardContent className="p-4 space-y-6">
      {/* Profile Upload Message */}
      {profileUploadMessage && (
        <div className={cn(
          "p-2 rounded-md text-xs font-medium text-center",
          profileUploadMessage.includes("successfully") 
            ? "bg-green-500/20 text-green-400" 
            : "bg-red-500/20 text-red-400"
        )}>
          {profileUploadMessage}
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-3">
        {/* Editable Profile Image */}
        <div className="relative group transition-transform duration-300 ease-in-out hover:scale-105">
          <div className="h-32 w-32 rounded-full p-[4px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 animate-spin-slow">
            <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              <img
                src={profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"}
                alt="Profile Avatar"
                className="h-full w-full object-cover rounded-full"
              />
              
              {/* Loading overlay */}
              {uploadingProfile && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>
          
          {/* Edit Button */}
          <label 
            htmlFor="profile-image-upload"
            className="absolute -bottom-1 -right-1 h-10 w-10 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-background transition-all duration-200 hover:scale-110"
          >
            <input
              id="profile-image-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleProfileImageUpload}
              disabled={uploadingProfile}
            />
            <Edit className="h-4 w-4 text-primary-foreground" />
          </label>
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
                    { icon: Clock, label: "Operating Hours" },  
                    
                    { icon: FileCheck, label: "Verified Documents" },
                    { icon: CreditCard, label: "Bank Transfer" },  
                    { icon: DollarSign, label: "Payout History" }, 
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
    <Card className="bg-card border border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Cafe Gallery</CardTitle>
        <CardDescription className="text-muted-foreground">
          Showcase your cafe's ambiance and offerings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadMessage && (
          <div className={cn(
            "p-3 rounded-md text-sm font-medium",
            uploadMessage.includes("successfully") || uploadMessage.includes("deleted") 
              ? "bg-green-500/20 text-green-400" 
              : uploadMessage.includes("Uploading") || uploadMessage.includes("Deleting")
              ? "bg-blue-500/20 text-blue-400"
              : "bg-red-500/20 text-red-400"
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
                {/* Delete Button */}
                <Button
                  type="button"  // Prevent form submission
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 text-white hover:bg-red-500/80 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Delete button clicked for index:', index); // Debug log
                    
                    // Use appropriate delete function
                    if (cafeImageObjects.length > 0 && cafeImageObjects[index]?.id) {
                      handleDeleteImage(index);
                    } else {
                      handleDeleteImageByUrl(index);
                    }
                  }}
                  disabled={uploadMessage?.includes("Deleting")}
                  title="Delete image"
                >
                  {uploadMessage?.includes("Deleting") ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                  <span className="sr-only">Remove image</span>
                </Button>
                
                {/* View Full Size Button */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 left-2 text-white hover:bg-blue-500/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(image, '_blank');
                  }}
                  title="View full size"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="sr-only">View full size</span>
                </Button>
                
                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs font-medium">Image {index + 1}</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Photo Button */}
          <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/50 rounded-md cursor-pointer hover:border-primary/70 transition-colors duration-200 bg-muted/20 text-muted-foreground">
            <input
              type="file"
              className="hidden"
              onChange={handleImageUpload}
              accept="image/*"
              disabled={uploadMessage?.includes("Uploading") || uploadMessage?.includes("Deleting")}
            />
            <div className="text-center">
              {uploadMessage?.includes("Uploading") ? (
                <>
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Add Photo</span>
                </>
              )}
            </div>
          </label>
        </div>
        
        {/* Gallery Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border space-y-2 sm:space-y-0">
          <div className="text-sm text-muted-foreground">
            {cafeImages.length} / 12 images uploaded
          </div>
          <div className="text-xs text-muted-foreground">
            Supported formats: JPG, PNG, WebP (Max 5MB each)
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}



              {/**  {page === "Business Details" && businessDetails && (
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
                    </div> **/}
                    {page === "Business Details" && businessDetails && (
  <Card className="bg-card border border-border shadow-lg">
    <CardHeader>
      <CardTitle className="text-foreground">Business Details</CardTitle>
      <CardDescription className="text-muted-foreground">
        Update your cafe's basic information
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      
      {/* Editable Business Details */}
      <div className="space-y-4">
        {[
          { key: 'phone', label: 'Phone', type: 'tel', value: businessDetails.phone || "+1 (555) 000-0000" },
          { key: 'website', label: 'Website', type: 'url', value: businessDetails.website || "https://cafe.example.com" },
          { key: 'address', label: 'Address', type: 'textarea', value: businessDetails.address || "123 Cafe Street, Food District, City, 12345" }
        ].map((field) => (
          <div key={field.key} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
            
            {/* Field Label and Content */}
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium text-foreground">{field.label}</Label>
              
              {editingBusinessField === field.key ? (
                // Edit Mode
                <div className="space-y-2">
                  {field.type === 'textarea' ? (
                    <Textarea
                      value={businessFormData[field.key] || ''}
                      onChange={(e) => handleBusinessFieldChange(field.key, e.target.value)}
                      className="bg-input border-input text-foreground resize-none"
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={businessFormData[field.key] || ''}
                      onChange={(e) => handleBusinessFieldChange(field.key, e.target.value)}
                      className="bg-input border-input text-foreground"
                    />
                  )}
                </div>
              ) : (
                // View Mode
                <p className="text-sm text-muted-foreground break-words">
                  {field.value || `No ${field.label.toLowerCase()} provided`}
                </p>
              )}
            </div>

            {/* Edit/Save/Cancel Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              {editingBusinessField === field.key ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveBusinessField(field.key)}
                    disabled={savingBusinessField === field.key}
                    className="border-green-500/50 text-green-600 hover:bg-green-500/10 hover:border-green-500 disabled:opacity-50"
                  >
                    {savingBusinessField === field.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelBusinessEdit}
                    disabled={savingBusinessField === field.key}
                    className="border-gray-500/50 text-gray-600 hover:bg-gray-500/10 hover:border-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditBusinessField(field.key)}
                  disabled={editingBusinessField !== null}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted p-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Non-editable Business Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-border bg-muted/10">
            <Label className="text-sm font-medium text-foreground">Business Name</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {businessDetails.businessName || "John's Cafe"}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/10">
            <Label className="text-sm font-medium text-foreground">Business Type</Label>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {businessDetails.businessType || "cafe"}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{page === "Operating Hours" && (
  <Card className="bg-card border border-border shadow-lg">
    <CardHeader>
      <CardTitle className="text-foreground flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Operating Hours
      </CardTitle>
      <CardDescription className="text-muted-foreground">
        Manage your cafe's working hours and slot durations
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <Label className="text-foreground">Operating Hours</Label>
        
        <div className="space-y-3">
          {hoursData.map((entry, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
              {/* Day Name */}
              <div className="w-20">
                <span className="text-sm font-medium text-foreground capitalize">{entry.day}</span>
              </div>
              
              {/* Enable/Disable Checkbox */}
              <Checkbox 
                id={`day-${entry.day}`}
                checked={entry.isEnabled}
                onCheckedChange={(checked) => handleSlotToggle(entry.day, checked)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                disabled={editingSlot !== null && editingSlot !== entry.day}
              />
              
              {/* Time Inputs */}
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input 
                  type="time" 
                  value={entry.open || "09:00"}
                  onChange={(e) => handleTimeChange(entry.day, 'open', e.target.value)}
                  className={`bg-input border-input text-foreground ${!entry.isEnabled ? 'opacity-50' : ''}`}
                  disabled={editingSlot !== entry.day || !entry.isEnabled}
                />
                <Input 
                  type="time" 
                  value={entry.close || "18:00"}
                  onChange={(e) => handleTimeChange(entry.day, 'close', e.target.value)}
                  className={`bg-input border-input text-foreground ${!entry.isEnabled ? 'opacity-50' : ''}`}
                  disabled={editingSlot !== entry.day || !entry.isEnabled}
                />
              </div>
              
              {/* Slot Duration Input */}
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Duration:</Label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    value={entry.slotDurationMinutes || 30}
                    onChange={(e) => handleSlotDurationChange(entry.day, parseInt(e.target.value) || 30)}
                    className={`w-16 bg-input border-input text-foreground text-center rounded-r-none border-r-0 ${!entry.isEnabled ? 'opacity-50' : ''}`}
                    disabled={editingSlot !== entry.day || !entry.isEnabled}
                    min="15"
                    max="240"
                    step="15"
                  />
                  <div className="flex items-center justify-center mx-[-16px] px-2 py-1.5 bg-muted/50 border border-input rounded-r-md border-l-0 min-w-[32px]">
                    <span className="text-xs text-muted-foreground mx-[-10px]">min</span>
                  </div>
                </div>
              </div>
              
              {/* Edit/Save Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {editingSlot === entry.day ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveSlot(entry.day)}
                      disabled={savingSlot === entry.day}
                      className="border-green-500/50 text-green-600 hover:bg-green-500/10 hover:border-green-500 disabled:opacity-50"
                    >
                      {savingSlot === entry.day ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={savingSlot === entry.day}
                      className="border-gray-500/50 text-gray-600 hover:bg-gray-500/10 hover:border-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSlot(entry.day)}
                    disabled={editingSlot !== null}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)}

                

            {/**   {page === "Billing" && billingDetails && (
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
            )} **/}

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




{/* ADD BANK TRANSFER SECTION */}
{page === "Bank Transfer" && (
  <Card className="bg-card border border-border shadow-lg">
    <CardHeader>
      <CardTitle className="text-foreground flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        Bank Transfer Details
      </CardTitle>
      <CardDescription className="text-muted-foreground">
        Manage your payment details for payouts
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {loadingBank ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading payment details...</span>
        </div>
      ) : editingBank ? (
        // Edit Form
        <div className="space-y-4">
          {/* Show selected payment method indicator */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedPaymentMethod === 'bank' ? 'Bank Account' : 'UPI Payment'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedPaymentMethod === 'bank' 
                  ? 'Complete bank account details' 
                  : 'UPI ID for payments'
                }
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingBank(false);
                setShowPaymentDialog(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change Method
            </Button>
          </div>

          {selectedPaymentMethod === 'bank' ? (
            // Bank Account Fields
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Account Holder Name *</Label>
                <Input
                  value={bankForm.accountHolderName || ''}
                  onChange={(e) => handleBankFormChange('accountHolderName', e.target.value)}
                  placeholder="Enter account holder name"
                  className="bg-input border-input text-foreground"
                  required
                />
              </div>
              <div>
                <Label className="text-foreground">Bank Name *</Label>
                <Input
                  value={bankForm.bankName || ''}
                  onChange={(e) => handleBankFormChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                  className="bg-input border-input text-foreground"
                  required
                />
              </div>
              <div>
                <Label className="text-foreground">Account Number *</Label>
                <Input
                  value={bankForm.accountNumber || ''}
                  onChange={(e) => handleBankFormChange('accountNumber', e.target.value)}
                  placeholder="Enter account number"
                  className="bg-input border-input text-foreground"
                  required
                />
              </div>
              <div>
                <Label className="text-foreground">IFSC Code *</Label>
                <Input
                  value={bankForm.ifscCode || ''}
                  onChange={(e) => handleBankFormChange('ifscCode', e.target.value.toUpperCase())}
                  placeholder="Enter IFSC code"
                  maxLength={11}
                  className="bg-input border-input text-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  11-character IFSC code (e.g., SBIN0000123)
                </p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-foreground">UPI ID (Optional)</Label>
                <Input
                  value={bankForm.upiId || ''}
                  onChange={(e) => handleBankFormChange('upiId', e.target.value)}
                  placeholder="Enter UPI ID (optional)"
                  className="bg-input border-input text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can also add UPI ID as backup payment method
                </p>
              </div>
            </div>
          ) : (
            // UPI Only Fields
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">UPI ID *</Label>
                <Input
                  value={bankForm.upiId || ''}
                  onChange={(e) => handleBankFormChange('upiId', e.target.value)}
                  placeholder="Enter UPI ID (e.g., yourname@paytm)"
                  className="bg-input border-input text-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your UPI ID like yourname@paytm, yourname@phonepe, yourname@gpay, etc.
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> With UPI payment method, you'll receive payouts directly to your UPI ID. 
                  Make sure the UPI ID is active and linked to your bank account.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex gap-4">
            <Button 
              type="button"
              onClick={handleSaveBankDetails} 
              disabled={savingBank}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {savingBank ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Details
                </>
              )}
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setEditingBank(false)}
              disabled={savingBank}
              className="border-border text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      ) : bankDetails ? (
        // Display Mode - Shows only saved data
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs">
              {bankDetails.upiId && !bankDetails.accountNumber 
                ? 'UPI Payment' 
                : bankDetails.accountNumber && !bankDetails.upiId
                ? 'Bank Account'
                : bankDetails.accountNumber && bankDetails.upiId
                ? 'Bank Account + UPI'
                : 'Payment Details'
              }
            </Badge>
            <Badge className={`text-xs ${
              bankDetails.verificationStatus === 'VERIFIED' 
                ? 'bg-green-500/20 text-green-400' 
                : bankDetails.verificationStatus === 'REJECTED'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {bankDetails.verificationStatus || 'PENDING'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Show bank details only if account number exists */}
            {bankDetails.accountNumber && (
              <>
                <div>
                  <Label className="text-sm text-muted-foreground">Account Holder Name</Label>
                  <p className="text-foreground font-medium">{bankDetails.accountHolderName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Bank Name</Label>
                  <p className="text-foreground font-medium">{bankDetails.bankName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Account Number</Label>
                  <p className="text-foreground font-medium">{bankDetails.accountNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">IFSC Code</Label>
                  <p className="text-foreground font-medium">{bankDetails.ifscCode}</p>
                </div>
              </>
            )}
            
            {/* Always show UPI if available */}
            {bankDetails.upiId && (
              <div className={bankDetails.accountNumber ? "" : "md:col-span-2"}>
                <Label className="text-sm text-muted-foreground">UPI ID</Label>
                <p className="text-foreground font-medium">{bankDetails.upiId}</p>
              </div>
            )}
            
            {/* Show message if no data available */}
            {!bankDetails.accountNumber && !bankDetails.upiId && (
              <div className="md:col-span-2 text-center py-4">
                <p className="text-muted-foreground">No payment details available</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              type="button"
              onClick={() => setShowPaymentDialog(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Payment Details
            </Button>
            {bankDetails.verificationStatus === 'PENDING' && (
              <Button 
                type="button"
                variant="outline"
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
                disabled
              >
                <Clock className="h-4 w-4 mr-2" />
                Verification Pending
              </Button>
            )}
          </div>
        </div>
      ) : (
        // No Bank Details
        <div className="text-center py-8">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Payment Details Found</h3>
          <p className="text-muted-foreground mb-4">Add your payment details to receive payouts</p>
          <Button 
            type="button"
            onClick={() => setShowPaymentDialog(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Add Payment Details
          </Button>
        </div>
      )}

      {/* Payment Method Selection Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card rounded-lg p-6 max-w-md w-full mx-auto shadow-2xl border border-border"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select Payment Method
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose what type of payment method you want to add for receiving payouts
                </p>
              </div>

              <div className="space-y-3">
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    tempPaymentSelection === 'bank' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/20'
                  }`}
                  onClick={() => setTempPaymentSelection('bank')}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                    tempPaymentSelection === 'bank' ? 'border-primary' : 'border-border'
                  }`}>
                    {tempPaymentSelection === 'bank' && (
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <p className="font-medium text-foreground">Bank Account</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add complete bank details including account holder name, bank name, account number & IFSC code
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    tempPaymentSelection === 'upi' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/20'
                  }`}
                  onClick={() => setTempPaymentSelection('upi')}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                    tempPaymentSelection === 'upi' ? 'border-primary' : 'border-border'
                  }`}>
                    {tempPaymentSelection === 'upi' && (
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <p className="font-medium text-foreground">UPI ID</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quick setup with just your UPI ID (e.g., yourname@paytm, yourname@phonepe)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1 border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod(tempPaymentSelection);
                    setShowPaymentDialog(false);
                    setEditingBank(true);
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </CardContent>
  </Card>
)}



{/* ADD PAYOUT HISTORY SECTION */}
{page === "Payout History" && (
  <Card className="bg-card border border-border shadow-lg">
    <CardHeader>
      <CardTitle className="text-foreground flex items-center gap-2">
        <DollarSign className="w-5 h-5" />
        Payout History
      </CardTitle>
      <CardDescription className="text-muted-foreground">
        View your payout transaction history
      </CardDescription>
    </CardHeader>
    <CardContent>
      {loadingPayouts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading payout history...</span>
        </div>
      ) : (Array.isArray(payouts) && payouts.length > 0) ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-4 py-3 text-left text-sm font-medium text-foreground">Date</th>
                  <th className="border border-border px-4 py-3 text-left text-sm font-medium text-foreground">Amount</th>
                  <th className="border border-border px-4 py-3 text-left text-sm font-medium text-foreground">Mode</th>
                  <th className="border border-border px-4 py-3 text-left text-sm font-medium text-foreground">UTR Number</th>
                  <th className="border border-border px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                  <th className="border border-border px-4 py-3 text-left text-sm font-medium text-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout, index) => (
                  <tr key={payout?.id || index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="border border-border px-4 py-3 text-sm">
                      {payout?.payoutDate ? new Date(payout.payoutDate).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="border border-border px-4 py-3 text-sm font-medium">
                      <FontAwesomeIcon icon={faIndianRupeeSign} className="w-3 h-3 mr-1" />
                      {payout?.amount ? parseFloat(payout.amount).toFixed(2) : '0.00'}
                    </td>
                    <td className="border border-border px-4 py-3 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {payout?.transferMode || 'N/A'}
                      </Badge>
                    </td>
                    <td className="border border-border px-4 py-3 text-sm">
                      {payout?.utrNumber || '-'}
                    </td>
                    <td className="border border-border px-4 py-3 text-sm">
                      <Badge className={`${
                        payout?.status === 'SUCCESS' 
                          ? 'bg-green-500/20 text-green-400' 
                          : payout?.status === 'FAILED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {payout?.status || 'PENDING'}
                      </Badge>
                    </td>
                    <td className="border border-border px-4 py-3 text-sm text-muted-foreground">
                      {payout?.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {payoutTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayoutPage(Math.max(1, payoutPage - 1))}
                disabled={payoutPage === 1}
                className="border-border text-foreground hover:bg-muted"
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm text-muted-foreground">
                Page {payoutPage} of {payoutTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayoutPage(Math.min(payoutTotalPages, payoutPage + 1))}
                disabled={payoutPage === payoutTotalPages}
                className="border-border text-foreground hover:bg-muted"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Payout History</h3>
          <p className="text-muted-foreground">Your payout transactions will appear here</p>
        </div>
      )}
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
      <UpdatingOverlay visible={savingSlot !== null} />

      
<OTPVerificationModal
  isOpen={otpModalOpen}
  onClose={() => {
    setOtpModalOpen(false);
    setPendingPage(null);
  }}
  onVerifySuccess={handleOTPVerifySuccess}
  vendorId={vendorId}
  pageType={pendingPage === "Bank Transfer" ? "bank_transfer" : "payout_history"}
  pageName={pendingPage}
/>

   

    </div>

  
  );
}
