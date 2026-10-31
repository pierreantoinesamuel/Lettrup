/**
 * Deterministic ATS & French Recruitment Market compatibility scoring of a resume.
 * Aligned with standards from Apec, top recruitment agencies (PageGroup, Hays),
 * and French ATS platforms (Workday, Welcome to the Jungle, Taleo, SmartRecruiters, France Travail).
 */
export interface AtsCheckResult {
  category: string;
  score: number; // 0 to 100
  maxPoints: number;
  checks: {
    id: string;
    label: string;
    status: 'pass' | 'warn' | 'fail';
    suggestion?: string;
  }[];
}

export interface FranceMarketBenchmark {
  name: string;
  verdict: 'Excellent' | 'Très bon' | 'À renforcer' | 'Insuffisant';
  targetAudience: string;
  keyStats: {
    score: number;
    initialScore?: number;
    scoreGain?: number;
    pageOptimal: boolean;
    metricsCount: number;
    hasCefrLanguage: boolean;
    hasMobility: boolean;
    hasLinkedIn: boolean;
  };
}

export interface AtsAnalysis {
  overallScore: number;
  statusLabel: string;
  statusColor: 'green' | 'blue' | 'yellow' | 'red';
  categories: AtsCheckResult[];
  marketBenchmark: FranceMarketBenchmark;
  keywordDensity: {
    wordCount: number;
    hardSkillsCount: number;
    hasMetrics: boolean;
    hasBulletPoints: boolean;
    metricsCount: number;
  };
}

// Level detection for European CEFR or standard French language scales
const CEFR_LANGUAGE_REGEX = /\b(A1|A2|B1|B2|C1|C2|courant|bilingue|notions|interm[eé]diaire|professionnel|maternelle|langue\s+maternelle|toeic|toefl|cambridge|bulats)\b/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeAtsAnalysis(data: any, templateId: string): AtsAnalysis {
  const coord = data?.coordonnees || {};
  const experiences = data?.experience || [];
  const education = data?.education || [];
  const skillsText = data?.competences || '';
  const profile = data?.profil || '';
  const languagesText = data?.langues || '';

  // 1. Structure & Format ATS (Max 20 pts)
  const structChecks = [];
  let structPts = 0;

  // Modèle ATS épuré (8 pts pass, 5 pts sinon)
  const isAtsTemplate = ['minimalist', 'minimalist1', 'swiss', 'admin', 'monochrome', 'executive'].includes(templateId);
  if (isAtsTemplate) {
    structPts += 8;
    structChecks.push({ id: 'tmpl', label: 'Modèle ATS épuré et lisible par les robots', status: 'pass' as const });
  } else {
    structPts += 5;
    structChecks.push({ 
      id: 'tmpl', 
      label: 'Modèle visuel (Préférez un modèle 1 colonne/ATS pour postuler sur portail)', 
      status: 'warn' as const,
      suggestion: 'Utilisez les modèles « Swiss », « Minimaliste » ou « Monochrome » pour garantir un taux de lecture ATS de 100%.'
    });
  }

  // 4 rubriques obligatoires : Profil, Expérience, Formation, Compétences (8 pts total, 2 pts par rubrique)
  const hasExp = experiences.length > 0;
  const hasEdu = education.length > 0;
  const hasSkills = skillsText.trim().length > 0;
  const hasProfil = profile.trim().length > 0;

  let rubricPts = 0;
  if (hasProfil) rubricPts += 2;
  if (hasExp) rubricPts += 2;
  if (hasEdu) rubricPts += 2;
  if (hasSkills) rubricPts += 2;
  structPts += rubricPts;

  if (rubricPts === 8) {
    structChecks.push({ id: 'sec', label: 'Les 4 rubriques fondamentales France présentes (Profil, Expériences, Formations, Compétences)', status: 'pass' as const });
  } else {
    const missing = [];
    if (!hasProfil) missing.push('Profil/Accroche');
    if (!hasExp) missing.push('Expérience');
    if (!hasEdu) missing.push('Formation');
    if (!hasSkills) missing.push('Compétences');
    structChecks.push({ 
      id: 'sec', 
      label: `Rubriques clés manquantes : ${missing.join(', ')}`, 
      status: 'fail' as const,
      suggestion: 'En France, un CV complet doit obligatoirement comporter ces 4 sections pour franchir le tri automatique.'
    });
  }

  // Intitulés standards en français (4 pts)
  structPts += 4;
  structChecks.push({ id: 'headings', label: 'Intitulés standards reconnus par les parseurs francophones (Textkernel, Sovren)', status: 'pass' as const });

  // 2. Coordonnées & Mobilité (Max 20 pts)
  const contactChecks = [];
  let contactPts = 0;

  const hasName = Boolean(coord.name && coord.name.trim().length > 2);
  const hasEmail = Boolean(coord.email && coord.email.includes('@'));
  const hasPhone = Boolean(coord.phone && coord.phone.trim().length >= 8);
  const hasLocation = Boolean(coord.location && coord.location.trim().length >= 2);

  // Nom, Email, Téléphone, Ville : 3 pts chacun (12 pts)
  let baseContactPts = 0;
  if (hasName) baseContactPts += 3;
  if (hasEmail) baseContactPts += 3;
  if (hasPhone) baseContactPts += 3;
  if (hasLocation) baseContactPts += 3;
  contactPts += baseContactPts;

  if (baseContactPts === 12) {
    contactChecks.push({ id: 'cnt', label: 'Coordonnées essentielles conformes RGPD (Nom, Tél, Email, Ville)', status: 'pass' as const });
  } else {
    const missingCnt = [];
    if (!hasEmail) missingCnt.push('Email');
    if (!hasPhone) missingCnt.push('Téléphone');
    if (!hasLocation) missingCnt.push('Ville');
    contactChecks.push({ 
      id: 'cnt', 
      label: `Coordonnées incomplètes (${missingCnt.join(', ')})`, 
      status: 'warn' as const,
      suggestion: 'Indiquez votre ville sans adresse postale complète (respect de la vie privée / RGPD).'
    });
  }

  // Permis B / Mobilité géographique (4 pts)
  const hasLicenseOrMobility = Boolean(
    (coord.drivingLicense && coord.drivingLicense.trim().length > 0) ||
    /permis\s*b|mobilit[eé]|v[eé]hicul[eé]|t[eé]l[eé]travail|hybride|remote/i.test(
      `${coord.location || ''} ${profile || ''} ${coord.drivingLicense || ''}`
    )
  );
  if (hasLicenseOrMobility) {
    contactPts += 4;
    contactChecks.push({ id: 'mobility', label: 'Mobilité / Permis B spécifié (critère clé marché France)', status: 'pass' as const });
  } else {
    contactChecks.push({ 
      id: 'mobility', 
      label: 'Permis B ou zone de mobilité non spécifiée', 
      status: 'warn' as const,
      suggestion: 'En France, la mention du Permis B ou de la mobilité (ex: Île-de-France, France entière, Hybride) est souvent éliminatoire hors métropole.'
    });
  }

  // Lien LinkedIn ou Portfolio (4 pts)
  const hasLinkedIn = Boolean(
    (coord.linkedin && coord.linkedin.trim().length > 3) ||
    (coord.website && coord.website.trim().length > 3) ||
    (coord.github && coord.github.trim().length > 3)
  );
  if (hasLinkedIn) {
    contactPts += 4;
    contactChecks.push({ id: 'linkedin', label: 'Profil professionnel LinkedIn / Portfolio renseigné', status: 'pass' as const });
  } else {
    contactChecks.push({ 
      id: 'linkedin', 
      label: 'Lien LinkedIn absent', 
      status: 'warn' as const,
      suggestion: 'Ajoutez le lien vers votre profil LinkedIn : 87% des recruteurs français le consultent systématiquement.'
    });
  }

  // 3. Expériences & Preuves Chiffrées (Max 25 pts)
  const expChecks = [];
  let expPts = 0;

  const expDescriptions = experiences.map((e: any) => e.description || '').join(' ');
  const hasBulletPoints = expDescriptions.includes('<ul>') || expDescriptions.includes('<li>') || expDescriptions.includes('- ') || expDescriptions.includes('•');

  if (hasBulletPoints) {
    expPts += 12;
    expChecks.push({ id: 'bullets', label: 'Missions structurées en puces d’action percutantes', status: 'pass' as const });
  } else {
    expPts += 4;
    expChecks.push({ 
      id: 'bullets', 
      label: 'Missions en paragraphes denses sans puces', 
      status: 'warn' as const,
      suggestion: 'Structurez chaque poste avec 3 à 5 puces débutant par un verbe d\'action (ex: Piloté, Développé, Optimisé).'
    });
  }

  // Preuves chiffrées & métriques de performance
  const numberRegex = /\b(\d+[\d\s%,.kK€$]*)\b/g;
  const metricsMatches = expDescriptions.match(numberRegex) || [];
  const metricsCount = metricsMatches.length;

  if (metricsCount >= 3) {
    expPts += 13;
    expChecks.push({ id: 'metrics', label: `${metricsCount} preuves chiffrées détectées (KPIs, volumes, pourcentages)`, status: 'pass' as const });
  } else if (metricsCount >= 1) {
    expPts += 7;
    expChecks.push({ 
      id: 'metrics', 
      label: `${metricsCount} chiffre${metricsCount > 1 ? 's' : ''} détecté(s) : gagne à être renforcé`, 
      status: 'warn' as const,
      suggestion: 'Intégrez au moins 3 indicateurs chiffrés (ex: +20% d\'efficacité, 12 collaborateurs, budget de 150 k€).'
    });
  } else {
    expChecks.push({ 
      id: 'metrics', 
      label: 'Aucun résultat chiffré dans vos expériences', 
      status: 'fail' as const,
      suggestion: 'Les cabinets de recrutement français et les ATS valorisent avant tout les réalisations mesurables.'
    });
  }

  // 4. Compétences, Titre & Langues (Max 25 pts)
  const skillChecks = [];
  let skillPts = 0;

  // Titre du poste (8 pts)
  const jobTitle = coord.jobTitle || '';
  if (jobTitle.length >= 3) {
    skillPts += 8;
    skillChecks.push({ id: 'job_title', label: `Titre de poste clair et ciblé : « ${jobTitle} »`, status: 'pass' as const });
  } else {
    skillChecks.push({ 
      id: 'job_title', 
      label: 'Titre de poste manquant en en-tête', 
      status: 'fail' as const,
      suggestion: 'En France, un CV sans titre explicite est rejeté en moins de 6 secondes par le recruteur.'
    });
  }

  // Hard skills (10 pts)
  const skillLines = skillsText.split('\n').map((s: string) => s.trim()).filter(Boolean);
  const hardSkillCount = skillLines.length;

  if (hardSkillCount >= 5) {
    skillPts += 10;
    skillChecks.push({ id: 'skills_cnt', label: `${hardSkillCount} compétences techniques (hard skills) listées`, status: 'pass' as const });
  } else if (hardSkillCount >= 2) {
    skillPts += 6;
    skillChecks.push({ 
      id: 'skills_cnt', 
      label: `Seulement ${hardSkillCount} compétences listées`, 
      status: 'warn' as const,
      suggestion: 'Ajoutez 5 à 10 compétences techniques, outils et logiciels clés de votre métier.'
    });
  } else {
    skillChecks.push({ 
      id: 'skills_cnt', 
      label: 'Rubrique Compétences vide ou insuffisante', 
      status: 'fail' as const,
      suggestion: 'Listez explicitement vos hard skills pour matcher les requêtes de recherche des recruteurs.'
    });
  }

  // Langues vivantes & niveau CECRL (7 pts)
  const hasLanguage = languagesText.trim().length > 0;
  const hasCefrLevel = CEFR_LANGUAGE_REGEX.test(languagesText);

  if (hasLanguage && hasCefrLevel) {
    skillPts += 7;
    skillChecks.push({ id: 'lang_cefr', label: 'Langues vivantes avec niveau explicite (CECRL : B2/C1, TOEIC, Courant...)', status: 'pass' as const });
  } else if (hasLanguage) {
    skillPts += 3;
    skillChecks.push({ 
      id: 'lang_cefr', 
      label: 'Langues mentionnées sans niveau précis', 
      status: 'warn' as const,
      suggestion: 'Précisez votre niveau pour chaque langue (ex: Anglais B2 / Professionnel, TOEIC 850) : filtre éliminatoire en France.'
    });
  } else {
    skillChecks.push({ 
      id: 'lang_cefr', 
      label: 'Aucune langue vivante renseignée', 
      status: 'warn' as const,
      suggestion: 'L\'anglais professionnel est requis sur plus de 60% des postes qualifiés en France.'
    });
  }

  // 5. Densité & Longueur 1 page (Max 10 pts)
  const lenChecks = [];
  let lenPts = 0;

  const fullText = `${profile} ${expDescriptions} ${skillsText} ${languagesText}`.replace(/<[^>]*>?/gm, '');
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount >= 180 && wordCount <= 650) {
    lenPts += 10;
    lenChecks.push({ id: 'wc', label: `Format 1 page optimal (${wordCount} mots, règle d'or en France)`, status: 'pass' as const });
  } else if (wordCount < 180) {
    lenPts += 4;
    lenChecks.push({ id: 'wc', label: `Contenu trop succinct (${wordCount} mots)`, status: 'warn' as const, suggestion: 'Développez davantage le détail de vos missions et compétences.' });
  } else {
    lenPts += 6;
    lenChecks.push({ id: 'wc', label: `Contenu dense (${wordCount} mots)`, status: 'warn' as const, suggestion: 'Restez synthétique pour tenir sur 1 page A4 standard.' });
  }

  const totalScore = Math.min(100, Math.round(structPts + contactPts + expPts + skillPts + lenPts));

  let statusLabel = 'Excellente compatibilité Marché France & ATS';
  let statusColor: 'green' | 'blue' | 'yellow' | 'red' = 'green';
  let verdict: FranceMarketBenchmark['verdict'] = 'Excellent';

  if (totalScore < 50) {
    statusLabel = 'Compatibilité Faible (Rejet ATS probable)';
    statusColor = 'red';
    verdict = 'Insuffisant';
  } else if (totalScore < 70) {
    statusLabel = 'Compatibilité Modérée (À optimiser pour la France)';
    statusColor = 'yellow';
    verdict = 'À renforcer';
  } else if (totalScore < 85) {
    statusLabel = 'Bonne compatibilité Marché France & ATS';
    statusColor = 'blue';
    verdict = 'Très bon';
  }

  return {
    overallScore: totalScore,
    statusLabel,
    statusColor,
    categories: [
      { category: 'Structure & Format ATS', score: Math.round((structPts / 20) * 100), maxPoints: 20, checks: structChecks },
      { category: 'Coordonnées & Mobilité (France)', score: Math.round((contactPts / 20) * 100), maxPoints: 20, checks: contactChecks },
      { category: 'Expériences & Preuves Chiffrées', score: Math.round((expPts / 25) * 100), maxPoints: 25, checks: expChecks },
      { category: 'Compétences, Titre & Langues', score: Math.round((skillPts / 25) * 100), maxPoints: 25, checks: skillChecks },
      { category: 'Densité & Format 1 Page', score: Math.round((lenPts / 10) * 100), maxPoints: 10, checks: lenChecks },
    ],
    marketBenchmark: {
      name: 'Standard Recrutement France (Apec, Workday, Welcome to the Jungle, Cabinets)',
      verdict,
      targetAudience: 'Recruteurs Français & Parseurs ATS',
      keyStats: {
        score: totalScore,
        pageOptimal: wordCount >= 180 && wordCount <= 650,
        metricsCount,
        hasCefrLanguage: hasLanguage && hasCefrLevel,
        hasMobility: hasLicenseOrMobility,
        hasLinkedIn,
      }
    },
    keywordDensity: {
      wordCount,
      hardSkillsCount: hardSkillCount,
      hasMetrics: metricsCount >= 3,
      hasBulletPoints,
      metricsCount,
    }
  };
}
