import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Shield, X } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { VENDOR_ONBOARD_URL } from '@/src/config/env';

export function OTPVerificationModal({ 
  isOpen, 
  onClose, 
  onVerifySuccess, 
  vendorId, 
  pageType, 
  pageName 
}) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleSendOTP = async () => {
    setSendingOtp(true);
    setError('');
    
    try {
      const response = await axios.post(`${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/send-otp`, {
        page_type: pageType
      });
      
      if (response.data.success) {
        alert('OTP sent to your registered email address');
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${VENDOR_ONBOARD_URL}/api/vendor/${vendorId}/verify-otp`, {
        page_type: pageType,
        otp: otp.trim()
      });

      if (response.data.success) {
        onVerifySuccess();
        onClose();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtp('');
    setError('');
    handleSendOTP();
  };

  // Auto-send OTP when modal opens
  React.useEffect(() => {
    if (isOpen && !sendingOtp) {
      handleSendOTP();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-card rounded-lg p-6 max-w-md w-full mx-auto shadow-2xl border border-border"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Security Verification</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Mail className="w-12 h-12 text-blue-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                To access <strong>{pageName}</strong>, please verify your identity using the OTP sent to your registered email address.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-foreground">Enter 6-Digit OTP</Label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-input border-input text-foreground text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || !otp.trim() || otp.length !== 6}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>

              <Button
                onClick={handleResendOTP}
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                disabled={sendingOtp}
              >
                {sendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Didn't receive OTP? Resend"
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• OTP is valid for 5 minutes</p>
              <p>• Check your spam folder if you don't see the email</p>
              <p>• Never share your OTP with anyone</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
