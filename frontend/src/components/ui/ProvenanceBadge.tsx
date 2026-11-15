import React from 'react';

export type ProvenanceType =
  | 'REAL'
  | 'LIVE-API'
  | 'VOICE'
  | 'DSP-DERIVED'
  | 'SIMULATED'
  | 'CREW-REPLAY'
  | 'ABSTAIN'
  | 'DROPOUT'
  | 'DERIVED';

const BADGE_COLORS: Record<ProvenanceType, { border: string; bg: string; text: string }> = {
  'REAL':         { border: '#0d9488', bg: 'rgba(13,148,136,0.12)', text: '#14b8a6' },
  'LIVE-API':     { border: '#0d9488', bg: 'rgba(13,148,136,0.12)', text: '#14b8a6' },
  'VOICE':        { border: '#2563eb', bg: 'rgba(37,99,235,0.12)',  text: '#3b82f6' },
  'DSP-DERIVED':  { border: '#2563eb', bg: 'rgba(37,99,235,0.12)',  text: '#3b82f6' },
  'SIMULATED':    { border: '#d97706', bg: 'rgba(217,119,6,0.12)',  text: '#f59e0b' },
  'CREW-REPLAY':  { border: '#d97706', bg: 'rgba(217,119,6,0.12)',  text: '#f59e0b' },
  'ABSTAIN':      { border: '#dc2626', bg: 'rgba(220,38,38,0.12)',  text: '#ef4444' },
  'DROPOUT':      { border: '#dc2626', bg: 'rgba(220,38,38,0.12)',  text: '#ef4444' },
  'DERIVED':      { border: '#2563eb', bg: 'rgba(37,99,235,0.12)',  text: '#3b82f6' },
};

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  className?: string;
}

const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ type, className }) => {
  const colors = BADGE_COLORS[type];
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        lineHeight: '16px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '1px 5px',
        borderRadius: '2px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {type}
    </span>
  );
};

export default ProvenanceBadge;
