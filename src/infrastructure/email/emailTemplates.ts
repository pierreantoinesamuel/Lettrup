
import { SITE_URL } from '../../config/brand';/**
 * Literal French Email Templates (Formal "Vous") for Trial Lifecycle & Dunning Sequence
 */

export interface EmailTemplate {
  subject: string;
  body: string;
}

export function getTrialLifecycleEmailTemplate(
  templateType: 'day2' | 'reminder1' | 'reminder2' | 'reminder3',
  context?: { cancellationDate?: string; activeFeaturesUsed?: number }
): EmailTemplate {
  switch (templateType) {
    case 'day2':
      return {
        subject: 'Votre essai gratuit Lettrup touche à sa fin bientôt !',
        body: `Bonjour,

Votre essai gratuit de 7 jours sur Lettrup est en cours. Nous espérons que nos outils d'optimisation de CV et d'IA vous accompagnent avec succès dans votre recherche d'emploi.

Pendant cet essai, vous avez accès à l'ensemble de nos fonctionnalités d'adaptation sur mesure de CV, de scan ATS et d'accroche recruteur.

Aucune action immédiate n'est requise. Si vous choisissez de ne pas passer à l'abonnement payant à l'issue des 7 jours, votre compte restera accessible pour consulter vos données, mais la génération par IA sera temporairement suspendue.

Pour conserver un accès illimité à l'IA et maximiser vos chances de décrocher des entretiens, découvrez nos offres dès maintenant :
${SITE_URL}/pricing

L'équipe Lettrup`,
      };

    case 'reminder1':
      return {
        subject: 'Votre essai gratuit Lettrup est terminé - Débloquez vos fonctionnalités IA',
        body: `Bonjour,

Votre période d'essai gratuit de 7 jours sur Lettrup est maintenant terminée.

Afin de continuer à générer des CV adaptés sur mesure à chaque offre d'emploi, d'effectuer des scans ATS illimités et de rédiger des messages de prise de contact pour les recruteurs, nous vous invitons à souscrire à notre abonnement.

Vos CV et historiques de candidatures restent en sécurité sur votre espace personnel.

Mettez à niveau votre compte dès aujourd'hui :
${SITE_URL}/pricing

Cordialement,
L'équipe Lettrup`,
      };

    case 'reminder2':
      return {
        subject: 'Poursuivez votre recherche d\'emploi avec Lettrup',
        body: `Bonjour,

Votre essai gratuit s'est achevé il y a quelques jours. Vos candidatures et vos documents sont toujours enregistrés, mais les fonctionnalités de génération IA sont actuellement verrouillées.

Note importante : conformément à nos conditions d'utilisation, les comptes inactifs sans abonnement actif sont programmés pour annulation et suppression progressive au bout de 45 jours.

Ne laissez pas passer votre prochaine opportunité professionnelle. Réactivez vos accès IA en souscrivant à la formule Starter ou Pro :
${SITE_URL}/pricing

Bien cordialement,
L'équipe Lettrup`,
      };

    case 'reminder3':
      const dateStr = context?.cancellationDate || '15 jours';
      return {
        subject: 'Dernier avis : Annulation imminente de votre compte Lettrup',
        body: `Bonjour,

Ceci est votre dernier avis concernant votre compte Lettrup.

Votre période d'essai a pris fin il y a 30 jours. Sans souscription de votre part, votre compte ainsi que l'ensemble de vos données associées seront définitivement annulés et programmés pour suppression le ${dateStr} (à l'échéance des 45 jours post-essai).

Si vous souhaitez conserver vos données et réactiver immédiatement toutes les fonctionnalités IA d'optimisation de CV, souscrivez dès maintenant :
${SITE_URL}/pricing

Si vous ne souhaitez pas poursuivre, aucune action n'est requise de votre part.

L'équipe Lettrup`,
      };
  }
}
