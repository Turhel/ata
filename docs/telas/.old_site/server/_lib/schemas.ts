import { z } from "zod";
import { HttpError } from "./auth.js";

// Schema para criacao de inspetor
export const InspectorCreateSchema = z.object({
  // Opcional: permite testes/imports criarem IDs determinísticos.
  // Se não for enviado, o backend gera via randomUUID().
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome e obrigatorio"),
  code: z.string().min(1, "Codigo e obrigatorio").max(10, "Codigo muito longo"),
});

// Schema para atualizacao de inspetor
export const InspectorUpdateSchema = z
  .object({
    name: z.string().min(1, "Nome e obrigatorio").optional(),
    code: z.string().min(1, "Codigo e obrigatorio").max(10, "Codigo muito longo").optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.code !== undefined || data.active !== undefined, {
    message: "Pelo menos um campo deve ser atualizado",
  });

// Schema para criacao de work type
export const WorkTypeCreateSchema = z.object({
  code: z.string().min(1, "Codigo e obrigatorio"),
  category: z.string().min(1, "Categoria e obrigatoria"),
  // Frontend envia `null` quando vazio
  description: z.string().nullable().optional(),
  assistant_value: z.number().optional(),
  inspector_value: z.number().optional(),
  active: z.boolean().optional(),
});

// Schema para atualizacao de work type
export const WorkTypeUpdateSchema = z
  .object({
    code: z.string().min(1, "Codigo e obrigatorio").optional(),
    category: z.string().min(1, "Categoria e obrigatoria").optional(),
    // Frontend envia `null` quando vazio
    description: z.string().nullable().optional(),
    assistant_value: z.number().optional(),
    inspector_value: z.number().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.code !== undefined ||
      data.category !== undefined ||
      data.description !== undefined ||
      data.assistant_value !== undefined ||
      data.inspector_value !== undefined ||
      data.active !== undefined,
    { message: "Pelo menos um campo deve ser atualizado" },
  );

// Schema para criacao de convite
export const InvitationCreateSchema = z.object({
  role: z.enum(["user", "admin", "master"], {
    errorMap: () => ({ message: "Role deve ser user, admin ou master" }),
  }),
  // UI envia `null` quando "sem expiração"
  expires_at: z.string().nullable().optional(),
});

// Schema para atualizacao de perfil
export const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1, "Nome e obrigatorio").optional(),
  phone: z.string().optional(),
  weekly_goal: z.number().min(0, "Meta semanal deve ser positiva").optional(),
});

// Schema para criacao de team assignment
export const TeamAssignmentCreateSchema = z.object({
  admin_id: z.string().min(1, "ID do admin e obrigatorio"),
  assistant_id: z.string().min(1, "ID do assistente e obrigatorio"),
});

// Helper para validar dados com Zod e retornar 400 (nao 500) em caso de erro.
export function validateData<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => err.message).join(", ");
    throw new HttpError(400, `Dados invalidos: ${errorMessages}`);
  }
  return result.data;
}
