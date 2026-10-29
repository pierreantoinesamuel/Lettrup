import React from 'react';

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
      {/* Thumbnail area */}
      <div className="w-full bg-gray-200 animate-pulse" style={{ height: 160 }} />
      {/* Body */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-full bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function CvLibrarySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
