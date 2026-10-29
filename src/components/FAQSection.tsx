import React, { useState } from 'react';
import { ChevronDown, Sparkles, ShieldCheck, DollarSign, Layers } from 'lucide-react';

export interface FAQItem {
  q: string;
  a: string;
}

export interface FAQCategory {
  category: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: FAQItem[];
}

const DEFAULT_CATEGORY = 'Les essentiels';

export const FAQ_CATEGORIES: FAQCategory[] = [
  {
    category: DEFAULT_CATEGORY,
    icon: Sparkles,
    items: [
      {
        q: "Lettrup rédige-t-il mon CV à ma place ?",
        a: "Non. Lettrup améliore et adapte votre CV avec l'IA, mais vous gardez la main. Vous relisez, modifiez et validez chaque suggestion avant d'exporter votre CV."
      },
      {
        q: "Est-ce que cela m'aidera vraiment à décrocher plus d'entretiens ?",
        a: "Lettrup est conçu pour améliorer la qualité de vos candidatures : il optimise votre CV pour les logiciels de tri (ATS), le rapproche des offres d'emploi et vous aide à préparer vos entretiens. Aucune plateforme ne peut garantir un emploi, mais de meilleures candidatures ouvrent en général plus d'entretiens."
      },
      {
        q: "Lettrup est-il compatible avec les ATS ?",
        a: "Oui. Chaque CV généré par Lettrup respecte les bonnes pratiques de mise en forme des logiciels de suivi des candidatures actuels, pour que les recruteurs lisent correctement votre CV."
      },
      {
        q: "Puis-je personnaliser mon CV ?",
        a: "Bien sûr. Vous pouvez modifier chaque section, choisir un autre modèle, changer les couleurs, les polices et les espacements, et adapter votre CV autant que vous le souhaitez."
      },
      {
        q: "Puis-je créer plusieurs versions de mon CV ?",
        a: "Oui. Vous pouvez créer des CV différents selon l'entreprise, le secteur ou l'intitulé du poste, sans repartir de zéro."
      },
      {
        q: "Lettrup peut-il générer des lettres de motivation ?",
        a: "Oui. Générez en quelques secondes des lettres de motivation personnalisées, à partir de votre CV et de l'offre d'emploi."
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "Oui. Vos informations personnelles et vos documents sont chiffrés et stockés de façon sécurisée. Vos données ne sont jamais vendues à des tiers."
      },
      {
        q: "Puis-je résilier à tout moment ?",
        a: "Oui. Vous pouvez changer de formule, passer à une formule inférieure ou résilier votre abonnement quand vous le souhaitez. Il n'y a aucun engagement de durée."
      },
      {
        q: "Faut-il s'y connaître en IA pour utiliser Lettrup ?",
        a: "Pas du tout. Lettrup s'adresse à tous, des étudiants aux professionnels expérimentés. Importez votre CV et suivez les étapes guidées."
      },
      {
        q: "Dans quels formats puis-je exporter mon CV ?",
        a: "Vous pouvez exporter votre CV en PDF. D'autres formats sont disponibles selon votre formule."
      }
    ]
  },
  {
    category: "Fonctionnalités",
    icon: Layers,
    items: [
      {
        q: "Lettrup peut-il optimiser mon profil LinkedIn ?",
        a: "Oui. Lettrup analyse votre profil LinkedIn et propose des améliorations pour votre titre, votre résumé, vos expériences et vos compétences, afin de le rendre plus attractif pour les recruteurs."
      },
      {
        q: "Puis-je suivre mes candidatures ?",
        a: "Oui. Gardez toutes vos candidatures au même endroit, suivez leur statut, enregistrez les dates d'entretien et ne perdez plus le fil de votre recherche."
      },
      {
        q: "Lettrup compare-t-il mon CV aux offres d'emploi ?",
        a: "Oui. Collez une offre d'emploi : Lettrup la compare à votre CV, signale les mots-clés manquants, repère les compétences à acquérir et recommande des améliorations."
      },
      {
        q: "Puis-je me préparer aux entretiens ?",
        a: "Oui. Entraînez-vous avec des questions d'entretien générées par l'IA et adaptées au poste visé, puis recevez un retour immédiat sur vos réponses."
      },
      {
        q: "Lettrup peut-il m'aider à me reconvertir ?",
        a: "Oui. Que vous changiez de secteur ou visiez un nouveau poste, Lettrup met en valeur vos compétences transférables et adapte votre CV en conséquence."
      }
    ]
  },
  {
    category: "Tarifs",
    icon: DollarSign,
    items: [
      {
        q: "Existe-t-il une formule gratuite ?",
        a: "Oui. Vous pouvez essayer Lettrup avec des fonctionnalités limitées avant de passer à une formule supérieure pour profiter de l'ensemble du copilote de carrière."
      },
      {
        q: "Que se passe-t-il si j'atteins ma limite mensuelle d'IA ?",
        a: "Vous êtes prévenu avant d'atteindre votre limite. Selon votre formule, votre quota se renouvelle chaque mois, ou vous pouvez passer à une formule supérieure pour disposer de plus d'usage."
      }
    ]
  },
  {
    category: "Confiance",
    icon: ShieldCheck,
    items: [
      {
        q: "En quoi Lettrup se distingue-t-il des autres créateurs de CV par IA ?",
        a: "La plupart des créateurs de CV par IA s'arrêtent une fois le CV généré. Lettrup est un copilote de carrière qui vous accompagne tout au long de votre recherche d'emploi : optimisation de votre CV et de votre profil LinkedIn, rapprochement avec les offres, préparation aux entretiens, lettres de motivation, suivi des candidatures et amélioration de chaque candidature envoyée."
      },
      {
        q: "À qui s'adresse Lettrup ?",
        a: "Lettrup s'adresse aux étudiants, aux jeunes diplômés, aux professionnels, aux indépendants et à toute personne qui souhaite décrocher des entretiens plus vite."
      },
      {
        q: "Les recruteurs peuvent-ils voir que j'ai utilisé l'IA ?",
        a: "Non. Les recruteurs reçoivent un CV professionnel et soigné, comme n'importe quel autre. Lettrup améliore votre contenu sans y ajouter la moindre mention de l'IA."
      }
    ]
  }
];

interface FAQSectionProps {
  /** Renders the light-themed variant (white/slate-on-light) used on the Accueil landing page. Defaults to the original dark theme used on Pricing and other pages. */
  light?: boolean;
}

export default function FAQSection({ light = false }: FAQSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>(DEFAULT_CATEGORY);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "0-0": true // Open first item by default
  });

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const categoriesToDisplay = activeCategory === "All"
    ? FAQ_CATEGORIES
    : FAQ_CATEGORIES.filter(cat => cat.category === activeCategory);

  return (
    <section id="faq" className={`py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t ${light ? 'border-tertiary/10' : 'border-white/10'}`}>
      <div className="text-center mb-12">
        <p className={`text-sm font-bold mb-3 ${light ? 'text-[#007568]' : 'text-amber-400'}`}>
          Questions fréquentes
        </p>
        <h2 className={`text-3xl sm:text-5xl font-black tracking-tight leading-[1.1] ${light ? 'text-tertiary' : 'text-white'}`}>
          Tout ce qu'il faut savoir
        </h2>
        <p className={`text-base mt-3 max-w-xl mx-auto ${light ? 'text-[#456071]' : 'text-slate-400'}`}>
          Des réponses claires pour tirer le meilleur de Lettrup.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors cursor-pointer ${
              activeCategory === "All"
                ? light
                  ? "bg-tertiary text-white"
                  : "bg-amber-500 text-slate-950"
                : light
                  ? "border border-tertiary/20 text-tertiary hover:border-tertiary"
                  : "bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            Toutes les questions
          </button>
          {FAQ_CATEGORIES.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat.category)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors cursor-pointer ${
                activeCategory === cat.category
                  ? light
                    ? "bg-tertiary text-white"
                    : "bg-amber-500 text-slate-950"
                  : light
                    ? "border border-tertiary/20 text-tertiary hover:border-tertiary"
                    : "bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List Grouped By Category */}
      <div className="space-y-8">
        {categoriesToDisplay.map((catGroup, groupIdx) => (
          <div key={groupIdx} className="space-y-3">
            {activeCategory === "All" && (
              <div className={`text-lg font-black pt-4 pb-1 border-b ${
                light ? 'text-tertiary border-tertiary/10' : 'text-amber-400 border-white/5'
              }`}>
                {catGroup.category}
              </div>
            )}

            <div className={`divide-y ${light ? 'divide-tertiary/10 border-y border-tertiary/10' : 'divide-white/10'}`}>
              {catGroup.items.map((item, itemIdx) => {
                const key = `${groupIdx}-${itemIdx}`;
                const isOpen = !!openItems[key];

                return (
                  <div key={itemIdx}>
                    <button
                      type="button"
                      onClick={() => toggleItem(key)}
                      aria-expanded={isOpen}
                      className={`w-full py-5 text-left flex items-center justify-between gap-4 font-bold text-base transition-colors cursor-pointer ${
                        light ? 'text-tertiary hover:text-[#007568]' : 'text-white hover:text-amber-400'
                      }`}
                    >
                      <span className="leading-snug">{item.q}</span>
                      <ChevronDown
                        size={20}
                        className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                          light ? 'text-[#007568]' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className={`pb-5 text-sm leading-relaxed max-w-3xl animate-fadeIn ${
                        light ? 'text-[#244354]' : 'text-slate-300'
                      }`}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
