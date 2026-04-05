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
import { User, MapPin, Calendar, Clock, Mail, Phone, Lock,  FileCheck, FileText, Camera, Building2, Sparkles, Shield, BellRing, Wallet, Settings, Globe, Coffee, ImageIcon, Save , Edit,  Ghost, X, Loader2, CreditCard , DollarSign, Download } from 'lucide-react';
import { cn } from "@/lib/utils";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";
import { VENDOR_ONBOARD_URL } from "@/src/config/env"
import { BOOKING_URL } from "@/src/config/env"
import axios from "axios";
import HashLoader from "./ui/HashLoader";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'
import { OTPVerificationModal } from "./otpVerificationModal";
import { useAccess } from "@/app/context/AccessContext";

export function MyAccount() {
  const HFG_DEFAULT_LOGO = "https://res.cloudinary.com/dxjjigepf/image/upload/v1774472024/hash_for_gamer_logo_d1v4wc.png";
  const REQUIRED_DOCUMENT_TYPES: Array<{ key: string; label: string; hint: string }> = [
    { key: "business_registration", label: "Business Registration", hint: "GST/Udyam/MSME or equivalent registration proof." },
    { key: "owner_identification_proof", label: "Owner Identification Proof", hint: "Owner KYC proof (Aadhaar/PAN/Voter/Passport)." },
    { key: "tax_identification_number", label: "Tax Identification Number", hint: "GSTIN/PAN/Tax identifier document." },
    { key: "bank_acc_details", label: "Bank Account Details", hint: "Bank first-page proof with account holder details." },
  ];
  const { activeStaff } = useAccess();
  const isOwnerSession = (activeStaff?.role || "owner") === "owner";
  const [cafeImages, setCafeImages] = useState<string[]>([]);
  const [page, setPage] = useState<string | null>("Cafe Gallery");
  const prevPageRef = useRef<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [vendorId, setVendorId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState<string>("");
  const [uploadingDocumentId, setUploadingDocumentId] = useState<number | null>(null);
  const [uploadingDocumentType, setUploadingDocumentType] = useState<string | null>(null);
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
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
const [notificationPrefs, setNotificationPrefs] = useState({
  app_booking_notifications_enabled: true,
  pay_at_cafe_enabled: true,
  hash_wallet_enabled: true,
  payment_gateway_enabled: true,
  pass_enabled: true,
});
const [loadingNotificationPrefs, setLoadingNotificationPrefs] = useState(false);
const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);
const [payAtCafeAutomation, setPayAtCafeAutomation] = useState({
  auto_accept_enabled: false,
  auto_reject_enabled: false,
  auto_reject_after_minutes: 15,
});
const [loadingPayAtCafeAutomation, setLoadingPayAtCafeAutomation] = useState(false);
const [savingPayAtCafeAutomation, setSavingPayAtCafeAutomation] = useState(false);
const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
const [loadingSubscriptionHistory, setLoadingSubscriptionHistory] = useState(false);
const [settlementRows, setSettlementRows] = useState<any[]>([]);
const [settlementTotals, setSettlementTotals] = useState<any>(null);
const [loadingSettlementSummary, setLoadingSettlementSummary] = useState(false);
const [settlementFromDate, setSettlementFromDate] = useState(() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
});
const [settlementToDate, setSettlementToDate] = useState(() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
});

// Add these new state variables after your existing bank states
const [showPaymentDialog, setShowPaymentDialog] = useState(false);
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank'); // 'bank' or 'upi'
const [tempPaymentSelection, setTempPaymentSelection] = useState('bank');

// Add these state variables to your MyAccount component
const [otpModalOpen, setOtpModalOpen] = useState(false);
const [pendingPage, setPendingPage] = useState<string | null>(null);
const [verifiedPages, setVerifiedPages] = useState(new Set());

// GST setup state (moved from separate billing module into My Account)
const [gstProfile, setGstProfile] = useState({
  gst_registered: false,
  gst_enabled: false,
  gst_rate: 18,
  tax_inclusive: false,
  gstin: "",
  legal_name: "",
  state_code: "",
  place_of_supply_state_code: "",
});
const [loadingGst, setLoadingGst] = useState(false);
const [savingGst, setSavingGst] = useState(false);
const [gstMessage, setGstMessage] = useState<string | null>(null);

// Add these state variables after your existing bank states
const [paymentMethods, setPaymentMethods] = useState([]);
const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
const [togglingMethod, setTogglingMethod] = useState(null);
const [paymentMethodError, setPaymentMethodError] = useState(null);
const [paymentMethodSuccess, setPaymentMethodSuccess] = useState(null);
const [otpLoading, setOtpLoading] = useState(false);
const [bankDetailsHistory, setBankDetailsHistory] = useState<any[]>([]);
const [loadingBankHistory, setLoadingBankHistory] = useState(false);



// Fetch payment methods for vendor
// Fetch all available payment methods and vendor's selections
// Updated fetch function
const fetchPaymentMethods = async () => {
  if (!vendorId) return;
  setLoadingPaymentMethods(true);
  setPaymentMethodError(null);
  
  try {
    const response = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/paymentMethods`);
    
    if (response.data.success) {
      setPaymentMethods(response.data.payment_methods);
    } else {
      throw new Error(response.data.error || 'Failed to fetch payment methods');
    }
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    const errorMessage = error.response?.data?.error || 
                        error.message || 
                        'Failed to load payment methods';
    setPaymentMethodError(errorMessage);
    
    // If no payment methods exist, try to initialize them
    if (error.response?.status === 404 || errorMessage.includes('not found')) {
      await initializePaymentMethods();
    }
  } finally {
    setLoadingPaymentMethods(false);
  }
};

// Toggle payment method
const handleTogglePaymentMethod = async (payMethodId, currentState) => {
  if (!vendorId) return;
  
  setTogglingMethod(payMethodId);
  setPaymentMethodError(null);
  setPaymentMethodSuccess(null);
  
  try {
    const response = await axios.post(
      `${DASHBOARD_URL}/api/vendor/${vendorId}/paymentMethods/toggle`,
      { pay_method_id: payMethodId },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (response.data.success) {
      // Update the local state
      setPaymentMethods(prevMethods => 
        prevMethods.map(method => 
          method.pay_method_id === payMethodId 
            ? { ...method, is_enabled: response.data.data.is_enabled }
            : method
        )
      );
      
      // Show success message
      setPaymentMethodSuccess(response.data.message);
      setTimeout(() => setPaymentMethodSuccess(null), 3000);
    } else {
      throw new Error(response.data.error || 'Failed to toggle payment method');
    }
  } catch (error) {
    console.error('Error toggling payment method:', error);
    const errorMessage = error.response?.data?.error || 
                        error.message || 
                        'Failed to update payment method';
    setPaymentMethodError(errorMessage);
    setTimeout(() => setPaymentMethodError(null), 5000);
  } finally {
    setTogglingMethod(null);
  }
};



// Initialize payment methods if they don't exist
const initializePaymentMethods = async () => {
  try {
    setPaymentMethodError(null);
    const response = await axios.post(`${DASHBOARD_URL}/api/payment-methods/initialize`);
    
    if (response.data.success) {
      // After initialization, fetch the payment methods again
      setTimeout(() => {
        fetchPaymentMethods();
      }, 500);
    }
  } catch (error) {
    console.error('Error initializing payment methods:', error);
    setPaymentMethodError('Failed to initialize payment methods. Please contact support.');
  }
};



// Clear messages
const clearPaymentMethodMessages = () => {
  setPaymentMethodError(null);
  setPaymentMethodSuccess(null);
};

const normalizePaymentMethodName = (methodName: string) => {
  const cleaned = String(methodName || "").trim().toLowerCase().replace(/[-_]/g, " ");
  if (["pay at cafe", "pay in cafe", "pay at cafe", "pay_in_cafe"].includes(cleaned)) {
    return "pay_at_cafe";
  }
  if (["hash", "hash global pass", "hash_global_pass"].includes(cleaned)) {
    return "hash_global_pass";
  }
  if (["cafe specific pass", "cafe_specific_pass", "vendor pass"].includes(cleaned)) {
    return "cafe_specific_pass";
  }
  return cleaned;
};


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

const getRestrictedPageType = (pageName: string) =>
  pageName === "Bank Details" ? "bank_transfer" : "payout_history";

const handleRestrictedPageClick = async (pageName: string) => {
  const pageType = getRestrictedPageType(pageName);

  // Owner should never be blocked by OTP inside My Account restricted pages.
  if (isOwnerSession) {
    setPage(pageName);
    return;
  }

  setOtpLoading(true);
  
  // Check if already verified
  const isVerified = await checkPageVerification(pageType);
  setOtpLoading(false);
  
  if (isVerified || verifiedPages.has(pageType)) {
    setPage(pageName);
  } else {
    setPendingPage(pageName);
    setOtpModalOpen(true);
  }
};

const handleOTPVerifySuccess = () => {
  if (!pendingPage) return;
  const pageType = getRestrictedPageType(pendingPage);
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

const fetchBankDetailsHistory = async () => {
  if (!vendorId) return;
  setLoadingBankHistory(true);
  try {
    const res = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/bank-details/history?limit=100`);
    if (res.data?.success && Array.isArray(res.data?.history)) {
      setBankDetailsHistory(res.data.history);
    } else {
      setBankDetailsHistory([]);
    }
  } catch (error) {
    console.error("Error fetching bank detail history:", error);
    setBankDetailsHistory([]);
  } finally {
    setLoadingBankHistory(false);
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

const fetchNotificationPreferences = async () => {
  if (!vendorId) return;
  setLoadingNotificationPrefs(true);
  try {
    const res = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/notification-preferences`);
    if (res.data?.success && res.data?.preferences) {
      setNotificationPrefs({
        app_booking_notifications_enabled: !!res.data.preferences.app_booking_notifications_enabled,
        pay_at_cafe_enabled: !!res.data.preferences.pay_at_cafe_enabled,
        hash_wallet_enabled: !!res.data.preferences.hash_wallet_enabled,
        payment_gateway_enabled: !!res.data.preferences.payment_gateway_enabled,
        pass_enabled: !!res.data.preferences.pass_enabled,
      });
    }
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
  } finally {
    setLoadingNotificationPrefs(false);
  }
};

const fetchPayAtCafeAutomation = async () => {
  if (!vendorId) return;
  setLoadingPayAtCafeAutomation(true);
  try {
    const res = await axios.get(`${BOOKING_URL}/api/pay-at-cafe/settings/${vendorId}`);
    if (res.data?.success && res.data?.settings) {
      setPayAtCafeAutomation({
        auto_accept_enabled: !!res.data.settings.auto_accept_enabled,
        auto_reject_enabled: !!res.data.settings.auto_reject_enabled,
        auto_reject_after_minutes: Number(res.data.settings.auto_reject_after_minutes || 15),
      });
    }
  } catch (error) {
    console.error("Error fetching pay-at-cafe automation settings:", error);
  } finally {
    setLoadingPayAtCafeAutomation(false);
  }
};

const savePayAtCafeAutomation = async (next: any) => {
  if (!vendorId) return;
  setSavingPayAtCafeAutomation(true);
  try {
    const payload = {
      auto_accept_enabled: !!next.auto_accept_enabled,
      auto_reject_enabled: !!next.auto_reject_enabled,
      auto_reject_after_minutes: Math.max(1, Math.min(240, Number(next.auto_reject_after_minutes || 15))),
    };
    const res = await axios.put(`${BOOKING_URL}/api/pay-at-cafe/settings/${vendorId}`, payload);
    if (res.data?.success && res.data?.settings) {
      setPayAtCafeAutomation({
        auto_accept_enabled: !!res.data.settings.auto_accept_enabled,
        auto_reject_enabled: !!res.data.settings.auto_reject_enabled,
        auto_reject_after_minutes: Number(res.data.settings.auto_reject_after_minutes || 15),
      });
    }
  } catch (error) {
    console.error("Error saving pay-at-cafe automation settings:", error);
    alert("Failed to update pay-at-cafe auto settings");
  } finally {
    setSavingPayAtCafeAutomation(false);
  }
};

const saveNotificationPreferences = async (nextPrefs: any) => {
  if (!vendorId) return;
  setSavingNotificationPrefs(true);
  try {
    const res = await axios.put(
      `${DASHBOARD_URL}/api/vendor/${vendorId}/notification-preferences`,
      nextPrefs
    );
    if (res.data?.success) {
      setNotificationPrefs(res.data.preferences || nextPrefs);
    }
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    alert("Failed to update notification preferences");
  } finally {
    setSavingNotificationPrefs(false);
  }
};

const fetchSubscriptionHistory = async () => {
  if (!vendorId) return;
  setLoadingSubscriptionHistory(true);
  try {
    const res = await axios.get(`${DASHBOARD_URL}/api/vendors/${vendorId}/subscription/history`);
    setSubscriptionHistory(Array.isArray(res.data?.subscriptions) ? res.data.subscriptions : []);
  } catch (error) {
    console.error("Error fetching subscription history:", error);
    setSubscriptionHistory([]);
  } finally {
    setLoadingSubscriptionHistory(false);
  }
};

const fetchSettlementSummary = async () => {
  if (!vendorId) return;
  setLoadingSettlementSummary(true);
  try {
    const res = await axios.get(
      `${DASHBOARD_URL}/api/vendor/${vendorId}/settlements/summary?from=${settlementFromDate}&to=${settlementToDate}`
    );
    if (res.data?.success) {
      setSettlementRows(Array.isArray(res.data.rows) ? res.data.rows : []);
      setSettlementTotals(res.data.totals || null);
    } else {
      setSettlementRows([]);
      setSettlementTotals(null);
    }
  } catch (error) {
    console.error("Error fetching settlement summary:", error);
    setSettlementRows([]);
    setSettlementTotals(null);
  } finally {
    setLoadingSettlementSummary(false);
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
    const hasAnyBankField = Boolean(
      bankForm.accountHolderName?.trim() ||
      bankForm.bankName?.trim() ||
      bankForm.accountNumber?.trim() ||
      bankForm.ifscCode?.trim()
    );
    const hasUpi = Boolean(bankForm.upiId?.trim());

    if (!hasAnyBankField && !hasUpi) {
      alert("Please add at least bank account details or UPI ID.");
      return;
    }

    if (hasAnyBankField) {
      if (!bankForm.accountHolderName?.trim()) {
        alert("Account holder name is required.");
        return;
      }
      if (!bankForm.bankName?.trim()) {
        alert("Bank name is required.");
        return;
      }
      if (!bankForm.accountNumber?.trim()) {
        alert("Account number is required.");
        return;
      }
      if (!bankForm.ifscCode?.trim() || bankForm.ifscCode.trim().length !== 11) {
        alert("Valid IFSC code (11 characters) is required.");
        return;
      }
    }

    const dataToSend = {
      accountHolderName: hasAnyBankField ? bankForm.accountHolderName.trim() : null,
      bankName: hasAnyBankField ? bankForm.bankName.trim() : null,
      accountNumber: hasAnyBankField ? bankForm.accountNumber.trim() : null,
      ifscCode: hasAnyBankField ? bankForm.ifscCode.toUpperCase().trim() : null,
      upiId: hasUpi ? bankForm.upiId.trim() : null,
      changed_by_name: activeStaff?.name || "Owner",
      changed_by_staff_id: activeStaff?.id || "owner",
    };

    const response = await axios.post(`${DASHBOARD_URL}/api/vendor/${vendorId}/bank-details`, dataToSend);
    
    if (response.data.success) {
      alert('Bank details saved successfully!');
      setEditingBank(false);
      fetchBankDetails();
      fetchBankDetailsHistory();
    } else {
      alert(response.data.message || 'Failed to save bank details');
    }
  } catch (error) {
    console.error('Error saving bank details:', error);
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        'Failed to save bank details. Please try again.';
    alert(errorMessage);
  } finally {
    setSavingBank(false);
  }
};



// Add this to your existing useEffect or create a new one
useEffect(() => {
  if (page === "Bank Details") {
    fetchBankDetails();
    fetchBankDetailsHistory();
  } else if (page === "Payout History") {
    fetchPayouts(payoutPage);
  } else if (page === "Notification Preferences") {
    fetchNotificationPreferences();
    fetchPayAtCafeAutomation();
  } else if (page === "Payment Methods") {
    fetchPaymentMethods();
  } else if (page === "Subscription Details") {
    fetchSubscriptionHistory();
  } else if (page === "Settlement Report") {
    fetchSettlementSummary();
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
  if (time24 === "24:00") return "12:00 AM";
  const [hours, minutes] = time24.split(':');
  if (hours === undefined || minutes === undefined) return "";
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return "";
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const normalizeDayForApi = (dayValue: string) => {
  const raw = (dayValue || "").toLowerCase().trim();
  const map: Record<string, string> = {
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
    sunday: "sun",
  };
  if (map[raw]) return map[raw];
  return raw.slice(0, 3);
};

const OPERATING_HOURS_SAVE_WINDOW_DAYS = 14;

// API function to update operating hours
const updateOperatingHours = async (vendorId, dayData) => {
  try {
    const is24Hours = Boolean(dayData.isEnabled && dayData.open && dayData.close && dayData.open === dayData.close);
    const payload = {
      start_time: convertTo12HourFormat(dayData.open), // Convert 24h to 12h
      end_time: convertTo12HourFormat(dayData.close),   // Convert 24h to 12h
      slot_duration: dayData.slotDurationMinutes,
      day: normalizeDayForApi(dayData.day),
      is_enabled: Boolean(dayData.isEnabled),
      is_24_hours: is24Hours,
      // Keep synchronous save responsive on Render; booking API self-heals
      // missing far-future dates from vendor_day_slot_config when requested.
      window_days: OPERATING_HOURS_SAVE_WINDOW_DAYS
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

    if (dayData.isEnabled && (!dayData.open || !dayData.close || !dayData.slotDurationMinutes)) {
      throw new Error('Please fill in all required fields');
    }

    // Show initial feedback
    console.log('Starting slot update process...');
    
    const result = await updateOperatingHours(currentVendorId, dayData);
    
    if (result.success) {
      const asyncJobId = result?.data?.job_id;
      const isAsyncAccepted = result?.data?.status === "running" || result?.data?.status === "queued";
      if (isAsyncAccepted && asyncJobId) {
        alert(`${day.charAt(0).toUpperCase() + day.slice(1)} update queued (Job: ${asyncJobId.slice(0, 8)}...). Changes will apply shortly.`);
      } else {
        alert(`${day.charAt(0).toUpperCase() + day.slice(1)} hours updated successfully!`);
      }
      
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
      is24Hours: Boolean(entry.is24Hours),
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
      is24Hours: false,
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

  useEffect(() => {
    if (page === "GST Setup" && vendorId) {
      fetchGstProfile();
    }
  }, [page, vendorId]);

  const fetchGstProfile = async () => {
    if (!vendorId) return;
    setLoadingGst(true);
    setGstMessage(null);
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/tax-profile`);
      if (!res.ok) throw new Error("Failed to fetch GST profile");
      const data = await res.json();
      const profile = data?.profile || {};
      setGstProfile({
        gst_registered: Boolean(profile.gst_registered),
        gst_enabled: Boolean(profile.gst_enabled),
        gst_rate: Number(profile.gst_rate ?? 18),
        tax_inclusive: Boolean(profile.tax_inclusive),
        gstin: profile.gstin || "",
        legal_name: profile.legal_name || "",
        state_code: profile.state_code || "",
        place_of_supply_state_code: profile.place_of_supply_state_code || "",
      });
    } catch (error) {
      console.error("GST profile load error:", error);
      setGstMessage("Unable to load GST setup.");
    } finally {
      setLoadingGst(false);
    }
  };

  const saveGstProfile = async () => {
    if (!vendorId) return;
    setSavingGst(true);
    setGstMessage(null);
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/tax-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gst_registered: gstProfile.gst_registered,
          gst_enabled: gstProfile.gst_enabled,
          gst_rate: Number(gstProfile.gst_rate || 0),
          tax_inclusive: gstProfile.tax_inclusive,
          gstin: gstProfile.gstin || null,
          legal_name: gstProfile.legal_name || null,
          state_code: gstProfile.state_code || null,
          place_of_supply_state_code: gstProfile.place_of_supply_state_code || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save GST setup");
      setGstMessage("GST setup saved successfully.");
      setTimeout(() => setGstMessage(null), 2500);
    } catch (error) {
      console.error("GST profile save error:", error);
      setGstMessage(error instanceof Error ? error.message : "Unable to save GST setup.");
    } finally {
      setSavingGst(false);
    }
  };

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
    if (label === "Bank Details" || label === "Payout History") {
    await handleRestrictedPageClick(label);
  } else {
    setPage(label);
  }
  };

  const handleDocumentPreview = (documentUrl: string, documentName: string) => {
    setPreviewDocument(documentUrl);
    setPreviewDocumentName(documentName);
  };

  const handleReplaceDocument = async (documentId: number, file: File | null) => {
    if (!vendorId || !documentId || !file) return;
    setUploadingDocumentId(documentId);
    setDocumentActionMessage(null);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const response = await axios.put(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/documents/${documentId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Failed to update document");
      }
      setDocumentActionMessage("Document updated and sent for re-verification.");
      const dashboardRes = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/dashboard`);
      if (dashboardRes?.data) {
        setData(dashboardRes.data);
      }
      window.dispatchEvent(new CustomEvent("refresh-dashboard"));
    } catch (error: any) {
      console.error("Failed to replace document:", error);
      setDocumentActionMessage(error?.response?.data?.message || error?.message || "Failed to update document");
    } finally {
      setUploadingDocumentId(null);
    }
  };

  const handleUploadMissingDocument = async (documentType: string, file: File | null) => {
    if (!vendorId || !documentType || !file) return;
    setUploadingDocumentType(documentType);
    setDocumentActionMessage(null);
    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("document", file);
      const response = await axios.post(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Failed to upload document");
      }
      setDocumentActionMessage("Document uploaded and sent for verification.");
      const dashboardRes = await axios.get(`${DASHBOARD_URL}/api/vendor/${vendorId}/dashboard`);
      if (dashboardRes?.data) {
        setData(dashboardRes.data);
      }
      window.dispatchEvent(new CustomEvent("refresh-dashboard"));
    } catch (error: any) {
      console.error("Failed to upload missing document:", error);
      setDocumentActionMessage(error?.response?.data?.message || error?.message || "Failed to upload document");
    } finally {
      setUploadingDocumentType(null);
    }
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
      const profileImg = res.data.cafeProfile.profileImage || HFG_DEFAULT_LOGO;
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

  // Add this Toggle Switch component before your main component
const ToggleSwitch = ({ 
  enabled, 
  onToggle, 
  disabled = false, 
  loading = false,
  size = "default" 
}) => {
  const sizeClasses = {
    sm: "w-8 h-4",
    default: "w-11 h-6",
    lg: "w-14 h-7"
  };

  const thumbSizeClasses = {
    sm: "w-3 h-3",
    default: "w-5 h-5", 
    lg: "w-6 h-6"
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        sizeClasses[size],
        enabled 
          ? "bg-primary" 
          : "bg-gray-200 dark:bg-gray-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      role="switch"
      aria-checked={enabled}
    >
      <span className="sr-only">Toggle setting</span>
      <span
        className={cn(
          "pointer-events-none relative inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out",
          thumbSizeClasses[size],
          enabled 
            ? size === "sm" ? "translate-x-4" : size === "lg" ? "translate-x-7" : "translate-x-5"
            : "translate-x-0"
        )}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className={cn(
              "animate-spin text-gray-400",
              size === "sm" ? "w-2 h-2" : size === "lg" ? "w-4 h-4" : "w-3 h-3"
            )} />
          </div>
        )}
      </span>
    </button>
  );
};


  const { navigation, cafeProfile, businessDetails, operatingHours, billingDetails, verifiedDocuments } = data;
  const documentsByType = new Map(
    (Array.isArray(verifiedDocuments) ? verifiedDocuments : [])
      .map((doc: any) => [String(doc?.document_type || "").toLowerCase(), doc])
  );
  const normalizedVerifiedDocuments = REQUIRED_DOCUMENT_TYPES.map((docMeta) => {
    const found = documentsByType.get(docMeta.key);
    if (found) {
      return {
        ...found,
        name: found.name || docMeta.label,
        document_type: docMeta.key,
        hint: docMeta.hint,
      };
    }
    return {
      id: null,
      name: docMeta.label,
      document_type: docMeta.key,
      status: "missing",
      expiry: null,
      uploadedAt: null,
      documentUrl: null,
      publicId: null,
      hint: docMeta.hint,
    };
  });

  return (
    <div className="min-h-screen overflow-y-auto bg-background text-foreground">
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
                            src={HFG_DEFAULT_LOGO}
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
  <Card className="account-panel overflow-hidden">
    <CardHeader className="space-y-1.5 pb-3">
      <CardTitle className="text-base font-semibold uppercase tracking-[0.14em] text-cyan-100 md:text-lg">Cafe Profile</CardTitle>
      <CardDescription className="text-xs text-slate-300 md:text-sm">
        Your public profile information
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-5 px-4 pb-5 pt-1 md:px-5">
      {/* Profile Upload Message */}
      {profileUploadMessage && (
        <div className={cn(
          "rounded-lg border px-3 py-2 text-center text-xs font-medium md:text-sm",
          profileUploadMessage.includes("successfully") 
            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" 
            : "border-rose-400/40 bg-rose-500/15 text-rose-700 dark:text-rose-200"
        )}>
          {profileUploadMessage}
        </div>
      )}
      
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Editable Profile Image */}
        <div className="group relative transition-transform duration-300 ease-in-out hover:scale-105">
          <div className="h-24 w-24 rounded-full bg-emerald-500/20 p-[4px] md:h-28 md:w-28">
            <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              <img
                src={profileImage || HFG_DEFAULT_LOGO}
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
            className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-cyan-500 text-slate-950 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-cyan-400"
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
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-100 md:text-lg">{cafeProfile.name || "Cafe Name"}</h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200 md:text-xs">
              Gaming Cafe - Live
            </span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-xs">
              {cafeProfile.membershipStatus || "Standard Member"}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-slate-900/35 px-3 py-2 text-xs text-slate-200 md:text-sm">
          <Globe className="h-4 w-4 text-cyan-300" />
          <span className="truncate">{cafeProfile.website || "Not Available"}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-slate-900/35 px-3 py-2 text-xs text-slate-200 md:text-sm">
          <Mail className="h-4 w-4 text-cyan-300" />
          <span className="truncate">{cafeProfile.email || "No Email Provided"}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)}


            {/* Navigation Menu */}
            <Card className="account-panel overflow-hidden">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {[
                    { icon: ImageIcon, label: "Cafe Gallery" },
                    { icon: Building2, label: "Business Details" },
                    { icon: Clock, label: "Operating Hours" },  
                    { icon: DollarSign, label: "GST Setup" },
                    { icon: Settings, label: "Payment Methods" },
                    { icon: FileCheck, label: "Verified Documents" },
                    { icon: CreditCard, label: "Bank Details" },  
                    { icon: DollarSign, label: "Payout History" },
                    { icon: BellRing, label: "Notification Preferences" },
                    { icon: Wallet, label: "Subscription Details" },
                    { icon: Calendar, label: "Settlement Report" },
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
                          "h-10 w-full justify-start rounded-lg border border-transparent text-xs font-medium uppercase tracking-[0.08em] text-slate-300 transition-all duration-200 hover:border-cyan-500/35 hover:bg-cyan-500/10 hover:text-cyan-100 md:h-11 md:text-sm",
                          page === item.label
                            ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                            : ""
                        )}
                        onClick={handleViewInpage}
                        data-label={item.label}
                      >
                        <item.icon className="mr-2 h-4 w-4 text-cyan-300" />
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
    <Card className="account-panel overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">Cafe Gallery</CardTitle>
        <CardDescription className="text-xs text-slate-300 md:text-sm">
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
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
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
  <Card className="account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">Business Details</CardTitle>
      <CardDescription className="text-xs text-slate-300 md:text-sm">
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
  <Card className="account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
        <Clock className="h-5 w-5 text-cyan-300" />
        Operating Hours
      </CardTitle>
      <CardDescription className="text-xs text-slate-300 md:text-sm">
        Manage your cafe's working hours and slot durations
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <Label className="text-foreground">Operating Hours</Label>
        <p className="text-xs text-slate-300">Set `open` and `close` to same time (or use `24H`) for 24-hour operation.</p>
        
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleTimeChange(entry.day, 'open', '00:00');
                  handleTimeChange(entry.day, 'close', '00:00');
                }}
                disabled={editingSlot !== entry.day || !entry.isEnabled}
                className="text-xs"
              >
                24H
              </Button>
              
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

{page === "GST Setup" && (
  <Card className="account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">GST Setup</CardTitle>
      <CardDescription className="text-xs text-slate-300 md:text-sm">
        Configure taxation profile for your cafe billing and transaction transparency.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {gstMessage && (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
          {gstMessage}
        </div>
      )}

      {loadingGst ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={gstProfile.gst_registered}
                onChange={(e) => setGstProfile((p) => ({ ...p, gst_registered: e.target.checked }))}
              />
              GST Registered
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={gstProfile.gst_enabled}
                onChange={(e) => setGstProfile((p) => ({ ...p, gst_enabled: e.target.checked }))}
              />
              Enable GST in Billing
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              value={gstProfile.gstin}
              onChange={(e) => setGstProfile((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100"
              placeholder="GSTIN"
            />
            <Input
              value={gstProfile.legal_name}
              onChange={(e) => setGstProfile((p) => ({ ...p, legal_name: e.target.value }))}
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100"
              placeholder="Legal Name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              type="number"
              min={0}
              max={28}
              value={gstProfile.gst_rate}
              onChange={(e) => setGstProfile((p) => ({ ...p, gst_rate: Number(e.target.value || 0) }))}
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100"
              placeholder="GST %"
            />
            <Input
              value={gstProfile.state_code}
              onChange={(e) =>
                setGstProfile((p) => ({ ...p, state_code: e.target.value.replace(/\D/g, "").slice(0, 2) }))
              }
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100"
              placeholder="Cafe State Code"
            />
            <Input
              value={gstProfile.place_of_supply_state_code}
              onChange={(e) =>
                setGstProfile((p) => ({
                  ...p,
                  place_of_supply_state_code: e.target.value.replace(/\D/g, "").slice(0, 2),
                }))
              }
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100"
              placeholder="Place of Supply"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={gstProfile.tax_inclusive}
              onChange={(e) => setGstProfile((p) => ({ ...p, tax_inclusive: e.target.checked }))}
            />
            Tax Inclusive Pricing
          </label>

          <Button
            type="button"
            onClick={saveGstProfile}
            disabled={savingGst}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
          >
            {savingGst ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save GST Setup
          </Button>
        </>
      )}
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
                <Card className="account-panel overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">Verified Documents</CardTitle>
                    <CardDescription className="text-xs text-slate-300 md:text-sm">
                      Manage and preview your uploaded business documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.isArray((data as any)?.documentAlerts) && (data as any).documentAlerts.length > 0 && (
                        <div className="space-y-2">
                          {(data as any).documentAlerts.map((alert: any, idx: number) => {
                            const isVerified = String(alert?.type || "").toLowerCase() === "verified";
                            return (
                              <div
                                key={`doc-alert-${idx}`}
                                className={cn(
                                  "rounded-lg border p-3 text-sm",
                                  isVerified
                                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                                    : "border-rose-400/40 bg-rose-500/10 text-rose-100"
                                )}
                              >
                                {alert?.message || "Document status updated."}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {documentActionMessage && (
                        <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                          {documentActionMessage}
                        </div>
                      )}
                      {normalizedVerifiedDocuments && normalizedVerifiedDocuments.length > 0 ? (
                        normalizedVerifiedDocuments.map((doc: any) => (
                          <div
                            key={doc.id || doc.document_type || doc.name}
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
                                    : doc.status === "missing"
                                    ? "text-slate-500"
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
                                    ,
                                    doc.status === "missing" && "text-slate-500"
                                  )}>{doc.status === "missing" ? "Missing" : doc.status}</span></p>
                                  {doc.uploadedAt && (
                                    <p>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                  )}
                                  <p>{doc.hint}</p>
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
                                  doc.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                                  doc.status === "missing" && "bg-slate-500/20 text-slate-300"
                                )}
                              >
                                {doc.status === "missing" ? "missing" : doc.status}
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
                              {doc.id && (
                                <>
                                  <input
                                    id={`doc-replace-${doc.id}`}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => {
                                      const selected = e.target.files?.[0] || null;
                                      void handleReplaceDocument(Number(doc.id), selected);
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    disabled={uploadingDocumentId === Number(doc.id)}
                                    className="border-border text-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => {
                                      const inputEl = document.getElementById(`doc-replace-${doc.id}`) as HTMLInputElement | null;
                                      inputEl?.click();
                                    }}
                                  >
                                    {uploadingDocumentId === Number(doc.id) ? (
                                      <>
                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                        Updating
                                      </>
                                    ) : (
                                      <>Update</>
                                    )}
                                  </Button>
                                </>
                              )}
                              {!doc.id && doc.status === "missing" && (
                                <>
                                  <input
                                    id={`doc-upload-${doc.document_type}`}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => {
                                      const selected = e.target.files?.[0] || null;
                                      void handleUploadMissingDocument(String(doc.document_type || ""), selected);
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    disabled={uploadingDocumentType === String(doc.document_type || "")}
                                    className="border-border text-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => {
                                      const inputEl = document.getElementById(`doc-upload-${doc.document_type}`) as HTMLInputElement | null;
                                      inputEl?.click();
                                    }}
                                  >
                                    {uploadingDocumentType === String(doc.document_type || "") ? (
                                      <>
                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                        Uploading
                                      </>
                                    ) : (
                                      <>Upload</>
                                    )}
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
                            Upload each missing document using the Upload button.
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Only these 4 onboarding documents are supported. Missing items are shown above.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}



{/* BANK DETAILS PAGE */}
{page === "Bank Details" && (
  <>
    {/* FIRST CARD - BANK TRANSFER DETAILS */}
    <Card className="content-card account-panel mb-6 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="card-title flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
          <CreditCard className="icon-lg text-cyan-300" />
          Bank Details
        </CardTitle>
        <CardDescription className="body-text-muted text-xs text-slate-300 md:text-sm">
          Manage payout destination details (Bank + UPI).
        </CardDescription>
      </CardHeader>
      <CardContent className="content-card-padding">
        {loadingBank ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="icon-xl animate-spin text-primary" />
            <span className="body-text-muted ml-2">Loading payment details...</span>
          </div>
        ) : editingBank ? (
          // EDIT FORM
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Add bank account details and optional UPI in one place.
            </div>

            {true ? (
              // BANK ACCOUNT FIELDS
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Account Holder Name *</Label>
                  <Input
                    value={bankForm.accountHolderName || ''}
                    onChange={(e) => handleBankFormChange('accountHolderName', e.target.value)}
                    placeholder="Enter account holder name"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <Label className="form-label">Bank Name *</Label>
                  <Input
                    value={bankForm.bankName || ''}
                    onChange={(e) => handleBankFormChange('bankName', e.target.value)}
                    placeholder="Enter bank name"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <Label className="form-label">Account Number *</Label>
                  <Input
                    value={bankForm.accountNumber || ''}
                    onChange={(e) => handleBankFormChange('accountNumber', e.target.value)}
                    placeholder="Enter account number"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <Label className="form-label">IFSC Code *</Label>
                  <Input
                    value={bankForm.ifscCode || ''}
                    onChange={(e) => handleBankFormChange('ifscCode', e.target.value.toUpperCase())}
                    placeholder="Enter IFSC code"
                    maxLength={11}
                    className="input-field"
                    required
                  />
                  <p className="body-text-small mt-1">
                    11-character IFSC code (e.g., SBIN0000123)
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="form-label">UPI ID (Optional)</Label>
                  <Input
                    value={bankForm.upiId || ''}
                    onChange={(e) => handleBankFormChange('upiId', e.target.value)}
                    placeholder="Enter UPI ID (optional)"
                    className="input-field"
                  />
                  <p className="body-text-small mt-1">
                    You can also add UPI ID as backup payment method
                  </p>
                </div>
              </div>
            ) : null}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                type="button"
                onClick={handleSaveBankDetails} 
                disabled={savingBank}
                className="btn-primary"
              >
                {savingBank ? (
                  <>
                    <Loader2 className="icon-md animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="icon-md mr-2" />
                    Save Details
                  </>
                )}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setEditingBank(false)}
                disabled={savingBank}
                className="btn-secondary"
              >
                <X className="icon-md mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : bankDetails ? (
          // DISPLAY MODE
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="outline" className="badge-text">
                {bankDetails.upiId && !bankDetails.accountNumber 
                  ? 'UPI Payment' 
                  : bankDetails.accountNumber && !bankDetails.upiId
                  ? 'Bank Account'
                  : bankDetails.accountNumber && bankDetails.upiId
                  ? 'Bank Account + UPI'
                  : 'Payment Details'
                }
              </Badge>
              <Badge className={`badge-text ${
                bankDetails.verificationStatus === 'VERIFIED' 
                  ? 'bg-green-500/20 text-green-400' 
                  : bankDetails.verificationStatus === 'REJECTED'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {bankDetails.verificationStatus || 'PENDING'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Show bank details only if account number exists */}
              {bankDetails.accountNumber && (
                <>
                  <div>
                    <Label className="form-label-small">Account Holder Name</Label>
                    <p className="body-text font-medium break-words">{bankDetails.accountHolderName}</p>
                  </div>
                  <div>
                    <Label className="form-label-small">Bank Name</Label>
                    <p className="body-text font-medium break-words">{bankDetails.bankName}</p>
                  </div>
                  <div>
                    <Label className="form-label-small">Account Number</Label>
                    <p className="body-text font-medium break-words">{bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <Label className="form-label-small">IFSC Code</Label>
                    <p className="body-text font-medium break-words">{bankDetails.ifscCode}</p>
                  </div>
                </>
              )}
              
              {/* Always show UPI if available */}
              {bankDetails.upiId && (
                <div className={bankDetails.accountNumber ? "" : "sm:col-span-2"}>
                  <Label className="form-label-small">UPI ID</Label>
                  <p className="body-text font-medium break-words">{bankDetails.upiId}</p>
                </div>
              )}
              
              {/* Show message if no data available */}
              {!bankDetails.accountNumber && !bankDetails.upiId && (
                <div className="sm:col-span-2 text-center py-4">
                  <p className="body-text-muted">No payment details available</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                type="button"
                onClick={() => setEditingBank(true)}
                className="btn-primary"
              >
                <Edit className="icon-md mr-2" />
                Edit Bank Details
              </Button>
              {bankDetails.verificationStatus === 'PENDING' && (
                <Button 
                  type="button"
                  variant="outline"
                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
                  disabled
                >
                  <Clock className="icon-md mr-2" />
                  Verification Pending
                </Button>
              )}
            </div>
          </div>
        ) : (
          // NO BANK DETAILS
          <div className="text-center py-8">
            <CreditCard className="mx-auto icon-xl text-muted-foreground mb-4" />
            <h3 className="section-title mb-2">No Bank Details Found</h3>
            <p className="body-text-muted mb-4">Add bank/UPI details to receive payouts</p>
            <Button 
              type="button"
              onClick={() => setEditingBank(true)}
              className="btn-primary"
            >
              <CreditCard className="icon-md mr-2" />
              Add Bank Details
            </Button>
          </div>
        )}

      </CardContent>
    </Card>

    <Card className="content-card account-panel mb-6 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="card-title flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
          <Calendar className="icon-lg text-cyan-300" />
          Bank Details History
        </CardTitle>
        <CardDescription className="body-text-muted text-xs text-slate-300 md:text-sm">
          Track who changed bank/UPI details and verification status updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="content-card-padding">
        {loadingBankHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="icon-xl animate-spin text-primary" />
            <span className="body-text-muted ml-2">Loading history...</span>
          </div>
        ) : bankDetailsHistory.length ? (
          <div className="dashboard-table-shell">
            <div className="dashboard-table-wrap">
              <table className="dashboard-table min-w-[1040px] max-md:min-w-[760px] border-collapse">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Changed At</th>
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Changed By</th>
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Mode</th>
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Bank / UPI</th>
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Verification</th>
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Verified By</th>
                    <th className="table-cell table-header-text text-left whitespace-nowrap">Verified At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bankDetailsHistory.map((row: any) => (
                    <tr key={row.id} className="table-row">
                      <td className="table-cell table-cell-text whitespace-nowrap">
                        {row.changed_at ? new Date(row.changed_at).toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="table-cell table-cell-text whitespace-nowrap">
                        {row.changed_by_name || row.changed_by_staff_id || "System"}
                      </td>
                      <td className="table-cell table-cell-text whitespace-nowrap uppercase">
                        {row.payment_mode || "-"}
                      </td>
                      <td className="table-cell table-cell-text">
                        <div>{row.account_number_masked || "-"}</div>
                        <div className="text-xs text-muted-foreground">{row.upi_id_masked || "-"}</div>
                      </td>
                      <td className="table-cell table-cell-text whitespace-nowrap">
                        {row.verification_status || (row.is_verified ? "VERIFIED" : "PENDING")}
                      </td>
                      <td className="table-cell table-cell-text whitespace-nowrap">
                        {row.verified_by_name || "-"}
                      </td>
                      <td className="table-cell table-cell-text whitespace-nowrap">
                        {row.verified_at ? new Date(row.verified_at).toLocaleString("en-IN") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No bank detail history found yet.</p>
        )}
      </CardContent>
    </Card>
  </>
)}

{page === "Payment Methods" && (<Card className="content-card shadow-lg">
      <CardHeader>
        <CardTitle className="card-title flex items-center gap-2">
          <Settings className="icon-lg" />
          Payment Methods
        </CardTitle>
        <CardDescription className="body-text-muted">
          Select which payment methods you want to accept at your cafe
        </CardDescription>
      </CardHeader>
      <CardContent className="content-card-padding">
        {/* Success/Error Messages */}
        {paymentMethodSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 mb-4"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="body-text-small font-medium flex-1 break-words">{paymentMethodSuccess}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPaymentMethodMessages}
              className="ml-auto h-6 w-6 p-0 text-green-400 hover:text-green-300 flex-shrink-0"
            >
              <X className="icon-xs" />
            </Button>
          </motion.div>
        )}

        {paymentMethodError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 mb-4"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="body-text-small font-medium flex-1 break-words">{paymentMethodError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPaymentMethodMessages}
              className="ml-auto h-6 w-6 p-0 text-red-400 hover:text-red-300 flex-shrink-0"
            >
              <X className="icon-xs" />
            </Button>
          </motion.div>
        )}

        {/* Loading State */}
        {loadingPaymentMethods ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="icon-xl animate-spin text-primary" />
              <span className="body-text-small">Loading payment methods...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Available Payment Methods */}
            {Array.isArray(paymentMethods) && paymentMethods.length > 0 ? (
              <>
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg border border-border gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="body-text font-medium">
                      Available Payment Methods ({paymentMethods.length})
                    </span>
                  </div>
                  <Badge variant="outline" className="badge-text w-fit">
                    {paymentMethods.filter(m => m.is_enabled).length} Active
                  </Badge>
                </div>
                
                {/* Payment Method List */}
                <div className="space-y-3">
                  {paymentMethods.map((method, index) => {
                    const normalizedName = normalizePaymentMethodName(method.method_name);
                    const isAutoManaged = method.is_auto_managed || normalizedName === "cafe_specific_pass";
                    return (
                    <motion.div
                      key={method.pay_method_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group"
                    >
                      <div className={cn(
                        "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] items-center p-4 rounded-xl border transition-all duration-200 hover:shadow-md gap-3 sm:gap-4",
                        method.is_enabled 
                          ? "border-primary/50 bg-primary/5" 
                          : "border-border bg-muted/20 hover:border-primary/30"
                      )}>
                        {/* Method Info */}
                        <div className="flex items-start sm:items-center space-x-4 min-w-0 w-full">
                          <div className="flex-shrink-0">
                            {normalizedName === 'pay_at_cafe' ? (
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center border transition-colors",
                                method.is_enabled 
                                  ? "bg-blue-500/30 border-blue-500/50" 
                                  : "bg-blue-500/10 border-blue-500/20"
                              )}>
                                <Coffee className={cn(
                                  "icon-lg transition-colors",
                                  method.is_enabled ? "text-blue-600" : "text-blue-400"
                                )} />
                              </div>
                            ) : normalizedName === "cafe_specific_pass" ? (
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center border transition-colors",
                                method.is_enabled 
                                  ? "bg-emerald-500/30 border-emerald-500/50" 
                                  : "bg-emerald-500/10 border-emerald-500/20"
                              )}>
                                <Wallet className={cn(
                                  "icon-lg transition-colors",
                                  method.is_enabled ? "text-emerald-500" : "text-emerald-300"
                                )} />
                              </div>
                            ) : (
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center border transition-colors",
                                method.is_enabled 
                                  ? "bg-purple-500/30 border-purple-500/50" 
                                  : "bg-purple-500/10 border-purple-500/20"
                              )}>
                                <CreditCard className={cn(
                                  "icon-lg transition-colors",
                                  method.is_enabled ? "text-purple-600" : "text-purple-400"
                                )} />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="body-text font-semibold break-words">
                                {method.display_name}
                              </h4>
                              {method.is_enabled && (
                                <Badge 
                                  variant="default"
                                  className="bg-green-500/20 text-green-500 border-green-500/30 badge-text"
                                >
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="body-text-small break-words">
                              {method.description}
                            </p>
                            
                            {/* Show registration info */}
                            <div className="mt-2 flex items-center gap-1 body-text-small flex-wrap">
                              <div className={cn(
                                "w-1 h-1 rounded-full flex-shrink-0",
                                method.is_enabled ? "bg-green-500" : "bg-gray-400"
                              )}></div>
                              <span className={cn(
                                method.is_enabled ? "text-green-600" : "text-gray-500"
                              )}>
                                {isAutoManaged
                                  ? (method.is_enabled ? "Auto-enabled (active cafe pass found)" : "Auto-disabled (no active cafe pass)")
                                  : (method.is_enabled ? "Registered for your cafe" : "Not registered")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 w-full sm:w-[180px] sm:ml-auto">
                          {/* Status Text */}
                          <div className="text-left sm:text-right min-w-[88px] flex-1 sm:flex-initial">
                            {isAutoManaged ? (
                              <span className="body-text-small text-gray-400 font-semibold tracking-[0.06em]">AUTO</span>
                            ) : togglingMethod === method.pay_method_id ? (
                              <span className="body-text-small text-primary font-medium">
                                {method.is_enabled ? 'Removing...' : 'Adding...'}
                              </span>
                            ) : (
                              <span className={cn(
                                "body-text-small font-semibold",
                                method.is_enabled ? "text-green-500" : "text-gray-400"
                              )}>
                                {method.is_enabled ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            )}
                          </div>
                          
                          {/* Toggle Switch */}
                          <div className="flex-shrink-0">
                            <ToggleSwitch
                              enabled={method.is_enabled}
                              onToggle={() => handleTogglePaymentMethod(method.pay_method_id, method.is_enabled)}
                              disabled={isAutoManaged || (togglingMethod !== null && togglingMethod !== method.pay_method_id)}
                              loading={togglingMethod === method.pay_method_id}
                              size="default"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
                
                {/* Summary Footer */}
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="body-text font-medium">Registration Status</span>
                        <Badge 
                          variant={paymentMethods.filter(m => m.is_enabled).length > 0 ? "default" : "secondary"}
                          className={cn(
                            "badge-text",
                            paymentMethods.filter(m => m.is_enabled).length > 0 
                              ? "bg-green-500/20 text-green-500 border-green-500/30" 
                              : "bg-amber-500/20 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {paymentMethods.filter(m => m.is_enabled).length > 0 ? 'Ready' : 'Setup Required'}
                        </Badge>
                      </div>
                      <div className="body-text-small break-words">
                        {paymentMethods.filter(m => m.is_enabled).length === 0 ? (
                          <span className="text-amber-600">⚠️ Register at least one payment method to accept payments.</span>
                        ) : (
                          <>
                            <span className="text-green-600">✅ Registered methods: </span>
                            <span className="font-medium">
                              {paymentMethods.filter(m => m.is_enabled).map(m => m.display_name).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="icon-xl text-muted-foreground" />
                </div>
                <h3 className="section-title mb-2">No Payment Methods Available</h3>
                <p className="body-text-muted mb-6 max-w-sm mx-auto">
                  No payment methods are available in the system. Please contact support.
                </p>
                <Button 
                  type="button"
                  onClick={fetchPaymentMethods}
                  disabled={loadingPaymentMethods}
                  className="btn-primary"
                >
                  {loadingPaymentMethods ? (
                    <>
                      <Loader2 className="icon-md mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <Settings className="icon-md mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>)}


{/* ==================== PAYOUT HISTORY PAGE ==================== */}
{page === "Payout History" && (
  <Card className="content-card account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="card-title flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
        <DollarSign className="icon-lg text-cyan-300" />
        Payout History
      </CardTitle>
      <CardDescription className="body-text-muted text-xs text-slate-300 md:text-sm">
        View your payout transaction history
      </CardDescription>
    </CardHeader>
    <CardContent className="content-card-padding">
      {loadingPayouts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="icon-xl animate-spin text-primary" />
          <span className="body-text-muted ml-2">Loading payout history...</span>
        </div>
      ) : Array.isArray(payouts) && payouts.length > 0 ? (
        <div className="space-y-4">
          <div className="dashboard-table-shell">
            <div className="dashboard-table-wrap">
            <table className="dashboard-table min-w-[800px] max-md:min-w-[700px] border-collapse">
              <thead>
                <tr className="table-header">
                  <th className="table-cell table-header-text text-left whitespace-nowrap">Date</th>
                  <th className="table-cell table-header-text text-left whitespace-nowrap">Amount</th>
                  <th className="table-cell table-header-text text-left whitespace-nowrap">Mode</th>
                  <th className="table-cell table-header-text text-left whitespace-nowrap">UTR Number</th>
                  <th className="table-cell table-header-text text-left whitespace-nowrap">Status</th>
                  <th className="table-cell table-header-text text-left whitespace-nowrap">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((payout, index) => (
                  <tr
                    key={payout?.id || index}
                    className="table-row"
                  >
                    <td className="table-cell table-cell-text whitespace-nowrap">
                      {payout?.payoutDate
                        ? new Date(payout.payoutDate).toLocaleDateString("en-IN")
                        : "-"}
                    </td>
                    <td className="table-cell table-cell-text font-medium whitespace-nowrap">
                      <FontAwesomeIcon icon={faIndianRupeeSign} className="w-3 h-3 mr-1" />
                      {payout?.amount ? parseFloat(payout.amount).toFixed(2) : "0.00"}
                    </td>
                    <td className="table-cell table-cell-text whitespace-nowrap">
                      <Badge variant="outline" className="badge-text">
                        {payout?.transferMode || "NA"}
                      </Badge>
                    </td>
                    <td className="table-cell table-cell-text whitespace-nowrap">
                      {payout?.utrNumber || "-"}
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      <Badge
                        className={cn(
                          "badge-text",
                          payout?.status === "SUCCESS"
                            ? "bg-green-500/20 text-green-400"
                            : payout?.status === "FAILED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        )}
                      >
                        {payout?.status || "PENDING"}
                      </Badge>
                    </td>
                    <td className="table-cell table-cell-text max-w-[200px] truncate">
                      {payout?.remarks || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile scroll indicator */}
          <div className="block sm:hidden text-center body-text-small text-muted-foreground border-t border-border pt-3">
            ← Scroll horizontally to view all columns →
          </div>

          {/* Pagination */}
          {payoutTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayoutPage(Math.max(1, payoutPage - 1))}
                disabled={payoutPage === 1}
                className="btn-secondary"
              >
                Previous
              </Button>
              <span className="body-text-small text-muted-foreground px-3">
                Page {payoutPage} of {payoutTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayoutPage(Math.min(payoutTotalPages, payoutPage + 1))}
                disabled={payoutPage >= payoutTotalPages}
                className="btn-secondary"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="section-title mb-2">No Payout History</h3>
          <p className="body-text-muted">Your payout transactions will appear here</p>
        </div>
      )}
    </CardContent>
  </Card>
)}

{page === "Notification Preferences" && (
  <Card className="content-card account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="card-title flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
        <BellRing className="icon-lg text-cyan-300" />
        Booking Notifications
      </CardTitle>
      <CardDescription className="body-text-muted text-xs text-slate-300 md:text-sm">
        Control app booking alerts shown in your dashboard.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {loadingNotificationPrefs ? (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notification settings...
        </div>
      ) : (
        <>
          {[
            { key: "app_booking_notifications_enabled", label: "Receive all app booking notifications" },
            { key: "pay_at_cafe_enabled", label: "Pay at Cafe notifications" },
            { key: "hash_wallet_enabled", label: "Hash Wallet notifications" },
            { key: "payment_gateway_enabled", label: "Payment Gateway notifications" },
            { key: "pass_enabled", label: "Pass booking notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <p className="text-sm text-foreground">{item.label}</p>
              <ToggleSwitch
                enabled={Boolean((notificationPrefs as any)[item.key])}
                loading={savingNotificationPrefs}
                onToggle={() => {
                  const enabled = !Boolean((notificationPrefs as any)[item.key]);
                  const next = { ...notificationPrefs, [item.key]: enabled } as any;
                  if (item.key === "app_booking_notifications_enabled" && !enabled) {
                    next.pay_at_cafe_enabled = false;
                    next.hash_wallet_enabled = false;
                    next.payment_gateway_enabled = false;
                    next.pass_enabled = false;
                  }
                  setNotificationPrefs(next);
                  saveNotificationPreferences(next);
                }}
              />
            </div>
          ))}
          <div className="my-3 border-t border-border" />
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Pay at Cafe Automation</p>
              <p className="text-xs text-muted-foreground">
                Choose automatic handling for pending pay-at-cafe requests.
              </p>
            </div>
            {loadingPayAtCafeAutomation ? (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading auto settings...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <p className="text-sm text-foreground">Auto Accept</p>
                  <ToggleSwitch
                    enabled={Boolean(payAtCafeAutomation.auto_accept_enabled)}
                    loading={savingPayAtCafeAutomation}
                    onToggle={() => {
                      const next = {
                        ...payAtCafeAutomation,
                        auto_accept_enabled: !payAtCafeAutomation.auto_accept_enabled,
                        auto_reject_enabled: payAtCafeAutomation.auto_accept_enabled ? payAtCafeAutomation.auto_reject_enabled : false,
                      };
                      setPayAtCafeAutomation(next);
                      savePayAtCafeAutomation(next);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">Auto Reject</p>
                    <p className="text-xs text-muted-foreground">
                      Reject pending requests after timeout.
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={Boolean(payAtCafeAutomation.auto_reject_enabled)}
                    loading={savingPayAtCafeAutomation}
                    onToggle={() => {
                      const next = {
                        ...payAtCafeAutomation,
                        auto_reject_enabled: !payAtCafeAutomation.auto_reject_enabled,
                        auto_accept_enabled: payAtCafeAutomation.auto_reject_enabled ? payAtCafeAutomation.auto_accept_enabled : false,
                      };
                      setPayAtCafeAutomation(next);
                      savePayAtCafeAutomation(next);
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <Label className="text-sm text-foreground">Auto Reject Timeout (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={240}
                    value={payAtCafeAutomation.auto_reject_after_minutes}
                    onChange={(e) => {
                      const timeout = Math.max(1, Math.min(240, Number(e.target.value || 15)));
                      const next = { ...payAtCafeAutomation, auto_reject_after_minutes: timeout };
                      setPayAtCafeAutomation(next);
                    }}
                    onBlur={() => savePayAtCafeAutomation(payAtCafeAutomation)}
                    className="h-8 w-24"
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </CardContent>
  </Card>
)}

{page === "Subscription Details" && (
  <Card className="content-card account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="card-title flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
        <Wallet className="icon-lg text-cyan-300" />
        Subscription Details
      </CardTitle>
      <CardDescription className="body-text-muted text-xs text-slate-300 md:text-sm">
        View all purchased plans with invoice records.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {loadingSubscriptionHistory ? (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading subscriptions...
        </div>
      ) : subscriptionHistory.length ? (
        <div className="dashboard-table-shell">
          <div className="dashboard-table-wrap">
            <table className="dashboard-table min-w-[880px] max-md:min-w-[720px]">
              <thead>
                <tr className="table-header">
                  <th className="table-cell table-header-text text-left">Plan</th>
                  <th className="table-cell table-header-text text-left">Status</th>
                  <th className="table-cell table-header-text text-left">Period</th>
                  <th className="table-cell table-header-text text-left">Amount</th>
                  <th className="table-cell table-header-text text-left">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptionHistory.map((item: any) => (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell table-cell-text">
                      <div className="font-medium">{item.package?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{item.package?.code || "-"}</div>
                    </td>
                    <td className="table-cell table-cell-text">{item.status || "-"}</td>
                    <td className="table-cell table-cell-text">
                      {item.period_start ? new Date(item.period_start).toLocaleDateString("en-IN") : "-"}
                      {" to "}
                      {item.period_end ? new Date(item.period_end).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="table-cell table-cell-text">₹{Number(item.amount_paid || 0).toFixed(2)}</td>
                    <td className="table-cell table-cell-text">
                      {item.invoice_url ? (
                        <a
                          href={`${DASHBOARD_URL}${item.invoice_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {item.invoice_number || "Invoice"}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No subscription purchases found yet.</p>
      )}
    </CardContent>
  </Card>
)}

{page === "Settlement Report" && (
  <Card className="content-card account-panel overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="card-title flex items-center gap-2 text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">
        <Calendar className="icon-lg text-cyan-300" />
        Date-wise Settlement
      </CardTitle>
      <CardDescription className="body-text-muted text-xs text-slate-300 md:text-sm">
        Paid by Hash vs pending settlement by day.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="dashboard-toolbar">
        <Input type="date" value={settlementFromDate} onChange={(e) => setSettlementFromDate(e.target.value)} className="dashboard-module-input h-10 w-[160px]" />
        <Input type="date" value={settlementToDate} onChange={(e) => setSettlementToDate(e.target.value)} className="dashboard-module-input h-10 w-[160px]" />
        <Button type="button" onClick={fetchSettlementSummary}>Apply</Button>
      </div>
      {settlementTotals && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3 text-sm">Net: ₹{Number(settlementTotals.net_amount || 0).toFixed(2)}</div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Paid by Hash: ₹{Number(settlementTotals.paid_by_hash_amount || 0).toFixed(2)}
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            Pending: ₹{Number(settlementTotals.pending_amount || 0).toFixed(2)}
          </div>
        </div>
      )}
      {loadingSettlementSummary ? (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settlement report...
        </div>
      ) : (
        <div className="dashboard-table-shell">
          <div className="dashboard-table-wrap">
            <table className="dashboard-table min-w-[900px] max-md:min-w-[720px]">
              <thead>
                <tr className="table-header">
                  <th className="table-cell table-header-text text-left">Date</th>
                  <th className="table-cell table-header-text text-left">Bookings</th>
                  <th className="table-cell table-header-text text-left">Gross</th>
                  <th className="table-cell table-header-text text-left">App Fee</th>
                  <th className="table-cell table-header-text text-left">Net</th>
                  <th className="table-cell table-header-text text-left">Paid By Hash</th>
                  <th className="table-cell table-header-text text-left">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlementRows.length ? (
                  settlementRows.map((row: any) => (
                    <tr key={row.date} className="table-row">
                      <td className="table-cell table-cell-text">{new Date(row.date).toLocaleDateString("en-IN")}</td>
                      <td className="table-cell table-cell-text">{row.bookings_count}</td>
                      <td className="table-cell table-cell-text">₹{Number(row.gross_amount || 0).toFixed(2)}</td>
                      <td className="table-cell table-cell-text">₹{Number(row.app_fee_amount || 0).toFixed(2)}</td>
                      <td className="table-cell table-cell-text">₹{Number(row.net_amount || 0).toFixed(2)}</td>
                      <td className="table-cell table-cell-text text-emerald-300">₹{Number(row.paid_by_hash_amount || 0).toFixed(2)}</td>
                      <td className="table-cell table-cell-text text-amber-300">₹{Number(row.pending_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="table-cell table-cell-text text-center" colSpan={7}>
                      No settlements found for selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

 {otpLoading && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="w-20 h-20 border-4 border-t-transparent animate-spin rounded-full border-t-2 border-b-2 border-emerald-500"></div>
  </div>
)}



      
{!isOwnerSession && (
  <OTPVerificationModal
    isOpen={otpModalOpen}
    onClose={() => {
      setOtpModalOpen(false);
      setPendingPage(null);
    }}
    onVerifySuccess={handleOTPVerifySuccess}
    vendorId={vendorId}
    pageType={getRestrictedPageType(pendingPage || "Payout History")}
    pageName={pendingPage}
  />
)}

   

    </div>

  
  );
}
