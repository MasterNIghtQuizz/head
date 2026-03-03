export declare abstract class DatabaseStrategy {
  connect(config: Record<string, any>): Promise<void>;
  runMigrations(): Promise<any>;
  disconnect(): Promise<void>;

  get instance(): any;
}
