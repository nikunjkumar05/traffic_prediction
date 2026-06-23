import React, { useState, useEffect } from 'react';
import { useApi, apiFetch } from '../utils/api';
import { Camera, MapPin, Navigation, Send, Award, Coins, CheckCircle, AlertTriangle, User, FileText, ChevronRight, Clock, XCircle } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import GlassCard from '../components/GlassCard';

export default function FlipkartScout() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    scout_id: '',
    junction: '',
    latitude: '',
    longitude: '',
    photo_url: '',
    vehicle_number: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = React.useRef(null);
  
  const { data: stationData } = useApi('/stations');
  const stations = stationData?.stations || [];

  const { data: reportsData, refetch: refetchReports } = useApi('/flipkart-scouts/reports');
  const scoutReports = reportsData?.reports || [];

  const totalReports = scoutReports.length;
  const approvedReports = scoutReports.filter(r => r.status === 'APPROVED').length;
  const pendingReports = scoutReports.filter(r => r.status === 'PENDING').length;
  const coinsEarned = approvedReports * 50;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.scout_id) {
          setFormData(prev => ({ ...prev, scout_id: u.scout_id }));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await apiFetch('/api/flipkart-scouts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude) || 12.9716,
          longitude: parseFloat(formData.longitude) || 77.5946
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const reward = {
          id: data.report_id,
          coins: data.reward_points || 50,
          impact: data.estimated_cii || 'Medium'
        };
        setSuccessData(reward);
        refetchReports();
        
        setFormData(prev => ({
          ...prev,
          junction: '', latitude: '', longitude: '', photo_url: '', vehicle_number: '', notes: ''
        }));
      } else {
        setSubmitError(data.detail || "Failed to submit report. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#047BD5] to-[#2874F0] p-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#F37A20] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#F37A20]/40">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-heading mb-1">Flipkart Traffic Scout</h1>
          <p className="text-blue-100 text-sm flex items-center gap-1 justify-center">
            <Coins className="w-4 h-4 text-[#F37A20]" />
            Earn SuperCoins while keeping roads clear
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <ScrollReveal delay={100}>
        <div className="flex px-4 mt-6 gap-3">
          <div className="flex-1 glass-card-static p-3 flex flex-col items-center hover:scale-[1.01] transition-transform duration-300">
            <p className="text-xs text-muted mb-1 uppercase font-semibold">Total Filed</p>
            <p className="text-lg font-mono font-bold text-chalk">{totalReports}</p>
            <p className="text-[10px] text-muted">Reports</p>
          </div>
          <div className="flex-1 glass-card-static p-3 flex flex-col items-center hover:scale-[1.01] transition-transform duration-300">
            <p className="text-xs text-muted mb-1 uppercase font-semibold">Pending Vetting</p>
            <p className="text-lg font-mono font-bold text-chalk">{pendingReports}</p>
            <p className="text-[10px] text-muted">Reports</p>
          </div>
          <div className="flex-1 bg-[#F37A20]/10 border border-[#F37A20]/20 rounded-xl p-3 flex flex-col items-center hover:scale-[1.01] transition-transform duration-300">
            <p className="text-xs text-[#F37A20] mb-1 uppercase font-semibold">Earned</p>
            <p className="text-lg font-mono font-bold text-[#F37A20]">{coinsEarned}</p>
            <p className="text-[10px] text-[#F37A20]">SuperCoins</p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <div className="px-4 mt-6">
          {!showForm && !successData ? (
            <div className="text-center py-8">
              <button 
                onClick={() => setShowForm(true)}
                className="w-full bg-gradient-to-r from-[#F37A20] to-[#f99b53] text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(243,122,32,0.4)] flex flex-col items-center gap-2 transform transition hover:scale-[1.02] active:scale-95 duration-300"
              >
                <Camera className="w-8 h-8" />
                <span className="text-lg">Report Illegal Parking</span>
              </button>
              <p className="text-muted text-sm mt-4">Takes &lt; 30 seconds. Earn 50 SuperCoins.</p>
            </div>
          ) : successData ? (
            <div className="glass-card border-signal-emerald/30 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-[#F37A20]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-[#F37A20]" />
              </div>
              <h2 className="text-2xl font-bold text-chalk mb-2">Report Submitted!</h2>
              <p className="text-muted text-sm mb-6">Submitted for police vetting to avoid false reports.</p>
              
              <div className="bg-elevated/40 rounded-xl p-4 mb-6 border border-border text-left">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-border">
                  <span className="text-muted text-sm">Report ID</span>
                  <span className="text-chalk font-mono font-medium">{successData.id}</span>
                </div>
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-border">
                  <span className="text-muted text-sm">Impact Est.</span>
                  <span className="text-signal-red font-medium text-sm">{successData.impact}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted text-sm">Est. Reward</span>
                  <span className="text-[#F37A20] font-bold flex items-center gap-1 font-mono">
                    <Coins className="w-4 h-4" /> +{successData.coins} SuperCoins (Pending Vetting)
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => { setSuccessData(null); setShowForm(false); }}
                className="w-full bg-[#047BD5] hover:bg-[#0362a9] text-white font-semibold py-3 rounded-xl transition duration-300"
              >
                Back to Home
              </button>
            </div>
          ) : submitError ? (
            <div className="glass-card rounded-2xl p-8 text-center animate-in slide-in-from-bottom-4 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-5 mx-auto">
                <AlertTriangle className="w-8 h-8 text-signal-red" />
              </div>
              <h2 className="text-xl font-bold text-chalk mb-2">Submission Failed</h2>
              <p className="text-muted text-sm mb-6">{submitError}</p>
              <button 
                onClick={() => { setSubmitError(null); setShowForm(true); }}
                className="w-full bg-[#047BD5] hover:bg-[#0362a9] text-white font-semibold py-3 rounded-xl transition duration-300"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-5 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-chalk flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#F37A20]" />
                  New Report
                </h2>
                <button onClick={() => setShowForm(false)} className="text-muted hover:text-chalk text-sm transition">Cancel</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1 flex items-center gap-2">
                    <User className="w-3 h-3" /> Scout ID
                  </label>
                  <input 
                    required
                    type="text" 
                    value={formData.scout_id}
                    onChange={e => setFormData({...formData, scout_id: e.target.value})}
                    className="w-full bg-elevated/60 border border-border rounded-xl px-4 py-3 text-sm text-chalk focus:border-[#F37A20] focus:ring-1 focus:ring-[#F37A20] outline-none transition"
                    placeholder="e.g. RIDER_9921"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Nearest Junction
                  </label>
                  <select 
                    required
                    value={formData.junction}
                    onChange={e => setFormData({...formData, junction: e.target.value})}
                    className="w-full bg-elevated/60 border border-border rounded-xl px-4 py-3 text-sm text-chalk focus:border-[#F37A20] focus:ring-1 focus:ring-[#F37A20] outline-none transition"
                  >
                    <option value="">Select a junction...</option>
                    {stations.map(s => (
                      <option key={s.station} value={s.station}>{s.station}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={formData.latitude}
                      onChange={e => setFormData({...formData, latitude: e.target.value})}
                      placeholder="Latitude"
                      className="w-full bg-elevated/60 border border-border rounded-xl px-3 py-2 text-xs text-chalk font-mono transition"
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={formData.longitude}
                      onChange={e => setFormData({...formData, longitude: e.target.value})}
                      placeholder="Longitude"
                      className="w-full bg-elevated/60 border border-border rounded-xl px-3 py-2 text-xs text-chalk font-mono transition"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleLocation}
                    className="bg-neon-blue/10 text-neon-blue p-2.5 rounded-xl border border-neon-blue/20 hover:bg-neon-blue/20 flex items-center justify-center transition"
                    title="Get location coordinates"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1 flex items-center gap-2">
                    <Camera className="w-3 h-3" /> Photo Evidence
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData((prev) => ({
                          ...prev,
                          photo_url: file.name,
                        }));
                      }
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-elevated/50 transition"
                  >
                    <Camera className="w-6 h-6 text-muted mx-auto mb-2" />
                    <p className="text-xs text-muted">
                      {formData.photo_url ? formData.photo_url : "Tap to upload photo"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase mb-1 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Vehicle Number (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={formData.vehicle_number}
                    onChange={e => setFormData({...formData, vehicle_number: e.target.value})}
                    className="w-full bg-elevated/60 border border-border rounded-xl px-4 py-3 text-sm text-chalk uppercase font-mono"
                    placeholder="e.g. KA01 AB 1234"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full mt-4 bg-[#F37A20] hover:bg-[#e06b1a] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                >
                  {submitting ? 'Submitting...' : (
                    <>
                      <Send className="w-5 h-5" /> Submit Report
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Recent Reports */}
      {scoutReports.length > 0 && (
        <ScrollReveal delay={200}>
          <div className="px-4 mt-8">
            <h3 className="text-sm font-semibold text-chalk mb-3 flex items-center justify-between">
              Your Recent Reports
              <span className="text-xs text-muted">Showing last {scoutReports.length} reports</span>
            </h3>
            <div className="space-y-2">
              {scoutReports.slice(0, 10).map((report, idx) => (
                <div key={report.id || idx} className="glass-card-static p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      report.status === 'APPROVED' ? 'bg-signal-emerald/20 text-signal-emerald' : 
                      report.status === 'REJECTED' ? 'bg-signal-red/20 text-signal-red' : 
                      'bg-signal-amber/20 text-signal-amber'
                    }`}>
                      {report.status === 'APPROVED' ? <CheckCircle className="w-4 h-4" /> : 
                       report.status === 'REJECTED' ? <XCircle className="w-4 h-4" /> : 
                       <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-chalk font-medium">{report.junction || 'Unknown Location'}</p>
                      <p className="text-xs text-muted font-mono">
                        ID: {report.report_id || `FS-${report.id}`} {report.vehicle_number ? `· ${report.vehicle_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold flex items-center gap-1 justify-end font-mono ${
                      report.status === 'APPROVED' ? 'text-[#F37A20]' : 'text-muted'
                    }`}>
                      <Coins className="w-3 h-3" /> {report.status === 'APPROVED' ? '+50' : '0'}
                    </p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      report.status === 'APPROVED' ? 'bg-signal-emerald/10 text-signal-emerald' :
                      report.status === 'REJECTED' ? 'bg-signal-red/10 text-signal-red' :
                      'bg-signal-amber/10 text-signal-amber'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
