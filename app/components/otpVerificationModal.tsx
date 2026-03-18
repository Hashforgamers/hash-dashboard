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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="dashboard-module-panel mx-auto w-full max-w-md rounded-2xl p-5 shadow-[0_30px_70px_-36px_rgba(2,6,23,0.4)] md:p-6"
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/15">
                <Shield className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-100 md:text-lg">Security Verification</h3>
                <p className="text-xs text-slate-300">Payout access protection</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 rounded-md border border-cyan-500/30 p-0 text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/15">
                <Mail className="h-6 w-6 text-cyan-300" />
              </div>
              <p className="text-xs text-slate-300 md:text-sm">
                To access <strong>{pageName}</strong>, please verify your identity using the OTP sent to your registered email address.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-400/45 bg-rose-500/15 p-3 text-xs text-rose-200 md:text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.11em] text-cyan-100 md:text-sm">Enter 6-Digit OTP</Label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="mt-2 h-11 rounded-lg border-cyan-500/30 bg-slate-900/60 text-center text-base tracking-[0.3em] text-cyan-50 placeholder:text-slate-500 focus-visible:ring-cyan-400 md:h-12 md:text-lg"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || !otp.trim() || otp.length !== 6}
                className="dashboard-btn-primary h-11 w-full rounded-lg text-sm font-semibold uppercase tracking-[0.09em] md:h-12"
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
                className="h-9 w-full rounded-lg border border-cyan-500/25 text-xs text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-100"
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

            <div className="space-y-1 rounded-lg border border-cyan-500/20 bg-slate-900/35 px-3 py-2 text-center text-[11px] text-slate-300 md:text-xs">
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
