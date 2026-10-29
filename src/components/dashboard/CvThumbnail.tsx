import React, { useEffect, useRef, useState } from 'react';
import { ResumePreview, ResumeData, SectionId } from '../resume-preview/ResumePreview';
import { TemplateType, TEMPLATE_NAMES_REVERSE, TEMPLATES } from '../../templates';

// ─── Error boundary ──────────────────────────────────────────────────────────

interface BoundaryProps { fallback: React.ReactNode; children: React.ReactNode }
interface BoundaryState { hasError: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ThumbnailErrorBoundary extends (React.Component as any) {
  constructor(props: BoundaryProps) {
    super(props);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  render() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    if (self.state.hasError) return (self.props as BoundaryProps).fallback;
    return (self.props as BoundaryProps).children;
  }
}

// ─── Default safe data ───────────────────────────────────────────────────────

const DEFAULT_ORDERS: { single: SectionId[]; main: SectionId[]; side: SectionId[] } = {
  single: ['experience', 'education', 'competences', 'projets', 'langues', 'interets'],
  main: ['experience', 'education', 'projets'],
  side: ['competences', 'langues', 'interets'],
};

function buildSafeResumeData(raw: Record<string, unknown>): ResumeData {
  const c = (raw.coordonnees as Record<string, unknown>) || {};
  return {
    coordonnees: {
      name: (c.name as string) || '',
      jobTitle: (c.jobTitle as string) || '',
      photoUrl: (c.photoUrl as string) || '',
      email: (c.email as string) || '',
      phone: (c.phone as string) || '',
      website: (c.website as string) || '',
      location: (c.location as string) || '',
      linkedin: (c.linkedin as string) || '',
      github: (c.github as string) || '',
      drivingLicense: (c.drivingLicense as string) || '',
    },
    profil: (raw.profil as string) || '',
    experience: Array.isArray(raw.experience) ? raw.experience : [],
    education: Array.isArray(raw.education) ? raw.education : [],
    competences: (raw.competences as string) || '',
    langues: (raw.langues as string) || '',
    interets: (raw.interets as string) || '',
    projets: Array.isArray(raw.projets) ? raw.projets : [],
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CvThumbnailProps {
  resumeData: Record<string, unknown>;
  cvName: string;
  /** fraction of A4 height to reveal (1 = a complete miniature page) */
  revealFraction?: number;
}

/** A4 dimensions in CSS pixels at 96 dpi */
const A4_W = 794;
const A4_H = 1123;

function CvThumbnailInner({ resumeData, cvName, revealFraction = 1 }: CvThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [inView, setInView] = useState(false);
  const previewId = useRef(`cv-thumb-${Math.random().toString(36).slice(2)}`).current;

  // IntersectionObserver — only render heavy content once card is near viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ResizeObserver — recompute scale whenever container width changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(Math.min(w, 190) / A4_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { _meta, ...rawData } = resumeData as Record<string, unknown> & { _meta?: Record<string, unknown> };
  const metaTemplate = (_meta?.template as string) ?? '';
  // `_meta.template` may hold either the display label ("Minimaliste") or the raw template id.
  const resolvedTemplate: TemplateType =
    TEMPLATE_NAMES_REVERSE[metaTemplate] ??
    (metaTemplate && metaTemplate in TEMPLATES ? (metaTemplate as TemplateType) : 'minimalist');
  const tplDef = TEMPLATES[resolvedTemplate];
  const metaLayout = _meta?.layout as string | undefined;
  const layout: 'single' | 'double' =
    metaLayout === 'double' || metaLayout === 'single'
      ? metaLayout
      : tplDef?.layoutVariant === 'left-sidebar' || tplDef?.layoutVariant === 'two-column' || tplDef?.sidebarContainer
      ? 'double'
      : 'single';
  const safeData = buildSafeResumeData(rawData);

  // Container height shows only `revealFraction` of the A4 sheet
  const containerHeight = scale > 0 ? scale * A4_H * revealFraction : 190 * revealFraction * (A4_H / A4_W);

  const initials = cvName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-t-lg bg-[#f2f4f8] relative"
      style={{ height: containerHeight }}
    >
      {!inView || scale === 0 ? (
        // Skeleton until in view and measured
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-100 animate-pulse flex items-center justify-center">
          <span className="text-2xl font-extrabold text-gray-400">{initials}</span>
        </div>
      ) : (
        <div
          className="bg-white shadow-sm"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            width: A4_W,
            height: A4_H,
            // Center the full-size A4 sheet on the card, then shrink it from its top-center.
            marginLeft: -A4_W / 2,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          <ResumePreview
            data={safeData}
            template={resolvedTemplate}
            layout={layout}
            singleColumnOrder={DEFAULT_ORDERS.single}
            mainColumnOrder={DEFAULT_ORDERS.main}
            sideColumnOrder={DEFAULT_ORDERS.side}
            id={previewId}
          />
        </div>
      )}
    </div>
  );
}

const CvThumbnail = React.memo(function CvThumbnail(props: CvThumbnailProps) {
  const initials = props.cvName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const fallback = (
    <div className="w-full rounded-t-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center" style={{ height: 160 }}>
      <span className="text-3xl font-extrabold text-gray-500">{initials}</span>
    </div>
  );

  return (
    <ThumbnailErrorBoundary fallback={fallback}>
      <CvThumbnailInner {...props} />
    </ThumbnailErrorBoundary>
  );
});

export default CvThumbnail;
