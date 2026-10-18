import type { AiJobRecord, AiSeriesRecord, CollectionRecord, UserRecord } from "../model";

export interface Store {
  readonly kind: "json" | "supabase";
  getUser(id: string): Promise<UserRecord | null>;
  saveUser(user: UserRecord, previous: UserRecord | null): Promise<void>;
  findUserByHandle(handle: string): Promise<UserRecord | null>;
  findUserByStripeCustomer(customerId: string): Promise<UserRecord | null>;
  listCollections(): Promise<CollectionRecord[]>;
  getCollection(id: string): Promise<CollectionRecord | null>;
  saveCollection(c: CollectionRecord): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  getAiSeries(id: string): Promise<AiSeriesRecord | null>;
  saveAiSeries(s: AiSeriesRecord): Promise<void>;
  getJob(id: string): Promise<AiJobRecord | null>;
  saveJob(j: AiJobRecord): Promise<void>;
  putAudio(key: string, data: Buffer): Promise<void>;
  getAudio(key: string): Promise<Buffer | null>;
}
