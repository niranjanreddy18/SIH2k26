import React, { useId } from 'react';

interface Props {
  size?: number;
}

/**
 * SLIDMS mark: a shield silhouette (custody/security) with a verified
 * checkmark — reads as "verified legal record" rather than a generic
 * padlock. Gradient id is per-instance (useId) so multiple copies on the
 * same page never collide.
 */
export const Logo: React.FC<Props> = ({ size = 32 }) => {
  const gradId = `slidms-logo-grad-${useId()}`;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M24 4 L40 10 V22 C40 34 32 42 24 46 C16 42 8 34 8 22 V10 Z"
        fill={`url(#${gradId})`}
        fillOpacity={0.16}
        stroke={`url(#${gradId})`}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path
        d="M16.5 23.5 L21.5 28.5 L32 17"
        stroke={`url(#${gradId})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
