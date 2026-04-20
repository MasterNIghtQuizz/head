// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";

describe("Technical Quizz Full E2E Scenarios", () => {
  let app;
  let token;

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();
    const email = `test-${Date.now()}@test.com`;
    await app.inject({
      method: "POST",
      url: "/user/register",
      payload: { email, password: "password123", role: UserRole.USER },
    });
    const loginRes = await app.inject({
      method: "POST",
      url: "/user/login",
      payload: { email, password: "password123" },
    });
    token = loginRes.json().accessToken;
  });

  it("should handle the complete Quiz lifecycle and listing", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: "Life Cycle Quiz", description: "Initial" },
    });
    expect(createRes.statusCode).toBe(201);
    const quizId = createRes.json().id;

    const listRes = await app.inject({
      method: "GET",
      url: "/quizzes",
      headers: { "access-token": token },
    });
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.json())).toBe(true);
    expect(listRes.json().some((q) => q.id === quizId)).toBe(true);

    const updateRes = await app.inject({
      method: "PUT",
      url: `/quizzes/${quizId}`,
      headers: { "access-token": token },
      payload: { title: "Updated Title", description: "Updated Desc" },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().title).toBe("Updated Title");

    const getOne = await app.inject({
      method: "GET",
      url: `/quizzes/${quizId}`,
      headers: { "access-token": token },
    });
    expect(getOne.statusCode).toBe(200);
    expect(getOne.json().id).toBe(quizId);
  });

  it("should handle Question management and filtering by quiz", async () => {
    const qz = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: "Question Bank" },
    });
    const quizId = qz.json().id;

    const q1 = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: quizId,
        label: "Q1",
        type: "single",
        order_index: 1,
        timer_seconds: 30,
      },
    });
    expect(q1.statusCode).toBe(201);

    const q2 = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: quizId,
        label: "Q2",
        type: "multiple",
        order_index: 2,
        timer_seconds: 30,
      },
    });
    expect(q2.statusCode).toBe(201);

    const filterRes = await app.inject({
      method: "GET",
      url: `/questions/quiz/${quizId}`,
      headers: { "access-token": token },
    });
    expect(filterRes.statusCode).toBe(200);
    expect(filterRes.json()).toHaveLength(2);

    const allQuestions = await app.inject({
      method: "GET",
      url: "/questions",
      headers: { "access-token": token },
    });
    expect(allQuestions.statusCode).toBe(200);
    expect(allQuestions.json().length).toBeGreaterThanOrEqual(2);
  });

  it("should handle Choice management and filtering by question", async () => {
    const qz = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: "Choice Bank" },
    });
    const qn = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: qz.json().id,
        label: "Q",
        type: "single",
        order_index: 1,
        timer_seconds: 10,
      },
    });
    const questionId = qn.json().id;

    const c1 = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": token },
      payload: { question_id: questionId, text: "True", is_correct: true },
    });
    expect(c1.statusCode).toBe(201);

    await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": token },
      payload: { question_id: questionId, text: "False", is_correct: false },
    });

    const filterChoices = await app.inject({
      method: "GET",
      url: `/choices/question/${questionId}`,
      headers: { "access-token": token },
    });
    expect(filterChoices.statusCode).toBe(200);
    expect(filterChoices.json()).toHaveLength(2);

    const updateChoice = await app.inject({
      method: "PUT",
      url: `/choices/${c1.json().id}`,
      headers: { "access-token": token },
      payload: { text: "Modified", is_correct: false },
    });
    expect(updateChoice.statusCode).toBe(200);
    expect(updateChoice.json().text).toBe("Modified");
  });

  it("should verify DELETE CASCADE from Quiz -> Questions -> Choices", async () => {
    const qz = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: "Cascade Delete Test" },
    });
    const quizId = qz.json().id;

    const qn = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: quizId,
        label: "To be deleted",
        type: "single",
        order_index: 1,
        timer_seconds: 10,
      },
    });
    const questionId = qn.json().id;

    const ch = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": token },
      payload: { question_id: questionId, text: "Goodbye", is_correct: true },
    });
    const choiceId = ch.json().id;

    const delQuiz = await app.inject({
      method: "DELETE",
      url: `/quizzes/${quizId}`,
      headers: { "access-token": token },
    });
    expect(delQuiz.statusCode).toBe(204);

    const checkQuiz = await app.inject({
      method: "GET",
      url: `/quizzes/${quizId}`,
      headers: { "access-token": token },
    });
    expect(checkQuiz.statusCode).toBe(404);

    const checkQuestion = await app.inject({
      method: "GET",
      url: `/questions/${questionId}`,
      headers: { "access-token": token },
    });
    expect(checkQuestion.statusCode).toBe(404);

    const checkChoice = await app.inject({
      method: "GET",
      url: `/choices/${choiceId}`,
      headers: { "access-token": token },
    });
    expect(checkChoice.statusCode).toBe(404);
  });

  it("should return 401 when access-token is missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/quizzes",
    });
    expect(res.statusCode).toBe(401);
  });

  it("should return 404 for non-existent resources", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await app.inject({
      method: "GET",
      url: `/quizzes/${fakeId}`,
      headers: { "access-token": token },
    });
    expect(res.statusCode).toBe(404);
  });

  it("should return full quiz and quiz ids structure", async () => {
    const qz = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: "Full Data Quiz" },
    });
    const quizId = qz.json().id;

    const qn = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: quizId,
        label: "Q",
        type: "single",
        order_index: 0,
        timer_seconds: 10,
      },
    });
    const questionId = qn.json().id;

    await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": token },
      payload: { question_id: questionId, text: "Correct", is_correct: true },
    });

    const fullRes = await app.inject({
      method: "POST",
      url: "/quizzes/get-full",
      headers: { "access-token": token },
      payload: { quizId },
    });
    expect(fullRes.statusCode).toBe(200);
    const fullBody = fullRes.json();
    expect(fullBody.id).toBe(quizId);
    expect(fullBody.questions).toHaveLength(1);
    expect(fullBody.questions[0].choices).toHaveLength(1);

    const idsRes = await app.inject({
      method: "POST",
      url: "/quizzes/get-ids",
      headers: { "access-token": token },
      payload: { quizId },
    });
    expect(idsRes.statusCode).toBe(200);
    const idsBody = idsRes.json();
    expect(idsBody.quizId).toBe(quizId);
    expect(idsBody.questions[0].id).toBe(questionId);
    expect(idsBody.questions[0].choices).toHaveLength(1);
    expect(idsBody.questions[0].choices[0].id).toBeDefined();
  });
});
