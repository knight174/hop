export interface View {
  destroy(): void;
  init?(): Promise<void>;
}
