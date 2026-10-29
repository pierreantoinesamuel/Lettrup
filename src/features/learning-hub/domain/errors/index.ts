export class LearningError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LearningError';
  }
}

export class LearningAIError extends LearningError {
  constructor(message: string, public readonly provider?: string, public readonly originalError?: unknown) {
    super(message, 'AI_FAILURE');
    this.name = 'LearningAIError';
  }
}

export class LearningValidationError extends LearningError {
  constructor(message: string, public readonly issues?: unknown) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'LearningValidationError';
  }
}

export class LearningNotFoundError extends LearningError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' was not found.`, 'NOT_FOUND');
    this.name = 'LearningNotFoundError';
  }
}

export class LearningCycleDependencyError extends LearningError {
  constructor(message: string = 'A cycle was detected in the milestone prerequisite graph.') {
    super(message, 'CYCLE_DEPENDENCY');
    this.name = 'LearningCycleDependencyError';
  }
}
