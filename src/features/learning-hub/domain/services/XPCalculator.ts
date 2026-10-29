import { SkillProgress } from '../types';

export class XPCalculator {
  public static calculateXP(progress: SkillProgress[], streakDays: number): { xp: number; level: number; badgeCount: number } {
    let xp = 0;

    progress.forEach((p) => {
      if (p.state === 'validated') xp += 250;
      else if (p.state === 'practiced') xp += 100;
      else if (p.state === 'learning') xp += 30;
      xp += p.hoursLogged * 10;
    });

    xp += streakDays * 20;

    const level = Math.floor(xp / 500) + 1;
    const badgeCount = Math.floor(progress.filter((p) => p.state === 'validated').length / 2);

    return { xp, level, badgeCount };
  }
}
