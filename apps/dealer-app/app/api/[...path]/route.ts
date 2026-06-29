import { NextResponse } from 'next/server';

const BACKEND_API_BASE_URL = (process.env.LOT_PILOT_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const requestUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path.join('/')}${requestUrl.search}`, BACKEND_API_BASE_URL);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store'
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json'
    }
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
