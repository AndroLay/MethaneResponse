export function unexpectedCredentialEnvironmentNames(allowedNames: string[] = []): string[] {
  const allowed = new Set(allowedNames);
  return Object.keys(process.env).filter(name =>
    (/(TOKEN|KEY|SECRET|PASSWORD|RPC_URL|DATABASE_URL)/i.test(name) || /^VITE_/i.test(name))
      && !allowed.has(name));
}
