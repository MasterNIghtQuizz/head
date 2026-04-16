import { CreateResponseRequestDto } from "../contracts/response.dto.js";
import logger from "../../../logger.js";

export class ResponseController {
  constructor(responseService) {
    this.responseService = responseService;
  }

  register(fastify) {
    fastify.post("/responses/response", this.addResponse.bind(this));

    fastify.delete(
      "/responses/session/end/:sessionID",
      this.endSession.bind(this),
    );

    fastify.post(
      "/responses/session/start/:quizzID",
      this.startSession.bind(this),
    );

    fastify.get(
      "/responses/session/:sessionId",
      this.getAllSessionResponses.bind(this),
    );
    fastify.get(
      "/responses/participant/:participantId",
      this.getAllParticipantResponses.bind(this),
    );
    fastify.get(
      "/responses/question/:questionId",
      this.getAllQuestionResponses.bind(this),
    );
  }

  async addResponse(request, reply) {
    const { error, value } = CreateResponseRequestDto.validate(request.body);

    if (error) {
      return reply.status(400).send({
        message: error.message,
      });
    }

    try {
      const result = await this.responseService.handleAnswer(value);

      return reply.status(201).send({
        id: result.id,
        message: "Response submitted successfully",
      });
    } catch (err) {
      switch (err.message) {
        case "ALREADY_ANSWERED":
          return reply.status(409).send({
            message: "Participant already answered this question",
          });
        case "QUIZ_SERVICE_ERROR":
          return reply.status(502).send({
            message: "Failed to validate answer with quiz service",
          });
        case "DB_ERROR":
          return reply.status(500).send({
            message: "Database error",
          });
        default:
          return reply.status(500).send({
            message: "Internal server error",
          });
      }
    }
  }

  async endSession(request, reply) {
    const { sessionID } = request.params;
    const responses = await this.responseService.clearSession(sessionID);
    return reply.send(responses);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async startSession(request, reply) {
    const { quizzID } = request.params;
    const { hostId } = request.query;
    logger.info("startSession: " + quizzID);
    logger.info("request headers: " + request.headers);
    const responses = await this.responseService.fetchQuizz(
      quizzID,
      hostId,
      request,
    );
    return reply.send(responses);
  }

  async getAllSessionResponses(request, reply) {
    const { sessionId } = request.params;
    const responses =
      await this.responseService.getAllSessionResponses(sessionId);
    return reply.send(responses);
  }

  async getAllParticipantResponses(request, reply) {
    const { participantId } = request.params;
    const { sessionId } = request.query;
    const responses = await this.responseService.getResponsesByParticipant(
      participantId,
      sessionId,
    );
    return reply.send(responses);
  }

  async getAllQuestionResponses(request, reply) {
    const { questionId } = request.params;
    const { sessionId } = request.query;
    const responses = await this.responseService.getResponsesByQuestion(
      questionId,
      sessionId,
    );
    return reply.send(responses);
  }
}
