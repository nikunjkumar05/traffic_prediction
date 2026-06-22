import React, { useState } from 'react';
import { useApi } from '../utils/api';
import { Trophy, Medal, Star, Coins, ArrowUp, MapPin, Camera, User } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import GlassCard from '../components/GlassCard';

export default function ScoutLeaderboard() {
  const [timeframe, setTimeframe] = useState('weekly');
  const { data, loading, error } = useApi('/flipkart-scouts/leaderboard');

  const leaderboardData = data?.leaderboard || [];
  const topThree = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3);

  const getRankColor = (rank) => {
    if (rank === 1) return 'from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400';
    if (rank === 2) return 'from-slate-200 to-slate-400 text-slate-800 border-slate-300';
    if (rank === 3) return 'from-amber-500 to-amber-700 text-amber-100 border-amber-600';
    return 'bg-surface text-chalk border-white/10';
  };

  const getRankHeight = (rank) => {
    if (rank === 1) return 'h-32';
    if (rank === 2) return 'h-24';
    if (rank === 3) return 'h-20';
    return 'h-16';
  };

  return (
    <div className="min-h-screen bg-base pb-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#047BD5] to-[#2874F0] p-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <Trophy className="w-12 h-12 text-yellow-400 mb-2 drop-shadow-md" />
          <h1 className="text-2xl font-bold font-heading mb-1">Scout Leaderboard</h1>
          <p className="text-blue-100 text-sm">Top traffic reporters this week</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Toggle */}
        <ScrollReveal>
        <div className="flex bg-surface/50 backdrop-blur-md p-1 rounded-xl mb-8 border border-border w-full max-w-sm mx-auto">
          <button 
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${timeframe === 'weekly' ? 'bg-[#F37A20] text-white shadow-sm' : 'text-muted hover:text-chalk'}`}
            onClick={() => setTimeframe('weekly')}
          >
            Weekly
          </button>
          <button 
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${timeframe === 'monthly' ? 'bg-[#F37A20] text-white shadow-sm' : 'text-muted hover:text-chalk'}`}
            onClick={() => setTimeframe('monthly')}
          >
            Monthly
          </button>
        </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#F37A20] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <ScrollReveal>
          <div className="glass-card p-8 text-center mt-10">
            <div className="w-20 h-20 bg-elevated/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <Camera className="w-10 h-10 text-muted" />
            </div>
            <h2 className="text-xl font-bold text-chalk mb-2">No Reports Yet</h2>
            <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
              Be the first Flipkart Scout to report a traffic violation and claim the #1 spot on the leaderboard!
            </p>
            <button className="bg-gradient-to-r from-[#F37A20] to-[#f99b53] text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:scale-102 transition duration-300">
              Submit First Report
            </button>
          </div>
          </ScrollReveal>
        ) : (
          <>
            {/* Podium */}
            <ScrollReveal delay={50}>
            <div className="flex items-end justify-center gap-2 mb-10 pt-10">
              {/* Rank 2 */}
              {topThree[1] && (
                <div className="flex flex-col items-center w-1/3 max-w-[120px]">
                  <div className="relative mb-2">
                    <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center text-slate-800 font-bold text-lg border-2 border-slate-400 z-10 relative shadow-sm">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-base z-20">2</div>
                  </div>
                  <div className="text-center mb-2">
                    <p className="text-xs font-bold text-chalk truncate w-full px-2">{topThree[1].scout_id.replace('RIDER_', 'R_')}</p>
                    <p className="text-[10px] text-muted flex items-center justify-center gap-1 font-mono"><Coins className="w-3 h-3 text-[#F37A20]"/> {topThree[1].coins_earned}</p>
                  </div>
                  <div className="w-full h-24 bg-gradient-to-t from-slate-300/20 to-slate-200/25 backdrop-blur-md rounded-t-lg border-t-4 border-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.1)] flex flex-col items-center pt-2 border border-border">
                    <span className="text-chalk font-mono text-sm font-bold">{topThree[1].report_count}</span>
                    <span className="text-[9px] text-muted uppercase font-medium">Reports</span>
                  </div>
                </div>
              )}

              {/* Rank 1 */}
              {topThree[0] && (
                <div className="flex flex-col items-center w-1/3 max-w-[140px] relative z-10">
                  <div className="absolute -top-12 text-yellow-400 animate-bounce">
                    <Star className="w-8 h-8 fill-yellow-400 drop-shadow-md" />
                  </div>
                  <div className="relative mb-2">
                    <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center text-yellow-900 font-bold text-xl border-4 border-yellow-400 shadow-glow-amber z-10 relative">
                      <User className="w-7 h-7" />
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center border-2 border-base z-20 shadow-md">1</div>
                  </div>
                  <div className="text-center mb-2">
                    <p className="text-sm font-bold text-chalk truncate w-full px-2">{topThree[0].scout_id.replace('RIDER_', 'R_')}</p>
                    <p className="text-xs font-bold text-[#F37A20] flex items-center justify-center gap-1 font-mono"><Coins className="w-3 h-3"/> {topThree[0].coins_earned}</p>
                  </div>
                  <div className="w-full h-32 bg-gradient-to-t from-yellow-500/20 to-yellow-300/25 backdrop-blur-md rounded-t-lg border-t-4 border-yellow-500/40 shadow-[0_0_20px_rgba(250,204,21,0.2)] flex flex-col items-center pt-3 border border-border">
                    <span className="text-chalk font-mono text-lg font-bold">{topThree[0].report_count}</span>
                    <span className="text-[10px] text-muted uppercase font-semibold">Reports</span>
                  </div>
                </div>
              )}

              {/* Rank 3 */}
              {topThree[2] && (
                <div className="flex flex-col items-center w-1/3 max-w-[120px]">
                  <div className="relative mb-2">
                    <div className="w-14 h-14 bg-amber-600 rounded-full flex items-center justify-center text-amber-100 font-bold text-lg border-2 border-amber-500 z-10 relative shadow-sm">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-base z-20">3</div>
                  </div>
                  <div className="text-center mb-2">
                    <p className="text-xs font-bold text-chalk truncate w-full px-2">{topThree[2].scout_id.replace('RIDER_', 'R_')}</p>
                    <p className="text-[10px] text-muted flex items-center justify-center gap-1 font-mono"><Coins className="w-3 h-3 text-[#F37A20]"/> {topThree[2].coins_earned}</p>
                  </div>
                  <div className="w-full h-20 bg-gradient-to-t from-amber-700/20 to-amber-600/25 backdrop-blur-md rounded-t-lg border-t-4 border-amber-500/40 shadow-[0_0_15px_rgba(217,119,6,0.1)] flex flex-col items-center pt-2 border border-border">
                    <span className="text-chalk font-mono text-sm font-bold">{topThree[2].report_count}</span>
                    <span className="text-[9px] text-muted uppercase font-medium">Reports</span>
                  </div>
                </div>
              )}
            </div>
            </ScrollReveal>

            {/* List */}
            <ScrollReveal delay={100}>
            <div className="space-y-3">
              {restList.map((scout) => (
                <div key={scout.rank} className="glass-card p-4 flex items-center gap-4 hover:bg-surface/60 hover:border-muted/20 transition-all duration-300">
                  <div className="w-8 h-8 rounded-lg bg-elevated/60 border border-border flex items-center justify-center font-mono font-bold text-muted text-sm shrink-0">
                    {scout.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-chalk truncate">{scout.scout_id}</p>
                    <p className="text-xs text-muted flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" /> {scout.top_junction}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-chalk text-sm">{scout.report_count}</p>
                    <p className="text-[10px] text-muted uppercase">Reports</p>
                  </div>
                  <div className="text-right w-16 shrink-0">
                    <p className="font-bold text-[#F37A20] text-sm flex items-center justify-end gap-1 font-mono">
                      <Coins className="w-3 h-3" /> {scout.coins_earned}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </ScrollReveal>
            
            {/* CTA */}
            <ScrollReveal delay={150}>
            <div className="mt-8 text-center glass-card p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Medal className="w-24 h-24 text-chalk" />
              </div>
              <h3 className="text-lg font-bold text-chalk mb-2 relative z-10">Want to join the leaderboard?</h3>
              <p className="text-sm text-muted mb-4 relative z-10">Become a Flipkart Traffic Scout and earn rewards for reporting illegal parking.</p>
              <button className="bg-neon-blue hover:bg-neon-blue/80 text-white font-bold py-2.5 px-6 rounded-full text-sm shadow-lg transition duration-300 relative z-10">
                Register as Scout
              </button>
            </div>
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
}
