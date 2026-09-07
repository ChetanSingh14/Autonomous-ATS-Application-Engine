import React from 'react';

interface PlatformBadgeProps {
  platform: string;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = React.memo(({ platform }) => {
  const upper = platform ? platform.toUpperCase() : 'CUSTOM';
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

  if (upper === 'GREENHOUSE') badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
  if (upper === 'LEVER') badgeColor = 'bg-purple-950/80 text-purple-300 border-purple-800';
  if (upper === 'ASHBY') badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800';
  if (upper === 'LINKEDIN') badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-800';
  if (upper === 'NAUKRI') badgeColor = 'bg-orange-950/80 text-orange-300 border-orange-800';
  if (upper === 'WELLFOUND') badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800';
  if (upper === 'INTERNSHALA') badgeColor = 'bg-teal-950/80 text-teal-300 border-teal-800';
  if (upper === 'WORKDAY') badgeColor = 'bg-sky-950/80 text-sky-300 border-sky-800';

  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${badgeColor}`}>
      {upper}
    </span>
  );
});

PlatformBadge.displayName = 'PlatformBadge';
