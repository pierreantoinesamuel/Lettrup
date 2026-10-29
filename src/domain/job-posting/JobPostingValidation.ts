import { JobPostingInput } from './JobPosting';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Pure domain validation function for job postings.
 * Ensures required fields exist and description length is within reasonable bounds (100 - 10000 chars).
 */
export function validateJobPostingSubmission(input: Partial<JobPostingInput>): ValidationResult {
  const errors: string[] = [];

  if (!input.title || !input.title.trim()) {
    errors.push('Le titre du poste est obligatoire.');
  }

  if (!input.company || !input.company.trim()) {
    errors.push('Le nom de l\'entreprise est obligatoire.');
  }

  if (!input.descriptionText || !input.descriptionText.trim()) {
    errors.push('La description de l\'offre est obligatoire.');
  } else {
    const trimmed = input.descriptionText.trim();
    if (trimmed.length < 100) {
      errors.push('La description de l\'offre doit contenir au moins 100 caractères.');
    } else if (trimmed.length > 10000) {
      errors.push('La description de l\'offre ne doit pas dépasser 10 000 caractères.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
