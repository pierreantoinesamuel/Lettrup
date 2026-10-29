import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import logoIcon from '../assets/logo-icon.png';
import logoIconLight from '../assets/logo-icon-light.png';

interface FooterProps {
  /** Renders the light-themed variant (white/slate-on-light, sky+emerald accent) used on the Accueil landing page. Defaults to the original dark theme used on Pricing, Blog, and other pages. */
  light?: boolean;
}

export default function Footer({ light = false }: FooterProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const handleAnchorClick = (anchorId: string) => {
    if (location.pathname !== '/') {
      navigate(`/${anchorId}`);
    } else {
      const el = document.querySelector(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const linkClass = light ? 'hover:text-slate-900 transition-colors flex items-center gap-1.5 group cursor-pointer' : 'hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer';
  const arrowClass = light ? 'opacity-0 group-hover:opacity-100 transition-opacity text-[#007568]' : 'opacity-0 group-hover:opacity-100 transition-opacity text-blue-400';

  return (
    <footer className={`border-t pt-16 pb-12 px-4 sm:px-6 lg:px-8 relative z-10 ${
      light ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-800/80 bg-[#07070a] text-slate-300'
    }`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12">

        {/* Brand & Newsletter Column */}
        <div className="lg:col-span-2 space-y-4 pr-0 lg:pr-6">
          <Link to="/" className="flex items-center gap-3 group inline-flex">
            <img src={light ? logoIcon : logoIconLight} alt="Lettrup" className="w-11 h-11 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black tracking-tight ${light ? 'text-slate-900' : 'text-white'}`}>Lettrup</span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                light ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-[#D97706]/20 text-[#D97706] border-[#D97706]/30'
              }`}>PRO</span>
            </div>
          </Link>

          <p className={`text-xs leading-relaxed max-w-sm ${light ? 'text-slate-500' : 'text-slate-400'}`}>
            La plateforme IA tout-en-un pour accélérer votre carrière : création de CV ATS, lettres ciblées, simulateur d'entretien et portfolios web en ligne.
          </p>

          <form onSubmit={handleSubscribe} className="space-y-2 pt-2 max-w-sm">
            <span className={`text-xs font-bold block ${light ? 'text-slate-500' : 'text-slate-400'}`}>
              Newsletter & Conseils Carrière :
            </span>
            <div className="flex gap-2">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors ${
                  light
                    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#007568]'
                    : 'bg-white/5 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-blue-500'
                }`}
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  light ? 'bg-[#007568] hover:bg-tertiary text-white' : 'bg-[#007568] hover:bg-blue-800 text-white'
                }`}
              >
                <span>S'inscrire</span>
                <Send size={12} />
              </button>
            </div>
            {subscribed && (
              <span className={`text-xs flex items-center gap-1 mt-1 font-medium ${light ? 'text-emerald-600' : 'text-emerald-400'}`}>
                <CheckCircle2 size={13} /> Merci pour votre inscription !
              </span>
            )}
            <p className={`text-xs leading-relaxed ${light ? 'text-slate-400' : 'text-slate-500'}`}>
              En vous inscrivant, vous acceptez de recevoir notre newsletter. Consultez notre{' '}
              <Link to="/privacy" className={`underline underline-offset-2 ${light ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-300'}`}>
                Politique de Confidentialité
              </Link>
              .
            </p>
          </form>
        </div>

        {/* Navigation Rapide (6 Clés) */}
        <div>
          <h4 className={`text-xs font-bold mb-4 flex items-center gap-1.5 ${light ? 'text-slate-900' : 'text-white'}`}>
            <Zap size={13} className={light ? 'text-[#007568]' : 'text-[#D97706]'} />
             Navigation Accueil
          </h4>
          <ul className={`space-y-2.5 text-xs font-medium ${light ? 'text-slate-500' : 'text-slate-400'}`}>
            <li>
              <button type="button" onClick={() => handleAnchorClick('#pipeline')} className={linkClass}>
                <span>Pipeline</span>
                <ArrowUpRight size={12} className={arrowClass} />
              </button>
            </li>
            <li>
              <button type="button" onClick={() => handleAnchorClick('#features')} className={linkClass}>
                <span>Fonctionnalités</span>
                <ArrowUpRight size={12} className={arrowClass} />
              </button>
            </li>
            <li>
              <Link to="/pricing" className={`font-bold transition-colors flex items-center gap-1.5 group ${
                light ? 'hover:text-tertiary text-slate-700' : 'hover:text-[#D97706] text-slate-300'
              }`}>
                <span>Tarifs & Offres</span>
                <ArrowUpRight size={12} className={light ? 'text-[#007568]' : 'text-[#D97706]'} />
              </Link>
            </li>
            <li>
              <Link to="/blog" className={linkClass}>
                <span>Blog & Guides</span>
                <ArrowUpRight size={12} className={arrowClass} />
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => handleAnchorClick('#comparison')} className={linkClass}>
                <span>Comparatif</span>
                <ArrowUpRight size={12} className={arrowClass} />
              </button>
            </li>
            <li>
              <button type="button" onClick={() => handleAnchorClick('#faq')} className={linkClass}>
                <span>FAQ & Réponses</span>
                <ArrowUpRight size={12} className={arrowClass} />
              </button>
            </li>
          </ul>
        </div>

        {/* Produit & Outils */}
        <div>
          <h4 className={`text-xs font-bold mb-4 ${light ? 'text-slate-900' : 'text-slate-300'}`}>
            Produit & Outils
          </h4>
          <ul className={`space-y-2.5 text-xs ${light ? 'text-slate-500' : 'text-slate-400'}`}>
            <li><Link to="/builder" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Créateur de CV IA</Link></li>
            <li><Link to="/dashboard" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Générateur de Lettre</Link></li>
            <li><Link to="/dashboard" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Portfolio Web Express</Link></li>
            <li><Link to="/dashboard" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Analyseur & Score ATS</Link></li>
            <li><Link to="/recruiter" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Espace Recruteur</Link></li>
          </ul>
        </div>

        {/* Entreprise & Support */}
        <div>
          <h4 className={`text-xs font-bold mb-4 ${light ? 'text-slate-900' : 'text-slate-300'}`}>
            Entreprise & Légal
          </h4>
          <ul className={`space-y-2.5 text-xs ${light ? 'text-slate-500' : 'text-slate-400'}`}>
            <li><Link to="/a-propos" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>À propos de Lettrup</Link></li>
            <li><Link to="/blog" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Ressources Carrière</Link></li>
            <li><Link to="/privacy" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Confidentialité & RGPD</Link></li>
            <li><Link to="/terms" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Conditions Générales</Link></li>
            <li><Link to="/mentions-legales" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Mentions légales</Link></li>
            <li><Link to="/cookie-policy" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Politique de Cookies</Link></li>
            <li><Link to="/refund" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Remboursements</Link></li>
            <li><Link to="/contact" className={light ? 'hover:text-slate-900 transition-colors' : 'hover:text-white transition-colors'}>Contact & Support</Link></li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className={`max-w-7xl mx-auto pt-8 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-4 ${
        light ? 'border-slate-200 text-slate-400' : 'border-slate-800/80 text-slate-500'
      }`}>
        <p>© 2026 Lettrup, un service édité par Linker Automation Tech, micro-entreprise française. Tous droits réservés.</p>
        <div className="flex items-center gap-6">
          <span className={`flex items-center gap-1.5 ${light ? 'text-slate-500' : 'text-slate-400'}`}>
            <ShieldCheck size={14} className="text-emerald-400" />
            Données 100% sécurisées et hébergées en Europe
          </span>
          <Link
            to="/cookie-policy"
            className={`underline underline-offset-2 transition-colors ${light ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Gérer les cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
