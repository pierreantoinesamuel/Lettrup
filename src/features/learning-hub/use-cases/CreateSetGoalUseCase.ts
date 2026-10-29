import { ILearningRepository, SaveGoalInput } from '../ports/ILearningRepository';
import { CareerGoal } from '../domain/types';

export class CreateSetGoalUseCase {
  constructor(private repo: ILearningRepository) {}

  async execute(userId: string, input: SaveGoalInput): Promise<CareerGoal> {
    const goal = await this.repo.saveGoal(userId, input);
    await this.repo.setActiveGoal(userId, goal.id);
    return goal;
  }
}
