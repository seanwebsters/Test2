/**
 * Extension points for providers the studio doesn't ship yet. Nothing here is
 * called today; the registry reports honestly what is connected.
 */
export interface ImageProvider {
  id: string;
  generate(input: { prompt: string; width: number; height: number; style?: string }): Promise<{ mime: string; data: Buffer }>;
}
export interface SoundProvider {
  id: string;
  generate(input: { description: string; seconds: number }): Promise<{ mime: string; data: Buffer }>;
}
export interface AnalyticsSink {
  id: string;
  forward(events: { name: string; gameId: string; at: string; data?: Record<string, unknown> }[]): Promise<void>;
}
export interface DeployTarget {
  id: string;
  publish(bundle: Buffer, meta: { name: string; version: number }): Promise<{ url: string }>;
}

export interface ProviderStatus {
  kind: "Image generation" | "Sound generation" | "Analytics export" | "Deployment";
  connected: string | null;
  current: string;
}

export const providerRegistry = {
  image: null as ImageProvider | null,
  sound: null as SoundProvider | null,
  analytics: null as AnalyticsSink | null,
  deploy: null as DeployTarget | null,
};

export function providerStatus(): ProviderStatus[] {
  return [
    { kind: "Image generation", connected: providerRegistry.image?.id ?? null, current: "The Art Director writes procedural SVG motifs; the runtime renders scenes procedurally on canvas. No image model is called." },
    { kind: "Sound generation", connected: providerRegistry.sound?.id ?? null, current: "Interaction sounds are synthesised in the browser with Web Audio from the Art Director's scale and root note." },
    { kind: "Analytics export", connected: providerRegistry.analytics?.id ?? null, current: "Play events are stored locally in the studio's own store." },
    { kind: "Deployment", connected: providerRegistry.deploy?.id ?? null, current: "Export downloads a self-contained HTML5 bundle." },
  ];
}
