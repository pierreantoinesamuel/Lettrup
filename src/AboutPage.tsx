import React from 'react';
import { Link } from 'react-router-dom';
import Footer from './components/Footer';
import logoIcon from './assets/logo-icon.png';
import { usePageSEO } from './hooks/usePageSEO';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  usePageSEO({
    title: 'À propos — Lettrup',
    description: "L'histoire derrière Lettrup et comment nous transformons les parcours professionnels.",
    canonicalPath: '/a-propos',
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#007568] selection:text-white antialiased">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoIcon} alt="Lettrup" className="w-12 h-12 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">Lettrup</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">PRO</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              <span>Créer mon CV</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* L’histoire derrière Lettrup */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Rédiger un CV exige autant la sensibilité d’un art que la rigueur d’une science.
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Votre CV doit vous mettre en valeur avec le plus grand impact. Nos modèles et suggestions de rédaction s’appuient sur des conseils d’experts, des études de marché actualisées et les retours de nos utilisateurs. Si notre produit ne vous permet pas, à chaque fois, de présenter facilement votre parcours sous son meilleur jour, alors nous avons manqué à notre mission.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-slate-50 rounded-lg p-8 border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Notre mission</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Nous aidons chacun à atteindre les sommets de sa carrière et à nourrir ses ambitions grâce à des CV et des lettres de motivation rédigés avec expertise.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nous concevons des produits où le souci du détail rencontre l’émotion. Même nos articles de blog prennent vie grâce à des illustrations soignées et à des textes d’une grande clarté, signés par des auteurs talentueux.
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-8 border border-emerald-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Propulsé par l'IA</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Notre IA de pointe analyse votre parcours, vos compétences et vos aspirations, puis génère des formulations prêtes à l’emploi qui reflètent fidèlement votre personnalité et votre expertise uniques.
              </p>
            </div>
          </div>
        </section>

        {/* Études de Cas */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100 bg-slate-50 rounded-lg mb-20 mt-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Études de cas : des parcours transformés.
            </h2>
            <p className="text-sm text-slate-500 mt-4">
              Découvrez comment nos utilisateurs ont décroché leurs entretiens en optimisant leur profil avec Lettrup.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Parcours de personnes qui ont testé Lettrup pendant sa construction. Les prénoms ont été modifiés.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Cas 1 */}
            <div className="bg-white rounded-lg p-8 border border-slate-200 flex flex-col h-full relative">
              <div className="absolute -top-4 right-6 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Score ATS 34 ➔ 89
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-900 mb-1">Thomas, 38 ans</h3>
                <p className="text-xs font-bold text-tertiary">Commercial ➔ Product Owner</p>
              </div>
              
              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Le Problème</h4>
                  <p className="text-sm text-slate-600">CV 100% orienté ventes, aucun mot-clé tech. 0 entretien en 4 mois malgré 60 candidatures.</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Notre Action</h4>
                  <p className="text-sm text-slate-600">Transformation des missions en réalisations produit. Exemple : "Pilotage de 3 projets de refonte avec 12 clients clés — adoption +45%".</p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-emerald-600 mb-1">Résultat</h4>
                  <p className="text-sm font-bold text-slate-900">5 entretiens en 3 semaines, 2 offres.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 italic text-xs text-slate-600 border border-slate-100">
                « Je ne savais pas que mon CV était filtré avant d'être lu. L'outil m'a montré exactement ce qui manquait. »
              </div>
            </div>

            {/* Cas 2 */}
            <div className="bg-white rounded-lg p-8 border border-slate-200 flex flex-col h-full relative">
              <div className="absolute -top-4 right-6 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Score ATS 28 ➔ 91
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-900 mb-1">Léa, 23 ans</h3>
                <p className="text-xs font-bold text-tertiary">Jeune diplômée Marketing</p>
              </div>
              
              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Le Problème</h4>
                  <p className="text-sm text-slate-600">Seulement 6 mois d'expérience, CV noyé dans la masse. 1 entretien en 6 mois.</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Notre Action</h4>
                  <p className="text-sm text-slate-600">Extraction des compétences depuis ses projets universitaires (SEO, A/B testing) et création d'un portfolio web intégré.</p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-emerald-600 mb-1">Résultat</h4>
                  <p className="text-sm font-bold text-slate-900">3 entretiens en 10 jours, 1 offre en scale-up.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 italic text-xs text-slate-600 border border-slate-100">
                « Le portfolio a tout changé. Un recruteur avait cliqué sur mon lien avant même de lire mon CV. »
              </div>
            </div>

            {/* Cas 3 */}
            <div className="bg-white rounded-lg p-8 border border-slate-200 flex flex-col h-full relative">
              <div className="absolute -top-4 right-6 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Score ATS 41 ➔ 88
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-900 mb-1">Karim, 32 ans</h3>
                <p className="text-xs font-bold text-tertiary">Finance ➔ Data Analyst</p>
              </div>
              
              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Le Problème</h4>
                  <p className="text-sm text-slate-600">Compétences techniques présentes mais illisibles pour la tech. 0 entretien en 3 mois.</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Notre Action</h4>
                  <p className="text-sm text-slate-600">Traduction des missions en Data. Exemple : "Construction d'un dashboard Power BI — réduction du temps de reporting de 60%".</p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-emerald-600 mb-1">Résultat</h4>
                  <p className="text-sm font-bold text-slate-900">4 entretiens en 1 mois, 2 offres.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 italic text-xs text-slate-600 border border-slate-100">
                « J'avais les compétences mais pas le vocabulaire. L'IA m'a appris à parler le langage de la tech. »
              </div>
            </div>

          </div>
          <div className="text-center">
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95">
              <span>Je veux le même résultat</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Témoignages */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-100">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Ce que disent nos utilisateurs.
            </h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              Retours de personnes qui ont testé Lettrup pendant sa construction. Les prénoms ont été modifiés pour protéger leur vie privée.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-200">
              <div className="flex gap-1 text-amber-400">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <span className="text-sm font-bold text-amber-700">Témoignages clients</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* T1 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « Je pensais que mon CV était bon. En fait, il était invisible. Le score ATS m'a ouvert les yeux : j'étais à 38/100. Après la refonte, je suis passée à 91. J'ai décroché 3 entretiens en deux semaines, et une offre que j'ai acceptée. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">S</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Sarah Delaunay</div>
                  <div className="text-xs text-slate-500 tracking-wide">Directrice financière</div>
                  <div className="text-xs text-slate-400">Depuis mars 2025</div>
                </div>
              </div>
            </div>
            
            {/* T2 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « J'ai enfin compris comment vendre mon parcours. Après 12 ans dans le commercial, je voulais pivoter vers le product management. L'outil m'a aidé à traduire mes compétences et à parler le langage tech. Résultat : 5 entretiens en 3 semaines. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">T</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Thomas Renard</div>
                  <div className="text-xs text-slate-500 tracking-wide">Product Owner</div>
                  <div className="text-xs text-slate-400">Depuis janvier 2025</div>
                </div>
              </div>
            </div>

            {/* T3 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « Le simulateur d'entretien est brutalement efficace. J'ai eu l'impression de passer un vrai entretien avant le vrai. Les questions étaient exactement celles que j'ai eues en entretien. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">J</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Julie Moreau</div>
                  <div className="text-xs text-slate-500 tracking-wide">HR Business Partner</div>
                  <div className="text-xs text-slate-400">Depuis février 2025</div>
                </div>
              </div>
            </div>

            {/* T4 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « Le portfolio en ligne a fait la différence. Un recruteur m'a dit qu'il avait cliqué sur mon lien avant même de lire mon CV. C'est ce qui m'a permis de sortir du lot face à des profils plus expérimentés. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">K</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Karim Benali</div>
                  <div className="text-xs text-slate-500 tracking-wide">Data Analyst</div>
                  <div className="text-xs text-slate-400">Depuis avril 2025</div>
                </div>
              </div>
            </div>

            {/* T5 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « Je ne savais même pas que les ATS existaient. L'outil m'a montré exactement ce qui bloquait. J'ai franchi 5 processus ATS différents et reçu 2 offres. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">M</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Marc Lefebvre</div>
                  <div className="text-xs text-slate-500 tracking-wide">Chef de projet IT</div>
                  <div className="text-xs text-slate-400">Depuis mai 2025</div>
                </div>
              </div>
            </div>

            {/* T6 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « À 45 ans, je pensais que mon âge jouait contre moi. En fait, c'était mon positionnement. Lettrup m'a aidée à clarifier mon offre de consultante et à créer un portfolio qui parle aux clients. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">S</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Sophie Marchand</div>
                  <div className="text-xs text-slate-500 tracking-wide">Consultante Indépendante</div>
                  <div className="text-xs text-slate-400">Depuis juin 2025</div>
                </div>
              </div>
            </div>

            {/* T7 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « Je sortais d'un master avec 6 mois d'alternance. Grâce à l'analyse IA, j'ai découvert que mes projets universitaires valaient de l'or. J'ai décroché un poste en 10 jours. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">L</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Léa Dubois</div>
                  <div className="text-xs text-slate-500 tracking-wide">Chargée de marketing</div>
                  <div className="text-xs text-slate-400">Depuis mars 2025</div>
                </div>
              </div>
            </div>

            {/* T8 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col">
              <div className="text-tertiary/20 text-4xl absolute top-4 right-4 font-serif">"</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6 italic relative z-10 flex-1">
                « J'avais 60 candidatures et 0 entretien. Le diagnostic était clair : mon CV ne passait pas les filtres. Après optimisation, j'ai eu 4 entretiens en un mois. »
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">A</div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Antoine Girard</div>
                  <div className="text-xs text-slate-500 tracking-wide">Ingénieur logiciel</div>
                  <div className="text-xs text-slate-400">Depuis juillet 2025</div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto bg-primary-container/40 rounded-lg p-8 border border-primary-container mb-16">
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Ils ont décroché</h3>
            <p className="text-xs text-slate-500 mb-6 text-center">Prénoms modifiés pour protéger la vie privée des personnes.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm text-slate-700">
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Sarah D.</strong> (Directrice financière) ➔ 3 entretiens en 2 semaines</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Thomas R.</strong> (Product Owner) ➔ 5 entretiens en 3 semaines</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Julie M.</strong> (HR BP) ➔ reconversion réussie dans la tech</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Karim B.</strong> (Data Analyst) ➔ 4 entretiens en 1 mois</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Marc L.</strong> (Chef de projet IT) ➔ 5 ATS franchis, 2 offres</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Sophie M.</strong> (Consultante) ➔ 2 missions signées en 6 semaines</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Léa D.</strong> (Marketing digital) ➔ 1 poste en 10 jours</span></li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> <span><strong>Antoine G.</strong> (Ingénieur logiciel) ➔ 4 entretiens en 1 mois</span></li>
            </ul>
          </div>

          <div className="text-center mb-16">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Prêt à écrire votre propre histoire ?</h3>
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95">
              <span>Rejoindre les utilisateurs qui décrochent</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

      </main>

      <Footer light />
    </div>
  );
}
