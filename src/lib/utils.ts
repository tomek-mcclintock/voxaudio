export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function generateCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getCompanyFromDomain(domain: string): string | null {
  try {
    const url = new URL(domain);
    return url.hostname;
  } catch {
    return domain;
  }
}