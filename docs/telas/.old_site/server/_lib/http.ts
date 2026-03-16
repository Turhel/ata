export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(res: any, status: number, body: any) {
  res
    .status(status)
    .setHeader("Content-Type", "application/json")
    .setHeader("Cache-Control", "private, no-store, max-age=0")
    .setHeader("Pragma", "no-cache")
    .setHeader("Expires", "0");
  res.end(JSON.stringify(body));
}

export function handleApiError(res: any, err: unknown) {
  if (err instanceof HttpError) {
    return json(res, err.status, { ok: false, error: err.code, message: err.message });
  }

  console.error(err);
  return json(res, 500, { ok: false, error: "INTERNAL_ERROR", message: "Unexpected error" });
}
