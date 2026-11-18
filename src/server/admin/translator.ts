/** Translator callback accepted by server-side admin helpers. */
export type AdminTranslator = (key: string, values?: Record<string, string | number>) => string;
