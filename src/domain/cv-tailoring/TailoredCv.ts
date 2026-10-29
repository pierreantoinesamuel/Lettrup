/**
 * Domain Entity: TailoredCv
 * Extends/wraps the base CV entity with lineage tracking (sourceCvId, jobOfferRef, changeSummary).
 */

import { ResumeProfile, SavedResume, ExperienceItem } from '../../types';

export interface TailoredCv extends SavedResume {
  sourceCvId: string;
  jobOfferRef: string;
  isTailored: boolean;
  changeSummary: string[];
  createdAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  sanitizedProfile: ResumeProfile;
}

function extractNumbersAndPercentages(text: string): string[] {
  // Matches digits, percentages, and numeric quantities e.g. "30%", "10", "2.5", "2023"
  const matches = text.match(/\b\d+(?:[\.,]\d+)?%?\b/g) || [];
  return matches.map((m) => m.trim());
}

/**
 * Pure domain guardrail rule:
 * Validates that no new skills, companies, or facts were fabricated in the tailored version.
 * If hallucinated facts are detected, strips them from sanitizedProfile and returns explicit violation notices for the UI/changeSummary.
 */
export function validateNoFabricatedFacts(
  sourceCvData: ResumeProfile,
  tailoredCvData: ResumeProfile
): ValidationResult {
  const violations: string[] = [];

  // Guardrail 1: Check for hallucinated skills
  const sourceSkillsSet = new Set(
    sourceCvData.skills.map((s) => s.toLowerCase().trim())
  );
  
  const validSkills: string[] = [];
  const fabricatedSkills: string[] = [];

  tailoredCvData.skills.forEach((s) => {
    if (sourceSkillsSet.has(s.toLowerCase().trim())) {
      validSkills.push(s);
    } else {
      fabricatedSkills.push(s);
    }
  });

  if (fabricatedSkills.length > 0) {
    violations.push(
      `Compétences filtrées par le garde-fou (non présentes dans le CV source) : ${fabricatedSkills.join(', ')}`
    );
  }

  // Guardrail 2: Field-by-field Experience validation
  const sourceExpMap = new Map<string, ExperienceItem>();
  sourceCvData.experience.forEach((exp) => {
    if (exp.id) sourceExpMap.set(exp.id, exp);
  });

  const sanitizedExperience: ExperienceItem[] = [];

  if (tailoredCvData.experience.length > sourceCvData.experience.length) {
    violations.push(
      'Tentative d\'ajout de nouvelles expériences non vérifiées détectée : ignoré les expériences supplémentaires.'
    );
  }

  tailoredCvData.experience.forEach((tailoredExp, idx) => {
    // Match by ID or fallback by index position
    const sourceExp = (tailoredExp.id ? sourceExpMap.get(tailoredExp.id) : null) || sourceCvData.experience[idx];

    if (!sourceExp) {
      violations.push(`Expérience non reconnue (ID/index invalide) ignorée.`);
      return;
    }

    // Check fixed metadata fields: company, role, startDate, endDate
    const metadataChanged =
      (tailoredExp.company || '').trim() !== (sourceExp.company || '').trim() ||
      (tailoredExp.role || '').trim() !== (sourceExp.role || '').trim() ||
      (tailoredExp.startDate || '').trim() !== (sourceExp.startDate || '').trim() ||
      (tailoredExp.endDate || '').trim() !== (sourceExp.endDate || '').trim();

    if (metadataChanged) {
      violations.push(
        `Modifications de métadonnées interdites détectées pour "${sourceExp.company}" (${sourceExp.role}) : entreprise, rôle ou dates modifiés. Réinitialisé aux valeurs d'origine.`
      );
      sanitizedExperience.push(sourceExp);
      return;
    }

    // Check description for newly introduced quantitative claims (numbers/percentages)
    const sourceNums = new Set(extractNumbersAndPercentages(sourceExp.description || ''));
    const tailoredNums = extractNumbersAndPercentages(tailoredExp.description || '');

    const hallucinatedNums = tailoredNums.filter((num) => !sourceNums.has(num));

    if (hallucinatedNums.length > 0) {
      violations.push(
        `Chiffres/pourcentages non vérifiés détectés dans la description de "${sourceExp.company}" (${hallucinatedNums.join(', ')}) : description réinitialisée.`
      );
      sanitizedExperience.push(sourceExp);
      return;
    }

    // Valid description update
    sanitizedExperience.push(tailoredExp);
  });

  // Guardrail 3: Summary field quantitative validation
  // Source numbers set pools numbers from source summary + all source experience descriptions
  const allSourceText = [
    sourceCvData.summary || '',
    ...sourceCvData.experience.map((e) => e.description || ''),
  ].join(' ');
  const sourceSummaryNums = new Set(extractNumbersAndPercentages(allSourceText));
  const tailoredSummaryNums = extractNumbersAndPercentages(tailoredCvData.summary || '');

  const hallucinatedSummaryNums = tailoredSummaryNums.filter(
    (num) => !sourceSummaryNums.has(num)
  );

  let sanitizedSummary = tailoredCvData.summary;
  if (hallucinatedSummaryNums.length > 0) {
    violations.push(
      `Chiffres/pourcentages non vérifiés détectés dans le résumé professionnel (${hallucinatedSummaryNums.join(', ')}) : résumé réinitialisé à la version d'origine.`
    );
    sanitizedSummary = sourceCvData.summary;
  }

  const sanitizedProfile: ResumeProfile = {
    ...tailoredCvData,
    summary: sanitizedSummary,
    skills: validSkills.length > 0 ? validSkills : sourceCvData.skills,
    experience: sanitizedExperience.length > 0 ? sanitizedExperience : sourceCvData.experience,
  };

  return {
    isValid: violations.length === 0,
    violations,
    sanitizedProfile,
  };
}
