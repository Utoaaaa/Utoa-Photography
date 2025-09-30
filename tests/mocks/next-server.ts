export class NextResponse {
  status: number;
  body: any;
  headers: any;
  constructor(body?: any, init?: { status?: number; headers?: any }) {
    this.status = init?.status ?? 200;
    this.body = body ?? null;
    this.headers = init?.headers ?? {};
    // For simplicity in tests, return a plain object
    return { status: this.status, body: this.body, headers: this.headers } as any;
  }
  static json(body: any, init?: { status?: number; headers?: any }) {
    return { status: init?.status ?? 200, body, headers: init?.headers ?? {} } as any;
  }
}
