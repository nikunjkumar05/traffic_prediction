export default function TierBadge({ tier }) {
  const getTierStyles = (tierValue) => {
    const tierLower = tierValue?.toLowerCase();

    if (tierLower === 'critical') {
      return 'bg-neon-red/10 text-neon-red border-neon-red/20';
    }
    if (tierLower === 'high') {
      return 'bg-tier-high/10 text-tier-high border-tier-high/20';
    }
    if (tierLower === 'medium') {
      return 'bg-neon-amber/10 text-neon-amber border-neon-amber/20';
    }
    if (tierLower === 'low') {
      return 'bg-neon-green/10 text-neon-green border-neon-green/20';
    }
    if (tierLower === 'good' || tierLower === 'active' || tierLower === 'approved') {
      return 'bg-neon-green/10 text-neon-green border-neon-green/20';
    }
    if (tierLower === 'warning' || tierLower === 'on-call' || tierLower === 'submitted') {
      return 'bg-neon-amber/10 text-neon-amber border-neon-amber/20';
    }
    if (tierLower === 'urgent') {
      return 'bg-neon-red/10 text-neon-red border-neon-red/20';
    }

    return 'bg-neon-blue/10 text-neon-blue border-neon-blue/20';
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTierStyles(tier)}`}>
      {typeof tier === 'string' ? tier.toUpperCase() : tier}
    </span>
  )
}
