/**
 * Agent Contrôleur ATS & Marché France
 * Audit rigoureux basé sur les standards Apec, cabinets de recrutement et ATS français.
 */

import { computeAtsAnalysis } from '../../../../lib/atsScoring';
import type { AtsAnalysis, AtsCheckResult } from '../../../../lib/atsScoring';
import { ResumeData } from '../../../../components/resume-preview/ResumePreview';

export interface FranceCriteriaVerdict {
  critere: string;
  bareme: string;
  analyse: string;
  verdict: 'Valide à 100%' | 'Valide à 90%' | 'Valide à 95%' | 'À optimiser';
  scoreObtenu: number;
  maxScore: number;
  status: 'pass' | 'warn' | 'fail';
  details: string[];
}

export interface FranceSpecificGaps {
  languagesCefr: {
    passed: boolean;
    recommendation: string;
  };
  mobilityPermis: {
    passed: boolean;
    recommendation: string;
  };
  metricsAndKpis: {
    passed: boolean;
    count: number;
    recommendation: string;
  };
  degreeRecognition: {
    passed: boolean;
    recommendation: string;
  };
  linkedInPresence: {
    passed: boolean;
    recommendation: string;
  };
}

export interface ATSControllerReport {
  overallScore: number;
  verdictLabel: string;
  benchmarkName: string;
  criteresFrance: FranceCriteriaVerdict[];
  specificitesManquantes: FranceSpecificGaps;
  priorityFixes: {
    id: string;
    label: string;
    potentialGain: number;
    actionPrompt: string;
  }[];
  analysis: AtsAnalysis;
}

export class ATSControllerAgent {
  /**
   * Analyse complète du CV selon le référentiel France et les ATS.
   */
  public static audit(data: ResumeData, templateId: string): ATSControllerReport {
    const analysis = computeAtsAnalysis(data, templateId);
    const coord: any = data?.coordonnees || {};
    const experiences: any[] = data?.experience || [];
    const education: any[] = data?.education || [];
    const skillsText: string = data?.competences || '';
    const languagesText: string = data?.langues || '';
    const profile: string = data?.profil || '';

    // Extraction des stats clés
    const metricsCount = analysis.keywordDensity.metricsCount;
    const hasCefr = /\b(A1|A2|B1|B2|C1|C2|courant|bilingue|notions|interm[eé]diaire|professionnel|toeic|toefl)\b/i.test(languagesText);
    const hasMobility = Boolean(
      coord.drivingLicense ||
      /permis\s*b|mobilit[eé]|v[eé]hicul[eé]|t[eé]l[eé]travail|remote|hybride/i.test(`${coord.location || ''} ${profile || ''}`)
    );
    const hasLinkedIn = Boolean(coord.linkedin || coord.website || coord.github);
    const hasDegreeDetails = education.some(edu => /bac\s*\+\s*[2-8]|master|licence|ing[eé]nieur|bachelor|bts|dut|doctorat|rncp/i.test(`${edu.degree} ${edu.institution}`));

    // Construction de la grille détaillée France
    const criteresFrance: FranceCriteriaVerdict[] = [
      {
        critere: 'Structure & ATS',
        bareme: '20 pts',
        analyse: 'Les 4 rubriques fondamentales (Profil/Accroche, Expérience, Formation, Compétences) avec intitulés standards reconnus par les parseurs francophones (Textkernel, Sovren).',
        verdict: 'Valide à 100%',
        scoreObtenu: Math.round((analysis.categories[0]?.score || 0) * 0.20),
        maxScore: 20,
        status: (analysis.categories[0]?.score || 0) >= 80 ? 'pass' : (analysis.categories[0]?.score || 0) >= 50 ? 'warn' : 'fail',
        details: [
          'Modèle épuré ATS : 8 pts',
          '4 rubriques présentes : 8 pts (2 pts par rubrique)',
          'Intitulés standards français : 4 pts',
        ],
      },
      {
        critere: 'Coordonnées & Mobilité',
        bareme: '20 pts',
        analyse: 'Nom, Email, Téléphone, Ville (sans adresse complète = respect RGPD) + Permis B/Mobilité et Profil LinkedIn.',
        verdict: 'Valide à 90%',
        scoreObtenu: Math.round((analysis.categories[1]?.score || 0) * 0.20),
        maxScore: 20,
        status: (analysis.categories[1]?.score || 0) >= 80 ? 'pass' : (analysis.categories[1]?.score || 0) >= 50 ? 'warn' : 'fail',
        details: [
          'Nom, e-mail, téléphone et ville : 3 pts chacun (12 pts)',
          'Permis B / Mobilité géographique : 4 pts',
          'Lien LinkedIn / Portfolio : 4 pts',
        ],
      },
      {
        critere: 'Expériences & Chiffres clés',
        bareme: '25 pts',
        analyse: 'Missions structurées en listes à puces débutant par des verbes d’action + résultats et indicateurs quantifiés (KPIs, CA, volumes, %).',
        verdict: 'Valide à 100%',
        scoreObtenu: Math.round((analysis.categories[2]?.score || 0) * 0.25),
        maxScore: 25,
        status: (analysis.categories[2]?.score || 0) >= 80 ? 'pass' : (analysis.categories[2]?.score || 0) >= 50 ? 'warn' : 'fail',
        details: [
          'Missions en listes à puces dynamiques : 12 pts (4 sinon)',
          'Preuves chiffrées : 3 nombres ou plus = 13 pts (1 ou 2 = 7 pts, aucun = 0 pt)',
        ],
      },
      {
        critere: 'Compétences, Titre & Langues',
        bareme: '25 pts',
        analyse: 'Titre de poste précis en haut de page (6 secondes de scan), 5+ hard skills explicites et Langues vivantes avec échelle CECRL (B2/C1, TOEIC).',
        verdict: 'Valide à 100%',
        scoreObtenu: Math.round((analysis.categories[3]?.score || 0) * 0.25),
        maxScore: 25,
        status: (analysis.categories[3]?.score || 0) >= 80 ? 'pass' : (analysis.categories[3]?.score || 0) >= 50 ? 'warn' : 'fail',
        details: [
          'Titre du poste explicite et ciblé : 8 pts',
          '5 compétences techniques ou plus : 10 pts (6 pour 2 à 4)',
          'Langues vivantes avec niveau CECRL : 7 pts (3 si sans niveau)',
        ],
      },
      {
        critere: 'Longueur & Format 1 Page',
        bareme: '10 pts',
        analyse: 'Entre 180 et 650 mots : standard strict du CV 1 page en France pour les profils juniors à intermédiaires (< 7 ans).',
        verdict: 'Valide à 95%',
        scoreObtenu: Math.round((analysis.categories[4]?.score || 0) * 0.10),
        maxScore: 10,
        status: (analysis.categories[4]?.score || 0) >= 80 ? 'pass' : (analysis.categories[4]?.score || 0) >= 50 ? 'warn' : 'fail',
        details: [
          'Format 1 page optimal (180 à 650 mots) : 10 pts (Moins : 4 pts, Plus : 6 pts)',
        ],
      },
    ];

    // Spécificités françaises manquantes
    const specificitesManquantes: FranceSpecificGaps = {
      languagesCefr: {
        passed: hasCefr,
        recommendation: hasCefr
          ? 'Niveaux de langues explicites (ex: Anglais B2/C1, TOEIC) conformes aux exigences du marché français.'
          : 'Précisez votre niveau pour chaque langue (ex: « Anglais B2 - Professionnel » ou « TOEIC 850 ») : filtre éliminatoire direct en France.',
      },
      mobilityPermis: {
        passed: hasMobility,
        recommendation: hasMobility
          ? 'Permis / Mobilité géographique correctement spécifiés.'
          : 'Ajoutez votre mention de mobilité (ex: « Permis B » ou « Mobilité : Île-de-France / Télétravail ») indispensable hors métropole.',
      },
      metricsAndKpis: {
        passed: metricsCount >= 3,
        count: metricsCount,
        recommendation: metricsCount >= 3
          ? `${metricsCount} résultats quantifiés trouvés dans vos expériences. Excellent levier pour convaincre recruteurs et cabinets.`
          : 'Insérez au moins 3 indicateurs chiffrés (ex: +25% de performance, 15 clients, budget de 200 k€) dans vos expériences.',
      },
      degreeRecognition: {
        passed: hasDegreeDetails,
        recommendation: hasDegreeDetails
          ? 'Diplômes et niveaux de formation académique clairement identifiables.'
          : 'Indiquez le niveau officiel de votre formation (ex: Bac+5, Master, Titre RNCP, Licence) très scruté par les grilles RH françaises.',
      },
      linkedInPresence: {
        passed: hasLinkedIn,
        recommendation: hasLinkedIn
          ? 'Lien professionnel en ligne présent.'
          : 'Ajoutez le lien vers votre profil LinkedIn : 87% des recruteurs français le vérifient lors de la présélection.',
      },
    };

    // Actions d'optimisation prioritaires
    const priorityFixes = [];

    if (metricsCount < 3) {
      priorityFixes.push({
        id: 'fix_metrics',
        label: 'Quantifier mes expériences avec des chiffres clés & KPIs',
        potentialGain: metricsCount === 0 ? 13 : 6,
        actionPrompt: 'Réécris mes expériences professionnelles en puces percutantes incluant des métriques chiffrées (pourcentages, volumes, budgets ou tailles d\'équipe).',
      });
    }

    if (!coord.jobTitle || coord.jobTitle.trim().length < 3) {
      priorityFixes.push({
        id: 'fix_job_title',
        label: 'Ajouter un titre de poste clair en en-tête',
        potentialGain: 8,
        actionPrompt: 'Propose-moi un titre de poste ciblé et vendeur en en-tête de mon CV en rapport avec mon parcours.',
      });
    }

    if (!hasCefr) {
      priorityFixes.push({
        id: 'fix_languages',
        label: 'Normaliser les langues avec les niveaux CECRL (B2/C1)',
        potentialGain: languagesText.trim() ? 4 : 7,
        actionPrompt: 'Formate ma rubrique Langues avec les standards européens CECRL (ex: Anglais B2/C1, TOEIC, Notions).',
      });
    }

    if (skillsText.split('\n').filter(Boolean).length < 5) {
      priorityFixes.push({
        id: 'fix_skills',
        label: 'Enrichir mes compétences techniques (hard skills)',
        potentialGain: 4,
        actionPrompt: 'Extrais et liste 8 compétences techniques et méthodologiques clés issues de mon parcours pour mon CV.',
      });
    }

    if (!hasMobility) {
      priorityFixes.push({
        id: 'fix_mobility',
        label: 'Indiquer la mobilité géographique ou Permis B',
        potentialGain: 4,
        actionPrompt: 'Ajoute la mention de mobilité géographique ou Permis B dans mes coordonnées.',
      });
    }

    return {
      overallScore: analysis.overallScore,
      verdictLabel: analysis.statusLabel,
      benchmarkName: analysis.marketBenchmark.name,
      criteresFrance,
      specificitesManquantes,
      priorityFixes,
      analysis,
    };
  }
}
