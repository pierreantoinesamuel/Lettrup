import React from 'react';

interface Props {
  count?: number;
}

export default function CoverLetterLibrarySkeleton({ count = 6 }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm animate-pulse"
        >
          {/* Header color band skeleton */}
          <div className="h-24 bg-gray-200" />

          {/* Card body */}
          <div className="p-3 flex flex-col gap-2 flex-1">
            {/* Company + position */}
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />

            {/* Template + date row */}
            <div className="flex items-center justify-between mt-1">
              <div className="h-3 bg-gray-100 rounded w-2/5" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>

            {/* Button */}
            <div className="mt-auto h-8 bg-gray-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
