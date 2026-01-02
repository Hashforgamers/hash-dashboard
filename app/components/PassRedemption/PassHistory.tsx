// frontend/src/components/PassHistory.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, Clock, Calendar, User, AlertCircle } from 'lucide-react';

interface RedemptionLog {
  id: number;
  hours_deducted: number;
  session_start_time: string | null;
  session_end_time: string | null;
  redemption_method: string;
  redeemed_at: string;
  notes: string | null;
  is_cancelled: boolean;
  cancelled_at: string | null;
}

const PassHistory: React.FC<{ userPassId: number }> = ({ userPassId }) => {
  const [history, setHistory] = useState<RedemptionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userPassId]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`/api/pass/${userPassId}/history`);
      setHistory(response.data.history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading history...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Redemption History
      </h3>

      {history.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No redemptions yet</p>
      ) : (
        <div className="space-y-3">
          {history.map((log) => (
            <div
              key={log.id}
              className={`border rounded-lg p-4 ${
                log.is_cancelled ? 'bg-red-50 border-red-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold">
                      {log.hours_deducted} hours
                    </span>
                    {log.is_cancelled && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        CANCELLED
                      </span>
                    )}
                  </div>

                  {log.session_start_time && log.session_end_time && (
                    <div className="text-sm text-gray-600 mb-1">
                      Session: {log.session_start_time} - {log.session_end_time}
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(log.redeemed_at).toLocaleString()}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Method: {log.redemption_method === 'dashboard_manual' ? '🖥️ Dashboard' : '📱 App'}
                  </div>

                  {log.notes && (
                    <div className="mt-2 text-sm text-gray-700 bg-white p-2 rounded">
                      {log.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PassHistory;
