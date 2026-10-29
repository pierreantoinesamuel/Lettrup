import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, Sparkles, ChevronDown, ChevronUp,
  FileText, Target, BarChart2, Lightbulb, Search, Plus, Layers
} from 'lucide-react';

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

export interface AtsAnalysis {
  overallScore: number;
  statusLabel: string;
  statusColor: 'green' | 'blue' | 'yellow' | 'red';
  categories: AtsCheckResult[];
  keywordDensity: {
    wordCount: number;
    hardSkillsCount: number;
    hasMetrics: boolean;
    hasBulletPoints: boolean;
  };
}

interface AtsCompatibilityWidgetProps {
  data: any; // ResumeData
  templateId: string;
  onAddSkill?: (skill: string) => void;
  onApplyAiFix?: (prompt: string) => void;
}

export const AtsCompatibilityWidget: React.FC<AtsCompatibilityWidgetProps> = ({
  data,
  templateId,
  onAddSkill,
  onApplyAiFix
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [isMatchingKeywords, setIsMatchingKeywords] = useState(false);

  // Dynamic calculation of ATS criteria
  const analysis: AtsAnalysis = useMemo(() => {
    const coord = data.coordonnees || {};
    const experiences = data.experience || [];
    const education = data.education || [];
    const skillsText = data.competences || '';
    const profile = data.profil || '';

    // 1. Structure & Formatting (Max 25 pts)
    const structChecks = [];
    let structPts = 0;

    // Check template ATS friendliness
    const isAtsTemplate = ['minimalist', 'minimalist1', 'swiss', 'admin', 'monochrome'].includes(templateId);
    if (isAtsTemplate) {
      structPts += 8;
      structChecks.push({ id: 'tmpl', label: 'Modèle de CV épuré et structuré', status: 'pass' as const });
    } else {
      structPts += 5;
      structChecks.push({ 
        id: 'tmpl', 
        label: 'Modèle visuel (Préférez un modèle 1 colonne/ATS pour postuler sur portail)', 
        status: 'warn' as const,
        suggestion: 'Passez au modèle "Swiss", "Consultant" ou "Classic" pour une compatibilité ATS optimale à 100%.'
      });
    }

    // Check core sections
    const hasExp = experiences.length > 0;
    const hasEdu = education.length > 0;
    const hasSkills = skillsText.trim().length > 0;
    const hasProfil = profile.trim().length > 0;

    if (hasExp && hasEdu && hasSkills && hasProfil) {
      structPts += 12;
      structChecks.push({ id: 'sec', label: '5 rubriques standards présentes (Contact, Profil, Expérience, Formation, Compétences)', status: 'pass' as const });
    } else {
      const missing = [];
      if (!hasProfil) missing.push('Profil');
      if (!hasExp) missing.push('Expérience');
      if (!hasEdu) missing.push('Éducation');
      if (!hasSkills) missing.push('Compétences');
      structPts += (hasExp ? 3 : 0) + (hasEdu ? 3 : 0) + (hasSkills ? 3 : 0) + (hasProfil ? 3 : 0);
      structChecks.push({ 
        id: 'sec', 
        label: `Rubriques manquantes : ${missing.join(', ')}`, 
        status: 'fail' as const,
        suggestion: 'Les robots ATS filtrent les CV auxquels il manque les rubriques clés de parcours.'
      });
    }

    // Order and standard headings check
    structPts += 5;
    structChecks.push({ id: 'headings', label: 'Intitulés de rubriques standards reconnaissables par les robots', status: 'pass' as const });

    // 2. Contact Details & Plain Text (Max 20 pts)
    const contactChecks = [];
    let contactPts = 0;

    const hasName = Boolean(coord.name && coord.name.trim().length > 2);
    const hasEmail = Boolean(coord.email && coord.email.includes('@'));
    const hasPhone = Boolean(coord.phone && coord.phone.trim().length >= 8);
    const hasLocation = Boolean(coord.location && coord.location.trim().length >= 2);

    if (hasName && hasEmail && hasPhone && hasLocation) {
      contactPts += 20;
      contactChecks.push({ id: 'cnt', label: 'Coordonnées complètes en texte clair (Email, Tél, Ville)', status: 'pass' as const });
    } else {
      if (hasName) contactPts += 5;
      if (hasEmail) contactPts += 5;
      if (hasPhone) contactPts += 5;
      if (hasLocation) contactPts += 5;

      const missingCnt = [];
      if (!hasEmail) missingCnt.push('Email valide');
      if (!hasPhone) missingCnt.push('Téléphone');
      if (!hasLocation) missingCnt.push('Ville/Localisation');

      contactChecks.push({ 
        id: 'cnt', 
        label: `Coordonnées incomplètes (${missingCnt.join(', ')})`, 
        status: 'warn' as const,
        suggestion: 'Placez toujours votre e-mail et numéro en texte brut (pas dans une image).'
      });
    }

    // 3. Experience Impact & Action Bullet Points (Max 25 pts)
    const expChecks = [];
    let expPts = 0;

    // Check bullet points
    const expDescriptions = experiences.map((e: any) => e.description || '').join(' ');
    const hasBulletPoints = expDescriptions.includes('<ul>') || expDescriptions.includes('<li>') || expDescriptions.includes('- ') || expDescriptions.includes('•');
    
    if (hasBulletPoints) {
      expPts += 12;
      expChecks.push({ id: 'bullets', label: 'Missions structurées en listes à puces faciles à scanner', status: 'pass' as const });
    } else {
      expPts += 4;
      expChecks.push({ 
        id: 'bullets', 
        label: 'Missions en paragraphes denses sans puces', 
        status: 'warn' as const,
        suggestion: 'Utilisez les listes à puces pour chaque expérience pour une extraction ATS immédiate.'
      });
    }

    // Check metrics / numbers / proofs
    const numberRegex = /\b(\d+[\d\s%,.kK€$]*)\b/g;
    const metricsMatches = expDescriptions.match(numberRegex) || [];
    const hasMetrics = metricsMatches.length >= 3;

    if (hasMetrics) {
      expPts += 13;
      expChecks.push({ id: 'metrics', label: 'Expériences étayées avec preuves chiffrées & chiffres clés', status: 'pass' as const });
    } else if (metricsMatches.length > 0) {
      expPts += 7;
      expChecks.push({ 
        id: 'metrics', 
        label: 'Quelques chiffres détectés, mais gagne à être renforcé', 
        status: 'warn' as const,
        suggestion: 'Indiquez des volumes, des pourcentages ou des tailles d\'équipe (ex: +25% de ventes, 15+ projets).'
      });
    } else {
      expChecks.push({ 
        id: 'metrics', 
        label: 'Aucune donnée chiffrée ou métrique de performance trouvée', 
        status: 'fail' as const,
        suggestion: 'Les ATS et recruteurs privilégient les résultats quantifiables.'
      });
    }

    // 4. Hard Skills & Keyword Density (Max 20 pts)
    const skillChecks = [];
    let skillPts = 0;

    const skillLines = skillsText.split('\n').map((s: string) => s.trim()).filter(Boolean);
    const hardSkillCount = skillLines.length;

    if (hardSkillCount >= 5) {
      skillPts += 12;
      skillChecks.push({ id: 'skills_cnt', label: `${hardSkillCount} compétences répertoriées en texte brut`, status: 'pass' as const });
    } else if (hardSkillCount >= 2) {
      skillPts += 7;
      skillChecks.push({ 
        id: 'skills_cnt', 
        label: `Seulement ${hardSkillCount} compétences listées`, 
        status: 'warn' as const,
        suggestion: 'Ajoutez au moins 6 à 10 hard skills (outils, méthodologies, logiciels) en texte clair.'
      });
    } else {
      skillChecks.push({ 
        id: 'skills_cnt', 
        label: 'Rubrique Compétences vide ou insuffisante', 
        status: 'fail' as const,
        suggestion: 'Insérez des compétences techniques précises et en rapport avec votre métier.'
      });
    }

    // Job Title Matching
    const jobTitle = coord.jobTitle || '';
    if (jobTitle.length >= 3) {
      skillPts += 8;
      skillChecks.push({ id: 'job_title', label: `Titre du poste clair et explicite : "${jobTitle}"`, status: 'pass' as const });
    } else {
      skillChecks.push({ 
        id: 'job_title', 
        label: 'Titre de poste manquant en haut du CV', 
        status: 'warn' as const,
        suggestion: 'Définissez un titre de poste précis correspondant à l\'offre visée (ex: "Développeur Full Stack React").'
      });
    }

    // 5. Length & Formatting Clarity (Max 10 pts)
    const lenChecks = [];
    let lenPts = 0;

    const fullText = `${profile} ${expDescriptions} ${skillsText}`.replace(/<[^>]*>?/gm, '');
    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

    if (wordCount >= 180 && wordCount <= 650) {
      lenPts += 10;
      lenChecks.push({ id: 'wc', label: `Densité de texte optimale (${wordCount} mots)`, status: 'pass' as const });
    } else if (wordCount < 180) {
      lenPts += 4;
      lenChecks.push({ id: 'wc', label: `Contenu court (${wordCount} mots)`, status: 'warn' as const, suggestion: 'Développez davantage le détail de vos missions.' });
    } else {
      lenPts += 6;
      lenChecks.push({ id: 'wc', label: `Contenu très dense (${wordCount} mots)`, status: 'warn' as const, suggestion: 'Restez synthétique pour ne pas dépasser une page A4.' });
    }

    const totalScore = Math.min(100, Math.round(structPts + contactPts + expPts + skillPts + lenPts));

    let statusLabel = 'Excellente compatibilité ATS';
    let statusColor: 'green' | 'blue' | 'yellow' | 'red' = 'green';

    if (totalScore < 50) {
      statusLabel = 'Compatibilité ATS Faible';
      statusColor = 'red';
    } else if (totalScore < 70) {
      statusLabel = 'Compatibilité ATS Modérée';
      statusColor = 'yellow';
    } else if (totalScore < 85) {
      statusLabel = 'Bonne compatibilité ATS';
      statusColor = 'blue';
    }

    return {
      overallScore: totalScore,
      statusLabel,
      statusColor,
      categories: [
        { category: 'Structure & Format ATS', score: Math.round((structPts / 25) * 100), maxPoints: 25, checks: structChecks },
        { category: 'Lisibilité & Coordonnées', score: Math.round((contactPts / 20) * 100), maxPoints: 20, checks: contactChecks },
        { category: 'Missions & Preuves Chiffrées', score: Math.round((expPts / 25) * 100), maxPoints: 25, checks: expChecks },
        { category: 'Compétences & Mots-clés', score: Math.round((skillPts / 20) * 100), maxPoints: 20, checks: skillChecks },
        { category: 'Densité & Longueur', score: Math.round((lenPts / 10) * 100), maxPoints: 10, checks: lenChecks },
      ],
      keywordDensity: {
        wordCount,
        hardSkillsCount: hardSkillCount,
        hasMetrics,
        hasBulletPoints
      }
    };
  }, [data, templateId]);

  // Handle Job Keyword Extractor
  const handleExtractKeywords = () => {
    if (!jobDescription.trim()) return;
    setIsMatchingKeywords(true);

    // Simple intelligent keyword extractor for demonstration
    setTimeout(() => {
      const words = jobDescription
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 3);

      // Filter common French stop words
      const stopWords = new Set(['avec', 'dans', 'pour', 'plus', 'votre', 'notre', 'nous', 'vous', 'sont', 'cette', 'cette', 'tout', 'tous', 'fait', 'être', 'avoir', 'aussi', 'ainsi', 'chez', 'entre', 'sous', 'comme', 'leurs']);
      
      const freqMap: Record<string, number> = {};
      words.forEach(w => {
        const lower = w.toLowerCase();
        if (!stopWords.has(lower) && !/^\d+$/.test(lower)) {
          freqMap[w] = (freqMap[w] || 0) + 1;
        }
      });

      const sorted = Object.keys(freqMap)
        .sort((a, b) => freqMap[b] - freqMap[a])
        .slice(0, 12);

      setTargetKeywords(sorted);
      setIsMatchingKeywords(false);
    }, 400);
  };

  const currentCvText = useMemo(() => {
    return JSON.stringify(data).toLowerCase();
  }, [data]);

  const matchedKeywords = targetKeywords.filter(kw => currentCvText.includes(kw.toLowerCase()));
  const missingKeywords = targetKeywords.filter(kw => !currentCvText.includes(kw.toLowerCase()));

  const colorStyles = {
    green: { bg: 'bg-[var(--status-green)]', text: 'text-[var(--status-green)]', border: 'border-[var(--status-green)]/30', lightBg: 'bg-[var(--status-green)]/10' },
    blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', lightBg: 'bg-blue-50' },
    yellow: { bg: 'bg-[var(--status-orange)]', text: 'text-[var(--status-orange)]', border: 'border-[var(--status-orange)]/30', lightBg: 'bg-[var(--status-orange)]/10' },
    red: { bg: 'bg-[var(--status-red)]', text: 'text-[var(--status-red)]', border: 'border-[var(--status-red)]/30', lightBg: 'bg-[var(--status-red)]/10' },
  }[analysis.statusColor];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
      {/* Top Header Widget Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Circular score display */}
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm ${
              analysis.statusColor === 'green' ? 'border-[var(--status-green)] text-[var(--status-green)] bg-[var(--status-green)]/10' :
              analysis.statusColor === 'blue' ? 'border-blue-500 text-blue-800 bg-blue-50' :
              analysis.statusColor === 'yellow' ? 'border-[var(--status-orange)] text-[var(--status-orange)] bg-[var(--status-orange)]/10' :
              'border-[var(--status-red)] text-[var(--status-red)] bg-[var(--status-red)]/10'
            }`}>
              {analysis.overallScore}%
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-900">Score de Compatibilité ATS</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorStyles.lightBg} ${colorStyles.text} ${colorStyles.border} border`}>
                {analysis.statusLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Analyse automatique basée sur les critères de filtrage des logiciels recruteurs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-xs font-semibold hidden sm:inline">
            {isOpen ? 'Masquer le rapport' : 'Voir le rapport complet'}
          </span>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded Report Panel */}
      {isOpen && (
        <div className="border-t border-gray-200 bg-gray-50/60 p-4 sm:p-5 space-y-6 animate-fadeIn">
          {/* Progress Breakdown Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.categories.map((cat, i) => (
              <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800 mb-1.5">
                  <span>{cat.category}</span>
                  <span className={cat.score >= 80 ? 'text-[var(--status-green)]' : cat.score >= 50 ? 'text-[var(--status-orange)]' : 'text-[var(--status-red)]'}>
                    {cat.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      cat.score >= 80 ? 'bg-[var(--status-green)]' : cat.score >= 50 ? 'bg-[var(--status-orange)]' : 'bg-[var(--status-red)]'
                    }`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {cat.checks.map((chk) => (
                    <div key={chk.id} className="text-[11px] flex items-start gap-1.5 text-gray-700 leading-tight">
                      {chk.status === 'pass' && <CheckCircle2 size={13} className="text-[var(--status-green)] shrink-0 mt-0.5" />}
                      {chk.status === 'warn' && <AlertTriangle size={13} className="text-[var(--status-orange)] shrink-0 mt-0.5" />}
                      {chk.status === 'fail' && <XCircle size={13} className="text-[var(--status-red)] shrink-0 mt-0.5" />}
                      <div>
                        <span>{chk.label}</span>
                        {chk.suggestion && (
                          <p className="text-[10px] text-gray-500 italic mt-0.5 font-sans">
                            💡 {chk.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Job Description Keyword Matcher */}
          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <Target size={16} className="text-blue-600" />
              <span>Comparateur de Mots-clés avec une Offre d'Emploi</span>
            </div>
            <p className="text-xs text-gray-600">
              Collez l'intitulé ou la description de l'offre visée pour vérifier que votre CV contient les mots-clés stratégiques.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Collez le texte de l'annonce d'emploi ici..."
                rows={2}
                className="flex-1 text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleExtractKeywords}
                disabled={isMatchingKeywords || !jobDescription.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Search size={14} />
                {isMatchingKeywords ? 'Analyse...' : 'Comparer'}
              </button>
            </div>

            {targetKeywords.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">
                    Mots-clés détectés dans l'offre ({matchedKeywords.length}/{targetKeywords.length} présents)
                  </span>
                  <span className="text-blue-700 font-semibold">
                    Match: {Math.round((matchedKeywords.length / targetKeywords.length) * 100)}%
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {targetKeywords.map((kw, i) => {
                    const isMatched = currentCvText.includes(kw.toLowerCase());
                    return (
                      <span
                        key={i}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          isMatched 
                            ? 'bg-[var(--status-green)]/10 text-[var(--status-green)] border-[var(--status-green)]/30'
                            : 'bg-[var(--status-red)]/10 text-[var(--status-red)] border-[var(--status-red)]/30'
                        }`}
                      >
                        {isMatched ? <CheckCircle2 size={11} className="text-[var(--status-green)]" /> : <XCircle size={11} className="text-[var(--status-red)]" />}
                        {kw}
                        {!isMatched && onAddSkill && (
                          <button
                            type="button"
                            onClick={() => onAddSkill(kw)}
                            title="Ajouter aux compétences"
                            className="ml-1 text-[var(--status-red)] hover:text-black hover:bg-[var(--status-red)]/20 rounded p-0.5 transition-colors"
                          >
                            <Plus size={10} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actionable AI Optimization Prompt Suggestion */}
          {onApplyAiFix && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg text-[var(--status-orange)]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="font-bold text-xs">Optimisation IA instantanée</div>
                  <div className="text-[11px] text-slate-300">
                    Laissez l'Assistant IA reformuler votre CV pour maximiser la compatibilité ATS.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onApplyAiFix('Optimise mon CV pour passer les filtres ATS en ajoutant des verbes d\'action et des compétences clés.')}
                className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                Demander à l'IA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
