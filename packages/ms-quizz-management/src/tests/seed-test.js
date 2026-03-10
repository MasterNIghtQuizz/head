import { QuizRepository } from "../modules/quiz/repositories/quiz.repository.js";
import { QuestionRepository } from "../modules/quiz/repositories/question.repository.js";
import { ChoiceRepository } from "../modules/quiz/repositories/choice.repository.js";

/**
 * @param {import('typeorm').DataSource} datasource
 */
export async function seedTestData(datasource) {
  const quizRepo = new QuizRepository(datasource);
  const questionRepo = new QuestionRepository(datasource);
  const choiceRepo = new ChoiceRepository(datasource);

  await datasource.query("TRUNCATE TABLE choice CASCADE");
  await datasource.query("TRUNCATE TABLE question CASCADE");
  await datasource.query("TRUNCATE TABLE quizzes CASCADE");

  const quiz = await quizRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "General Knowledge",
    description: "A quiz about everything",
  });
  const q1 = await questionRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440001",
    label: "What is the capital of France?",
    type: "multiple",
    order_index: 0,
    timer_seconds: 30,
    quiz: {
      id: quiz.id,
      title: "",
      description: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      questions: undefined,
    },
  });

  const q2 = await questionRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440011",
    label: "What is 2+2?",
    type: "multiple",
    order_index: 1,
    timer_seconds: 10,
    quiz: {
      id: quiz.id,
      title: "",
      description: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      questions: undefined,
    },
  });

  await choiceRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440000",
    text: "Paris",
    is_correct: true,
    question: {
      id: q1.id,
      label: "",
      type: "",
      order_index: 0,
      timer_seconds: 0,
      quiz: undefined,
      choices: undefined,
    },
  });

  await choiceRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440005",
    text: "London",
    is_correct: false,
    question: {
      id: q1.id,
      label: "",
      type: "",
      order_index: 0,
      timer_seconds: 0,
      quiz: undefined,
      choices: undefined,
    },
  });

  await choiceRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440020",
    text: "4",
    is_correct: true,
    question: {
      id: q2.id,
      label: "",
      type: "",
      order_index: 0,
      timer_seconds: 0,
      quiz: undefined,
      choices: undefined,
    },
  });

  await choiceRepo.create({
    id: "550e8400-e29b-41d4-a716-446655440021",
    text: "5",
    is_correct: false,
    question: {
      id: q2.id,
      label: "",
      type: "",
      order_index: 0,
      timer_seconds: 0,
      quiz: undefined,
      choices: undefined,
    },
  });
}
