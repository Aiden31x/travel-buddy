import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return new Response(JSON.stringify({ message: 'Test route works' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}