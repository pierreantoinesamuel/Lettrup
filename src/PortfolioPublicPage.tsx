import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Globe } from 'lucide-react';
import PortfolioBuilder from './components/dashboard/PortfolioBuilder';
import type { ResumeProfile } from './types';

interface PublicPortfolioData {
  configName: string;
  template: string;
  sections: string[];
  resumeData: ResumeProfile;
}

interface PortfolioPublicPageProps {
  // Provided when rendered from a portfolio subdomain (App.tsx resolves the
  // slug from window.location.hostname instead of the router path).
  slug?: string;
}

export default function PortfolioPublicPage({ slug: slugProp }: PortfolioPublicPageProps) {
  const { slug: slugParam } = useParams();
  const slug = slugProp || slugParam;

  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found'>('loading');
  const [data, setData] = useState<PublicPortfolioData | null>(null);

  useEffect(() => {
    if (!slug) {
      setStatus('not_found');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetch(`/api/portfolio/public/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.portfolio) {
          setData(json.portfolio);
          setStatus('ready');
        } else {
          setStatus('not_found');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('not_found');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 gap-2">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Chargement du portfolio...</span>
      </div>
    );
  }

  if (status === 'not_found' || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
        <Globe size={40} className="text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-700 mb-2">Portfolio introuvable</h1>
        <p className="text-sm text-slate-500 max-w-md">
          Ce lien n'existe pas ou n'est plus publié. Vérifiez l'adresse ou contactez son propriétaire.
        </p>
      </div>
    );
  }

  return (
    <PortfolioBuilder
      resume={data.resumeData}
      publicMode
      lang="fr"
      initialConfig={{ template: data.template, sections: data.sections }}
    />
  );
}
