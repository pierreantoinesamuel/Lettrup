export type CoverLetterCategoryKey =
  | 'all'
  | 'modern'
  | 'classic'
  | 'creative'
  | 'simple'
  | 'executive'
  | 'sector';

export interface CoverLetterTemplateInfo {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  previewColor: string;
  colors: [string, string, string];
  categories: Exclude<CoverLetterCategoryKey, 'all'>[];
  candidateName: string;
  candidateRole: string;
  email: string;
  phone: string;
  location: string;
  company: string;
  recruiter: string;
  paragraphs: [string, string, string];
  tier: 'free' | 'pro' | 'premium';
}

const templates: CoverLetterTemplateInfo[] = [
  {
    id: 'candidature-spontanee',
    name: 'Spontaneous Application',
    nameFr: 'Candidature Spontanée',
    description: 'Clean layout with left title and right contact details.',
    descriptionFr: 'Mise en page épurée avec titre à gauche et coordonnées à droite.',
    previewColor: '#2563eb',
    colors: ['#2563eb', '#0f766e', '#4f46e5'],
    categories: ['modern', 'simple'],
    candidateName: 'Manon Cochet',
    candidateRole: 'Chargée de Communication Digitale',
    email: 'manon.cochet@email.fr',
    phone: '06 18 42 91 05',
    location: 'Paris, France',
    company: 'Agence Havas Paris',
    recruiter: 'Mme Claire Vallet, Directrice de la Communication',
    paragraphs: [
      'Passionnée par les stratégies de marque et l’écosystème social media, je suis avec grand intérêt les campagnes créatives menées par Havas Paris.Forte de 5 années d’expérience en pilotage éditorial et gestion de campagnes 360°, je souhaite vous proposer ma candidature.',
      'Au cours de ma mission chez Publicis Conseil, j’ai coordonné le lancement digital de 12 comptes grands groupes, générant une hausse moyenne de +42 % d’engagement organique et une optimisation durable des coûts d’acquisition.',
      'Créative, rigoureuse et habituée au travail en équipe pluridisciplinaire, je serais ravie de contribuer au rayonnement de vos prochains budgets clients lors d’un entretien à votre convenance.'
    ],
    tier: 'free'
  },
  {
    id: 'artistique',
    name: 'Artistic & Creative',
    nameFr: 'Artistique & Créatif',
    description: 'Centered elegant serif header with refined blue accents.',
    descriptionFr: 'En-tête centré raffiné avec typographie serif et accents bleus.',
    previewColor: '#0284c7',
    colors: ['#0284c7', '#7c3aed', '#db2777'],
    categories: ['creative', 'modern'],
    candidateName: 'Julien Armand',
    candidateRole: 'Directeur Artistique Senior',
    email: 'julien.armand@studio.fr',
    phone: '06 45 78 12 39',
    location: 'Lyon, France',
    company: 'Studio Lumières & Associés',
    recruiter: 'M. Laurent Delacroix, Directeur de Création',
    paragraphs: [
      'Votre approche singulière du design éditorial et des identités visuelles de luxe résonne pleinement avec ma vision de la direction artistique. Diplômé des Arts Décoratifs, j’accompagne depuis 7 ans des maisons exigeantes dans leur territoire de marque.',
      'Chez Atelier Novembre, j’ai dirigé la refonte graphique de 15 marques internationales, de la conception typographique jusqu’à la supervision des shootings et du motion design, remportant deux distinctions au Club des Directeurs Artistiques.',
      'Convaincu que la justesse esthétique naît du dialogue entre audace visuelle et précision stratégique, je souhaiterais vous présenter mon portfolio lors d’une prochaine rencontre.'
    ],
    tier: 'free'
  },
  {
    id: 'assistant-dentaire',
    name: 'Dental / Healthcare',
    nameFr: 'Assistant Dentaire & Santé',
    description: 'Sleek top slate-blue banner for clinical professions.',
    descriptionFr: 'Grand bandeau supérieur bleu ardoise pour métiers de santé.',
    previewColor: '#0f172a',
    colors: ['#0f172a', '#0369a1', '#0f766e'],
    categories: ['sector', 'classic'],
    candidateName: 'Georges Costa',
    candidateRole: 'Assistant Dentaire Qualifié CNQAOS',
    email: 'g.costa.sante@email.fr',
    phone: '06 23 89 54 17',
    location: 'Bordeaux, France',
    company: 'Centre Dentaire Parc Bordelais',
    recruiter: 'Dr. Sophie Marchand, Chirurgien-Dentiste',
    paragraphs: [
      'Titulaire du titre d’Assistant Dentaire qualifié et fort de 4 ans d’exercice en cabinet d’implantologie et d’orthodontie, je vous adresse ma candidature pour rejoindre l’équipe clinique du Centre Dentaire Parc Bordelais.',
      'Maîtrisant parfaitement l’assistance au fauteuil à quatre mains, les protocoles d’asepsie et de stérilisation ainsi que la gestion des dossiers patients sur Julie et Logos_w, je veille chaque jour à instaurer un climat rassurant pour les patients.',
      'Mon sens de l’organisation et ma réactivité au bloc opératoire me permettront d’être immédiatement opérationnel au sein de votre structure.'
    ],
    tier: 'free'
  },
  {
    id: 'assistant-administratif',
    name: 'Administrative Assistant',
    nameFr: 'Assistant Administratif',
    description: 'Classic professional layout with clean rule divider.',
    descriptionFr: 'Structure classique professionnelle avec ligne séparatrice.',
    previewColor: '#475569',
    colors: ['#475569', '#1e40af', '#0f766e'],
    categories: ['classic', 'simple'],
    candidateName: 'Jean Dufour',
    candidateRole: 'Assistant Administratif & Gestion',
    email: 'jean.dufour@email.fr',
    phone: '06 71 34 88 20',
    location: 'Nantes, France',
    company: 'Cabinet Horizon Conseil',
    recruiter: 'Service des Ressources Humaines',
    paragraphs: [
      'Fort de 6 années d’expérience en gestion administrative et coordination d’agendas complexes, je souhaite mettre ma rigueur et mon sens du service à profit au sein du Cabinet Horizon Conseil.',
      'Lors de mon poste chez Groupe Novalis, j’ai assuré le suivi de la facturation fournisseurs, la préparation des dossiers d’appels d’offres et la digitalisation des archives, réduisant de 30 % les délais de traitement documentaire.',
      'Parfaitement autonome sur la suite Microsoft 365, SAP et les outils collaboratifs, je me tiens à votre disposition pour échanger sur ma future contribution.'
    ],
    tier: 'free'
  },
  {
    id: 'infirmiere',
    name: 'Healthcare & Nursing',
    nameFr: 'Infirmière & Soignant',
    description: 'Centered bold header with clear dividing rule lines.',
    descriptionFr: 'Titre centré en gras avec lignes de séparation équilibrées.',
    previewColor: '#10b981',
    colors: ['#10b981', '#0284c7', '#0d9488'],
    categories: ['sector', 'classic'],
    candidateName: 'Camille Arnaud',
    candidateRole: 'Infirmière Diplômée d’État (IDE)',
    email: 'camille.arnaud.ide@email.fr',
    phone: '06 54 19 63 82',
    location: 'Toulouse, France',
    company: 'Clinique Pasteur Toulouse',
    recruiter: 'Mme Nathalie Garnier, Cadre de Santé',
    paragraphs: [
      'Infirmière Diplômée d’État depuis 5 ans avec une solide expérience en service de médecine interne et soins continus, je souhaite intégrer le pôle médico-chirurgical de la Clinique Pasteur.',
      'Au CHU de Toulouse, j’ai développé une expertise pointue dans l’administration des thérapeutiques complexes, la surveillance post-opératoire, l’éducation thérapeutique des patients et la coordination des transmissions ciblées.',
      'Reconnu pour mon écoute bienveillante, mon sang-froid face aux situations d’urgence et mon esprit d’équipe, je serais honorée de participer à l’excellence des soins de votre établissement.'
    ],
    tier: 'free'
  },
  {
    id: 'police',
    name: 'Police & Security',
    nameFr: 'Police & Sécurité',
    description: 'Minimalist cyan accent header bringing authority.',
    descriptionFr: 'En-tête épuré avec accents bleu-vert apportant autorité.',
    previewColor: '#0891b2',
    colors: ['#0891b2', '#1d4ed8', '#334155'],
    categories: ['sector', 'modern'],
    candidateName: 'Thomas Ouakrim',
    candidateRole: 'Responsable Sûreté & Sécurité Site',
    email: 'thomas.ouakrim@email.fr',
    phone: '06 82 40 15 93',
    location: 'Marseille, France',
    company: 'Thalès Alenia Space',
    recruiter: 'Direction de la Sûreté Industrielle',
    paragraphs: [
      'Titulaire du SSIAP 3 et fort de 8 ans d’expérience dans la protection de sites sensibles et le management d’équipes de sécurité, je vous présente ma candidature au poste de Responsable Sûreté.',
      'Ayant supervisé une équipe de 25 agents sur un site industriel classé SEVESO, j’ai piloté les audits de conformité réglementaire, les plans de prévention des risques et la gestion de crise en lien direct avec les autorités.',
      'Intègre, méthodique et doté d’un leadership opérationnel éprouvé, je suis prêt à garantir la sécurité des personnes et des infrastructures de votre site.'
    ],
    tier: 'free'
  },
  {
    id: 'cadre-dirigeant',
    name: 'Executive Director',
    nameFr: 'Cadre Dirigeant',
    description: 'Formal serif executive header for management positions.',
    descriptionFr: 'Présentation exécutive avec détails ambre pour dirigeants.',
    previewColor: '#334155',
    colors: ['#334155', '#1e293b', '#78350f'],
    categories: ['executive', 'classic'],
    candidateName: 'Adrien Hamel',
    candidateRole: 'Directeur des Opérations (COO)',
    email: 'adrien.hamel@exec-mail.fr',
    phone: '06 11 94 27 60',
    location: 'Paris, France',
    company: 'Groupe Schneider Electric',
    recruiter: 'M. Marc-Antoine Lemaire, Directeur Général',
    paragraphs: [
      'Fort de 14 années de direction opérationnelle au sein d’ETI industrielles et technologiques, j’ai accompagné avec succès des plans de transformation d’envergure internationale et de croissance rentable.',
      'En tant que Directeur des Opérations chez Daher, j’ai piloté un P&L de 85 M€ et 340 collaborateurs, améliorant l’EBITDA de +4,5 points en 24 mois grâce à la refonte Lean de la supply chain et la digitalisation des flux.',
      'Partageant votre ambition d’excellence opérationnelle et de décarbonation industrielle, je serais ravi d’échanger sur les leviers de performance que nous pourrions activer ensemble.'
    ],
    tier: 'free'
  },
  {
    id: 'association',
    name: 'NGO & Community',
    nameFr: 'Association & Social',
    description: 'Header with soft box accent for community roles.',
    descriptionFr: 'En-tête encadré doux adapté au secteur associatif.',
    previewColor: '#d97706',
    colors: ['#d97706', '#059669', '#0284c7'],
    categories: ['sector', 'creative'],
    candidateName: 'Véronique Rameau',
    candidateRole: 'Coordinatrice de Projets Associatifs',
    email: 'veronique.rameau@asso.fr',
    phone: '06 39 51 74 28',
    location: 'Lille, France',
    company: 'Fondation Solidarités Nouvelles',
    recruiter: 'Mme Hélène Courtois, Directrice Générale',
    paragraphs: [
      'Engagée depuis 8 ans dans l’économie sociale et solidaire, je suis profondément attachée aux actions d’insertion professionnelle et de cohésion territoriale portées par votre fondation.',
      'Au sein d’Emmaüs Connect, j’ai coordonné le déploiement de 14 programmes d’inclusion numérique sur la métropole lilloise, mobilisant 120 bénévoles et sécurisant 420 k€ de financements publics et mécénat privé.',
      'Fédératrice, organisée et animée par l’impact social mesurable, je souhaite mettre mon énergie au service de vos bénéficiaires et partenaires.'
    ],
    tier: 'free'
  },
  {
    id: 'secretaire',
    name: 'Secretary & Reception',
    nameFr: 'Secrétaire & Accueil',
    description: 'Centered serif header with decorative divider motif.',
    descriptionFr: 'Centré élégant avec motif décoratif pour l\'accueil.',
    previewColor: '#7c3aed',
    colors: ['#7c3aed', '#2563eb', '#db2777'],
    categories: ['classic', 'simple'],
    candidateName: 'Clémence Laurent',
    candidateRole: 'Assistante de Direction Bilingue',
    email: 'clemence.laurent@email.fr',
    phone: '06 62 08 45 19',
    location: 'Lyon, France',
    company: 'Groupe Accor Prestige',
    recruiter: 'Direction des Ressources Humaines',
    paragraphs: [
      'Véritable point d’ancrage organisationnel d’une direction générale, j’exerce depuis 6 ans la fonction d’Assistante de Direction Bilingue (Français/Anglais C1) dans des environnements exigeants.',
      'Experte dans la gestion des déplacements internationaux, l’organisation de comités exécutifs, l’accueil de délégations VIP et la rédaction de comptes rendus stratégiques, je garantis fluidité et confidentialité.',
      'Mon sens de la représentation et ma proactivité seront des atouts immédiats pour accompagner votre comité de direction.'
    ],
    tier: 'free'
  },
  {
    id: 'audacieux-spontanee',
    name: 'Bold & Direct',
    nameFr: 'Audacieux & Direct',
    description: 'High-impact heavy crimson uppercase header.',
    descriptionFr: 'Titre imposant rouge majuscule pour poser son style.',
    previewColor: '#dc2626',
    colors: ['#dc2626', '#ea580c', '#2563eb'],
    categories: ['creative', 'modern'],
    candidateName: 'Déborah Vautier',
    candidateRole: 'Senior Account Executive B2B',
    email: 'deborah.vautier@sales.fr',
    phone: '06 91 27 64 03',
    location: 'Paris, France',
    company: 'Doctolib France',
    recruiter: 'M. Maxime Renaud, VP Sales France',
    paragraphs: [
      'Accélérer l’adoption de solutions SaaS à fort impact est ce qui m’anime au quotidien. Suivant l’hypercroissance de Doctolib, je vous propose ma candidature au poste de Senior Account Executive.',
      'Chez PayFit pendant 4 ans, j’ai dépassé mes objectifs annuels à 128 % de moyenne en signant plus de 90 comptes Mid-Market et en structurant une approche consultative basée sur la méthode MEDDPICC.',
      'Tenace, orientée résultats et passionnée par la négociation grands comptes, je suis prête à relever vos prochains défis commerciaux dès ce trimestre.'
    ],
    tier: 'free'
  },
  {
    id: 'corporate-slate',
    name: 'Corporate Slate',
    nameFr: 'Corporate Ardoise',
    description: 'Dual-tone top band layout tailored for companies.',
    descriptionFr: 'Bandeau bicolore supérieur structuré pour entreprises.',
    previewColor: '#1e293b',
    colors: ['#1e293b', '#0f172a', '#1e3a8a'],
    categories: ['modern', 'executive'],
    candidateName: 'Sophie Lavitry',
    candidateRole: 'Consultante Senior Transformation',
    email: 'sophie.lavitry@conseil.fr',
    phone: '06 14 83 59 22',
    location: 'Paris La Défense',
    company: 'Capgemini Invent',
    recruiter: 'Mme Élodie Chazal, Partner Practice Finance',
    paragraphs: [
      'Diplômée d’HEC Paris et forte de 6 ans d’expérience en conseil en stratégie et transformation digitale, je souhaite rejoindre la practice Finance & Risk de Capgemini Invent.',
      'J’ai piloté plus de 10 missions de cadrage stratégique, d’intégration post-acquisition (PMI) et de refonte de modèles opérationnels pour des institutions bancaires du CAC 40, encadrant jusqu’à 5 consultants juniors.',
      'Alliant rigueur analytique, sens politique et capacité à embarquer les équipes clientes, je serais ravie d’échanger avec vous sur mes réalisations.'
    ],
    tier: 'free'
  },
  {
    id: 'classique-chic',
    name: 'Classic Chic',
    nameFr: 'Classique Chic',
    description: 'Traditional centered layout with elegant typography.',
    descriptionFr: 'Mise en page traditionnelle centrée à typographie classique.',
    previewColor: '#b45309',
    colors: ['#b45309', '#475569', '#1e293b'],
    categories: ['classic', 'executive'],
    candidateName: 'Dominique Bailly',
    candidateRole: 'Juriste Droit des Affaires & Contrats',
    email: 'd.bailly.juriste@email.fr',
    phone: '06 77 35 10 48',
    location: 'Paris, France',
    company: 'Cabinet Bredin Prat',
    recruiter: 'Maître Henri de Vaucleroy, Associé Gérant',
    paragraphs: [
      'Titulaire du Master 2 Droit des Affaires de Paris II Panthéon-Assas et du CAPA, j’ai l’honneur de vous soumettre ma candidature afin de rejoindre votre département Corporate & M&A.',
      'Au cours de mes quatre années d’exercice, j’ai rédigé et négocié des pactes d’actionnaires, contrats de cession d’actifs et audits d’acquisition pour des opérations transfrontalières de premier plan.',
      'Ma précision rédactionnelle, ma maîtrise de l’anglais juridique et ma capacité de travail soutenue me permettront de répondre aux standards d’exigence de votre cabinet.'
    ],
    tier: 'free'
  },
  {
    id: 'date-badge-classic',
    name: 'Date Badge Classic',
    nameFr: 'Classique avec date',
    description: 'Centered recipient block with a compact date badge.',
    descriptionFr: 'Bloc destinataire centré avec badge de date discret.',
    previewColor: '#7c5f52',
    colors: ['#7c5f52', '#57534e', '#0f766e'],
    categories: ['classic', 'simple'],
    candidateName: 'Lucas Moreau',
    candidateRole: 'Comptable Général & Fiscal',
    email: 'lucas.moreau.compta@email.fr',
    phone: '06 28 94 61 07',
    location: 'Rennes, France',
    company: 'KPMG France',
    recruiter: 'Direction du Recrutement Expertise Comptable',
    paragraphs: [
      'Titulaire du DSCG et fort de 5 années d’expérience en cabinet d’expertise comptable, je vous adresse ma candidature pour le poste de Comptable Général confirmé au bureau de Rennes.',
      'En charge d’un portefeuille de 35 PME, j’assure la révision des comptes, l’établissement des bilans, liasses fiscales et déclarations de TVA sur Sage 100, Cegid Loop et Excel avancé (TCD, PowerQuery).',
      'Méthodique, fiable et apprécié des dirigeants pour la clarté de mes conseils de gestion, je serais ravi de contribuer à la croissance de votre pôle.'
    ],
    tier: 'free'
  },
  {
    id: 'blue-rule-modern',
    name: 'Blue Rule Modern',
    nameFr: 'Ligne bleue moderne',
    description: 'Minimal top identity with a strong blue divider.',
    descriptionFr: 'Identité minimale avec séparateur bleu net.',
    previewColor: '#2563eb',
    colors: ['#2563eb', '#0891b2', '#4f46e5'],
    categories: ['modern', 'simple'],
    candidateName: 'Émilie Garnier',
    candidateRole: 'Ingénieure Full-Stack TypeScript / React',
    email: 'emilie.garnier@dev.io',
    phone: '06 53 12 87 44',
    location: 'Paris, France',
    company: 'Qonto',
    recruiter: 'M. Nicolas Mercier, Engineering Manager',
    paragraphs: [
      'Passionnée par l’architecture logicielle résiliente et l’expérience développeur, je souhaite rejoindre les équipes produit de Qonto en tant qu’Ingénieure Full-Stack Senior.',
      'Chez Alan, j’ai conçu et maintenu des microservices critiques en TypeScript, React et Node.js servant plus de 500 000 utilisateurs, tout en réduisant le temps de chargement initial de 38 %.',
      'Attachée à la qualité du code, aux tests automatisés et à la culture produit, je serais ravie d’échanger autour de vos enjeux techniques lors d’un entretien.'
    ],
    tier: 'free'
  },
  {
    id: 'left-blue-rail',
    name: 'Left Blue Rail',
    nameFr: 'Barre bleue latérale',
    description: 'Left vertical rail with a compact professional layout.',
    descriptionFr: 'Barre verticale à gauche avec composition professionnelle.',
    previewColor: '#2f80ed',
    colors: ['#2f80ed', '#0d9488', '#1e40af'],
    categories: ['modern', 'classic'],
    candidateName: 'Nicolas Mercier',
    candidateRole: 'Chef de Projet IT & Scrum Master',
    email: 'nicolas.mercier@pmo.fr',
    phone: '06 49 70 23 11',
    location: 'Lyon, France',
    company: 'Sopra Steria',
    recruiter: 'Direction de Pôle Transformation Digitale',
    paragraphs: [
      'Certifié PMP® et Professional Scrum Master (PSM II), je pilote depuis 7 ans des projets applicatifs complexes en environnement Agile à l’échelle (SAFe).',
      'J’ai récemment conduit la refonte du portail client d’un grand groupe énergétique (budget 2,4 M€, équipe de 18 développeurs et QA), livré dans les délais avec un score de satisfaction métier de 4,8/5.',
      'Facilitateur engagé et garant de la maîtrise des risques projet, je souhaite accompagner vos clients grands comptes dans leurs programmes stratégiques.'
    ],
    tier: 'free'
  },
  {
    id: 'elegant-gray-serif',
    name: 'Elegant Gray Serif',
    nameFr: 'Élégant gris serif',
    description: 'Quiet editorial serif header with generous spacing.',
    descriptionFr: 'En-tête serif éditorial avec respiration généreuse.',
    previewColor: '#6b7280',
    colors: ['#6b7280', '#374151', '#78350f'],
    categories: ['classic', 'simple'],
    candidateName: 'Hélène Marceau',
    candidateRole: 'Responsable Éditoriale & Contenus',
    email: 'helene.marceau@edition.fr',
    phone: '06 19 85 32 76',
    location: 'Paris, France',
    company: 'Éditions Gallimard',
    recruiter: 'Direction Littéraire & Numérique',
    paragraphs: [
      'Amoureuse de la langue française et spécialiste des stratégies éditoriales transmédias, j’accompagne depuis 8 ans des maisons d’édition et institutions culturelles dans la valorisation de leur fonds.',
      'J’ai dirigé la programmation éditoriale, la coordination des auteurs et le lancement de 45 ouvrages et podcasts littéraires, fédérant une communauté fidèle de plus de 180 000 lecteurs.',
      'Alliant exigence littéraire, sens critique et maîtrise de la chaîne du livre, je serais honorée de mettre ma plume et mon regard au service de votre maison.'
    ],
    tier: 'free'
  },
  {
    id: 'executive-two-column',
    name: 'Executive Two Column',
    nameFr: 'Dirigeant deux colonnes',
    description: 'Executive split layout with recipient details on the side.',
    descriptionFr: 'Mise en page dirigeant avec coordonnées en colonne.',
    previewColor: '#4b5563',
    colors: ['#4b5563', '#1e293b', '#0f766e'],
    categories: ['executive', 'classic'],
    candidateName: 'Philippe Delacroix',
    candidateRole: 'Directeur Administratif et Financier (DAF)',
    email: 'p.delacroix@finance-exec.fr',
    phone: '06 08 42 79 35',
    location: 'Paris, France',
    company: 'Groupe Véolia',
    recruiter: 'Direction Générale Groupe',
    paragraphs: [
      'Fort de 15 ans d’expérience en direction financière internationale, j’accompagne les comités exécutifs dans le pilotage de la performance, le financement de la croissance et les opérations de haut de bilan.',
      'Au sein d’un groupe industriel de 220 M€ de chiffre d’affaires, j’ai structuré le contrôle de gestion groupe, mené trois acquisitions stratégiques et optimisé le besoin en fonds de roulement de 18 M€.',
      'Partenaire stratégique exigeant et fédérateur pour les équipes financières, je me tiens à votre disposition pour un entretien confidentiel.'
    ],
    tier: 'free'
  },
  {
    id: 'formal-blue-sidebar',
    name: 'Formal Blue Sidebar',
    nameFr: 'Formel colonne bleue',
    description: 'Blue accent side panel for formal applications.',
    descriptionFr: 'Colonne bleue pour candidatures formelles.',
    previewColor: '#1d4ed8',
    colors: ['#1d4ed8', '#0369a1', '#334155'],
    categories: ['classic', 'modern'],
    candidateName: 'Antoine Lefèvre',
    candidateRole: 'Auditeur Financier Senior',
    email: 'antoine.lefevre@audit.fr',
    phone: '06 33 61 98 40',
    location: 'Paris La Défense',
    company: 'Deloitte France',
    recruiter: 'Département Audit & Assurance Grands Comptes',
    paragraphs: [
      'Diplômé d’Audencia Business School et fort de 4 saisons d’audit légal et contractuel sur des groupes cotés (normes IFRS et French GAAP), je souhaite rejoindre Deloitte en tant qu’Auditeur Senior.',
      'Habitué à encadrer des équipes de 2 à 4 collaborateurs sur le terrain, j’ai conduit la revue du contrôle interne, les travaux de clôture consolidée et la rédaction des synthèses destinées aux comités d’audit.',
      'Rigoureux, curieux et doté d’un excellent relationnel client, je suis prêt à m’investir pleinement dès la prochaine campagne d’audit.'
    ],
    tier: 'free'
  },
  {
    id: 'aqua-header',
    name: 'Aqua Header',
    nameFr: 'Bandeau aqua',
    description: 'Fresh cyan header with clean contact hierarchy.',
    descriptionFr: 'Bandeau cyan frais avec contacts bien hiérarchisés.',
    previewColor: '#06b6d4',
    colors: ['#06b6d4', '#0d9488', '#2563eb'],
    categories: ['modern', 'creative'],
    candidateName: 'Inès Benali',
    candidateRole: 'Lead Product Designer UX/UI',
    email: 'ines.benali@uxdesign.fr',
    phone: '06 74 20 58 91',
    location: 'Paris, France',
    company: 'BlaBlaCar',
    recruiter: 'Mme Sarah Lenoir, VP of Product Design',
    paragraphs: [
      'Concevoir des expériences mobiles intuitives utilisées par des millions de voyageurs est au cœur de mon métier de Product Designer depuis 6 ans.',
      'Chez ManoMano, j’ai piloté la refonte du tunnel de conversion mobile et co-construit le Design System Figma avec 12 designers et 30 développeurs, augmentant le taux de conversion de +14 %.',
      'Passionnée par la recherche utilisateur, le prototypage haute fidélité et l’accessibilité (RGAA), je serais ravie de vous présenter mes études de cas.'
    ],
    tier: 'free'
  },
  {
    id: 'salmon-accent',
    name: 'Salmon Accent',
    nameFr: 'Accent corail',
    description: 'Soft coral marks for warm professional letters.',
    descriptionFr: 'Touches corail douces pour une lettre chaleureuse.',
    previewColor: '#fb7185',
    colors: ['#fb7185', '#e11d48', '#d97706'],
    categories: ['creative', 'modern'],
    candidateName: 'Clara Fontaine',
    candidateRole: 'Responsable Ressources Humaines & Talent',
    email: 'clara.fontaine@rh-talent.fr',
    phone: '06 88 15 47 29',
    location: 'Bordeaux, France',
    company: 'Back Market',
    recruiter: 'Direction People & Culture',
    paragraphs: [
      'Convaincue que la performance d’une entreprise repose sur l’épanouissement de ses talents et une culture inclusive, je souhaite rejoindre l’équipe People de Back Market.',
      'Depuis 6 ans, j’accompagne des scale-ups technologiques sur le recrutement (80 recrutements/an), le développement managérial, la marque employeur et le dialogue social avec pragmatisme et écoute.',
      'Enthousiaste à l’idée de contribuer à votre mission d’économie circulaire, je me tiens disponible pour échanger sur vos enjeux RH actuels.'
    ],
    tier: 'free'
  },
  {
    id: 'minimal-black',
    name: 'Minimal Black',
    nameFr: 'Minimal noir',
    description: 'High-contrast black typography with strong whitespace.',
    descriptionFr: 'Typographie noire contrastée avec beaucoup d’espace.',
    previewColor: '#111827',
    colors: ['#111827', '#334155', '#0f766e'],
    categories: ['simple', 'modern'],
    candidateName: 'Maxime Chevalier',
    candidateRole: 'Senior Product Manager',
    email: 'maxime.chevalier@product.io',
    phone: '06 41 93 06 52',
    location: 'Paris, France',
    company: 'Contentsquare',
    recruiter: 'M. Thomas Mercier, Chief Product Officer',
    paragraphs: [
      'Transformer des données comportementales complexes en décisions produit simples et à fort ROI est le fil conducteur de mes 7 années en Product Management B2B SaaS.',
      'Chez Mirakl, j’ai dirigé la roadmap de la suite analytique marchands (ARR 18 M€), alignant 3 squads engineering/design et générant une adoption de 78 % dès le premier trimestre suivant le lancement.',
      'Orienté impact, rigoureux dans la discovery et le suivi des OKRs, je serais ravi d’échanger sur la vision produit de Contentsquare.'
    ],
    tier: 'free'
  },
  {
    id: 'green-side-panel',
    name: 'Green Side Panel',
    nameFr: 'Panneau vert latéral',
    description: 'Dark green side panel for distinctive applications.',
    descriptionFr: 'Panneau vert foncé pour candidatures distinctives.',
    previewColor: '#14532d',
    colors: ['#14532d', '#0f766e', '#1e3a8a'],
    categories: ['sector', 'executive'],
    candidateName: 'Arthur Vasseur',
    candidateRole: 'Responsable RSE & Transition Bas-Carbone',
    email: 'arthur.vasseur@rse-climat.fr',
    phone: '06 59 38 71 04',
    location: 'Nantes, France',
    company: 'Groupe Danone',
    recruiter: 'Direction Développement Durable & Impact',
    paragraphs: [
      'Ingénieur agronome spécialisé en stratégie climat et reporting extra-financier (CSRD, Bilan Carbone®, SBTi), je souhaite accompagner la trajectoire de décarbonation du Groupe Danone.',
      'Depuis 5 ans en cabinet de conseil environnemental, j’ai piloté les feuilles de route climat Scope 1, 2 et 3 de 12 acteurs agroalimentaires et formé plus de 400 cadres aux enjeux de transition écologique.',
      'Pragmatique et habitué à travailler avec les équipes achats et industrielles, je serais honoré de contribuer à vos engagements environnementaux.'
    ],
    tier: 'free'
  },
  {
    id: 'beige-editorial',
    name: 'Beige Editorial',
    nameFr: 'Éditorial beige',
    description: 'Warm editorial letter with delicate beige accents.',
    descriptionFr: 'Lettre éditoriale chaleureuse avec accents beiges.',
    previewColor: '#a16207',
    colors: ['#a16207', '#78350f', '#475569'],
    categories: ['creative', 'classic'],
    candidateName: 'Léa Marchand',
    candidateRole: 'Chef de Produit Marketing Luxe',
    email: 'lea.marchand@luxe-mktg.fr',
    phone: '06 26 74 89 15',
    location: 'Paris, France',
    company: 'Maison Diptyque Paris',
    recruiter: 'Direction Marketing International',
    paragraphs: [
      'Sensible à l’art du parfum, au savoir-faire artisanal et à la poésie visuelle de la Maison Diptyque, je vous présente ma candidature au poste de Chef de Produit Marketing International.',
      'Au sein de L’Oréal Luxe pendant 4 ans, j’ai piloté le développement de collections parfum et soin (du brief olfactif et packaging jusqu’au plan trade 360°), générant une croissance sell-out de +22 % en Europe.',
      'Alliant sensibilité esthétique, finesse d’analyse marché et rigueur opérationnelle, je serais ravie de contribuer au rayonnement de vos prochaines créations.'
    ],
    tier: 'free'
  },
  {
    id: 'thin-line-formal',
    name: 'Thin Line Formal',
    nameFr: 'Formel ligne fine',
    description: 'Very sober layout with precise rule lines.',
    descriptionFr: 'Mise en page très sobre avec lignes fines précises.',
    previewColor: '#64748b',
    colors: ['#64748b', '#1e293b', '#2563eb'],
    categories: ['simple', 'classic'],
    candidateName: 'Sébastien Girard',
    candidateRole: 'Contrôleur de Gestion Industriel',
    email: 'sebastien.girard@finance.fr',
    phone: '06 67 49 12 83',
    location: 'Lyon, France',
    company: 'BioMérieux',
    recruiter: 'Direction du Contrôle Financier Industriel',
    paragraphs: [
      'Fort de 6 années d’expérience en contrôle de gestion industriel au sein de groupes pharmaceutiques, je souhaite rejoindre les équipes financières de BioMérieux sur votre site de Marcy-l’Étoile.',
      'Expert en calcul des coûts de revient standards, suivi des écarts de production, clôtures mensuelles SAP CO/FI et construction budgétaire sous Power BI, j’accompagne les directeurs d’usine au quotidien.',
      'Rigoureux, synthétique et orienté amélioration continue, je me tiens à votre entière disposition pour vous détailler mon parcours lors d’un entretien.'
    ],
    tier: 'free'
  }
];

export function getAllCoverLetterTemplates(): CoverLetterTemplateInfo[] {
  return templates;
}

export function canAccessCoverLetterTemplate(templateId: string, userPlan: string): boolean {
  const tpl = templates.find(t => t.id === templateId);
  if (!tpl) return true;
  if (tpl.tier === 'free') return true;
  if (tpl.tier === 'pro' && (userPlan === 'pro' || userPlan === 'premium')) return true;
  if (tpl.tier === 'premium' && userPlan === 'premium') return true;
  return true;
}
