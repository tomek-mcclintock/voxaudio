// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if this is a dashboard request
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Get the basic auth header
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !isValidAuth(authHeader)) {
      return new NextResponse(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Ruggable Dashboard"'
        },
      })
    }
  }

  return NextResponse.next()
}

function isValidAuth(authHeader: string): boolean {
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  const [username, password] = credentials.split(':')

  // Replace these with your desired credentials
  return username === 'ruggable' && password === 'feedback2024'
}