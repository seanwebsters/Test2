const jar = new Map<string, string>();
export async function cookies() {
  return {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  };
}
export async function headers() {
  return new Headers();
}
