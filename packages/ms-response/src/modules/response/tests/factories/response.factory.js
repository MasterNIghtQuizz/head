export function createResponseEntity(overrides = {}) {
  return {
    id: "69c16aed-ec7c-8328-baf4-4edc49890471",
    participantId: "69c16aed-ec7c-8328-baf4-4edc49890472",
    questionId: "69c16aed-ec7c-8328-baf4-4edc49890473",
    sessionId: "69c16aed-ec7c-8328-baf4-4edc49890474",
    //choiceId: "69c16aed-ec7c-8328-baf4-4edc49890475",
    isCorrect: true,
    submittedAt: new Date(),
    ...overrides,
  };
}
