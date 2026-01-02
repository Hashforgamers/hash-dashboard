// frontend/src/pages/PassRedemption.tsx
import React, { useState } from 'react';
import { Search, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

interface PassDetails {
  id: number;
  pass_uid: string;
  user_id: number;
  pass_name: string;
  total_hours: number;
  remaining_hours: number;
  valid_from: string;
  valid_to: string | null;
  is_global: boolean;
  vendor_id: number | null;
  hour_calculation_mode: string;
  hours_per_slot: number | null;
}

interface RedemptionResult {
  success: boolean;
  remaining_hours: number;
  is_depleted: boolean;
  redemption: any;
}

const PassRedemption: React.FC<{ vendorId: number }> = ({ vendorId }) => {
  const [passUid, setPassUid] = useState('');
  const [passDetails, setPassDetails] = useState<PassDetails | null>(null);
  const [hoursToDeduct, setHoursToDeduct] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePass = async () => {
    setLoading(true);
    setError('');
    setPassDetails(null);

    try {
      const response = await axios.post('/api/pass/validate', {
        pass_uid: passUid.trim().toUpperCase(),
        vendor_id: vendorId
      });

      if (response.data.valid) {
        setPassDetails(response.data.pass);
        setError('');
      } else {
        setError(response.data.error || 'Invalid pass');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to validate pass');
    } finally {
      setLoading(false);
    }
  };

  const redeemPass = async () => {
    if (!passDetails) return;
    
    const hours = parseFloat(hoursToDeduct);
    if (isNaN(hours) || hours <= 0) {
      setError('Please enter valid hours');
      return;
    }

    if (hours > passDetails.remaining_hours) {
      setError(`Insufficient hours. Available: ${passDetails.remaining_hours}`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/pass/redeem/dashboard', {
        pass_uid: passUid.trim().toUpperCase(),
        vendor_id: vendorId,
        hours_to_deduct: hours,
        session_start: sessionStart || null,
        session_end: sessionEnd || null,
        staff_id: null, // TODO: Get from auth context
        notes: notes.trim() || null
      });

      const result: RedemptionResult = response.data;
      
      setSuccess(
        `✅ Redeemed ${hours} hours successfully! ` +
        `Remaining: ${result.remaining_hours.toFixed(2)} hours`
      );

      // Update pass details
      setPassDetails({
        ...passDetails,
        remaining_hours: result.remaining_hours
      });

      // Clear form
      setHoursToDeduct('');
      setSessionStart('');
      setSessionEnd('');
      setNotes('');

      // If depleted, clear pass details after 3 seconds
      if (result.is_depleted) {
        setTimeout(() => {
          setPassDetails(null);
          setPassUid('');
          setSuccess('');
        }, 3000);
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPassUid('');
    setPassDetails(null);
    setHoursToDeduct('');
    setSessionStart('');
    setSessionEnd('');
    setNotes('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Hour-Based Pass Redemption
        </h2>

        {/* Pass UID Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Enter Pass UID or Scan QR Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={passUid}
                onChange={(e) => setPassUid(e.target.value.toUpperCase())}
                placeholder="HFG-XXXXXXXXXXXX"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading || passDetails !== null}
                onKeyPress={(e) => e.key === 'Enter' && validatePass()}
              />
              {!passDetails ? (
                <button
                  onClick={validatePass}
                  disabled={loading || !passUid.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Validate
                </button>
              ) : (
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-green-800">{success}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pass Details Card */}
      {passDetails && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {passDetails.pass_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {passDetails.is_global ? '🌍 Global Pass' : '📍 Vendor-Specific Pass'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {passDetails.remaining_hours.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">hours remaining</div>
            </div>
          </div>

          {/* Pass Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Hours</div>
              <div className="text-lg font-semibold">{passDetails.total_hours.toFixed(2)} hrs</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600">User ID</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                #{passDetails.user_id}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600">Valid From</div>
              <div className="text-lg font-semibold">
                {new Date(passDetails.valid_from).toLocaleDateString()}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600">Valid Until</div>
              <div className="text-lg font-semibold">
                {passDetails.valid_to 
                  ? new Date(passDetails.valid_to).toLocaleDateString()
                  : 'No expiry'}
              </div>
            </div>
          </div>

          {/* Redemption Form */}
          <div className="bg-white rounded-lg p-6 space-y-4">
            <h4 className="font-semibold text-lg mb-4">Redeem Hours</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hours to Deduct *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={passDetails.remaining_hours}
                  value={hoursToDeduct}
                  onChange={(e) => setHoursToDeduct(e.target.value)}
                  placeholder="e.g., 2.0"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Start Time
                </label>
                <input
                  type="time"
                  value={sessionStart}
                  onChange={(e) => setSessionStart(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Session End Time
                </label>
                <input
                  type="time"
                  value={sessionEnd}
                  onChange={(e) => setSessionEnd(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={redeemPass}
              disabled={loading || !hoursToDeduct}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Redeem {hoursToDeduct || '?'} Hours
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassRedemption;
