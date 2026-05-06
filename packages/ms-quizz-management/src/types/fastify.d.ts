import { QuizService } from '../modules/quiz/services/quiz.service.js';
import { QuestionService } from '../modules/quiz/services/question.service.js';
import { ChoiceService } from '../modules/quiz/services/choice.service.js';
import { ValkeyService } from 'common-valkey';

declare module 'fastify' {
  interface FastifyInstance {
    quizService: QuizService;
    questionService: QuestionService;
    choiceService: ChoiceService;
    valkeyService: ValkeyService;
    kafkaProducer: import('common-kafka').KafkaProducer | null;
    kafkaConsumer: import('common-kafka').KafkaConsumer | null;
  }
  export type AppInstance = FastifyInstance;
}
