export type Translate = (key: string) => string;

export function translateRole(t: Translate, roleName: string): string {
  const key = `roles.${roleName}`;
  const translated = t(key);
  return translated === key ? roleName : translated;
}
