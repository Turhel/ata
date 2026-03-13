type ApiUrlSource = "env" | "fallback";

export type WebEnv = {
  apiUrl: string;
  apiUrlSource: ApiUrlSource;
  apiUrlProblem?: string;
};

export function getWebEnv(): WebEnv {
  const raw = (import.meta as any).env?.VITE_API_URL as string | undefined;

  if (raw == null || raw.trim() === "") {
    const fallback = "http://localhost:3001";
    return {
      apiUrl: fallback,
      apiUrlSource: "fallback",
      apiUrlProblem: "VITE_API_URL não definido. Usando fallback http://localhost:3001."
    };
  }

  try {
    const url = new URL(raw);
    return { apiUrl: url.toString().replace(/\/$/, ""), apiUrlSource: "env" };
  } catch {
    return {
      apiUrl: raw,
      apiUrlSource: "env",
      apiUrlProblem: "VITE_API_URL inválido. Informe uma URL completa, ex.: http://localhost:3001."
    };
  }
}

