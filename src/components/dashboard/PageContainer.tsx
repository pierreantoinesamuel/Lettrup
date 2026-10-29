import React from 'react';

export type PageContainerVariant = 'fluid' | 'wide' | 'reading';

// Single source of truth for how wide dashboard page content is allowed to
// get. `fluid` has no cap (dashboards/lists/grids should use the MainArea
// width MainArea already gives them); `wide` bounds multi-panel workspaces
// so they don't sprawl on ultra-wide monitors; `reading` is for long-form
// text. mx-auto is a no-op under `fluid` (max-width: none), so it's safe to
// always include rather than branching on it.
const VARIANT_MAX_WIDTH: Record<PageContainerVariant, string> = {
  fluid: 'max-w-none',
  wide: 'max-w-[1600px]',
  reading: 'max-w-[1100px]',
};

interface PageContainerProps {
  variant?: PageContainerVariant;
  className?: string;
  children: React.ReactNode;
}

export default function PageContainer({ variant = 'fluid', className = '', children }: PageContainerProps) {
  return (
    <div className={`w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8 ${VARIANT_MAX_WIDTH[variant]} ${className}`}>
      {children}
    </div>
  );
}
