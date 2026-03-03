import { BaseService } from "common-core";

export class UserService extends BaseService {
  /**
   * Health check for user service
   * @returns {import('common-contracts').HealthCheckResponseDto}
   */
  checkHealth() {
    return { ok: true };
  }
}
