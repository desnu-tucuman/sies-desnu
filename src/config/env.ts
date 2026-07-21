import { z } from "zod";

const envSchema = z.object({
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1),
  SIES_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Configuración del servidor incompleta o inválida: ${missingOrInvalid}. Revise .env.local.`,
    );
  }

  cachedEnv = {
    ...parsed.data,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:
      parsed.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
  return cachedEnv;
}

