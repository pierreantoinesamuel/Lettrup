import { RoadmapStep } from '../types';

export function forgeBotMessage(ctx: {
  role: string;
  nextStep?: RoadmapStep;
  justCompleted?: string;
  lang?: 'fr' | 'en';
}): string {
  const isEn = ctx.lang === 'en';

  if (ctx.justCompleted) {
    return isEn
      ? `🎉 Fantastic job completing "${ctx.justCompleted}"! You're closer to becoming a ${ctx.role}. Ready for the next module?`
      : `🎉 Félicitations pour avoir validé "${ctx.justCompleted}" ! Vous vous rapprochez à grands pas de votre objectif : ${ctx.role}. Prêt pour le module suivant ?`;
  }

  if (ctx.nextStep) {
    return isEn
      ? `Bonjour! I am ForgeBot, your AI orientation coach. To reach your target role of ${ctx.role}, your active focus module is "${ctx.nextStep.title}". Let's master it together!`
      : `Bonjour ! Je suis ForgeBot, votre agent d'orientation IA. Pour viser le poste de ${ctx.role}, votre prochain module prioritaire est "${ctx.nextStep.title}". Suivez les étapes ci-dessous pour valider vos compétences.`;
  }

  return isEn
    ? `Welcome to your career learning journey for ${ctx.role}. Set your goals and follow your personalized S-Curve roadmap!`
    : `Bienvenue dans votre parcours de formation vers le poste de ${ctx.role}. Validez vos compétences une à une pour atteindre une maîtrise complète.`;
}
