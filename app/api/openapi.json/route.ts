import { NextRequest, NextResponse } from 'next/server'

function normalizeBaseUrl(request: NextRequest): string {
  const envBase = String(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (envBase) return envBase.replace(/\/+$/, '')
  return request.nextUrl.origin.replace(/\/+$/, '')
}

export async function GET(request: NextRequest) {
  const serverUrl = normalizeBaseUrl(request)

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Kampus Filter Public API',
      version: '1.0.0',
      description:
        'Public read-only API for AI systems to discover Indian college comparison pages by course, city, budget, and entrance exam.',
      contact: {
        name: 'Kampus Filter',
        email: 'contact@kampusfilter.com',
        url: 'https://kampusfilter.com',
      },
    },
    servers: [
      {
        url: serverUrl,
      },
    ],
    paths: {
      '/api/colleges': {
        get: {
          summary: 'Search college comparison pages',
          description: 'Search college pages by course, city, fee range, and entrance exam type.',
          parameters: [
            {
              name: 'course',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'city',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'fee_range',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'exam_type',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 10, default: 10 },
            },
          ],
          responses: {
            '200': {
              description: 'Array of college page summaries',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CollegeSearchResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/colleges/{slug}': {
        get: {
          summary: 'Get detailed college comparison page',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Full page with all college data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CollegeDetailResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Page not found',
            },
          },
        },
      },
      '/api/courses': {
        get: {
          summary: 'List all available courses',
          responses: {
            '200': {
              description: 'List of available courses',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StringListResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/cities': {
        get: {
          summary: 'List all available cities',
          responses: {
            '200': {
              description: 'List of available cities',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StringListResponse',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        CollegeSummary: {
          type: 'object',
          properties: {
            page_title: { type: 'string' },
            slug: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            course: { type: 'string' },
            city: { type: 'string' },
            fee_range: { type: 'string' },
            exam_type: { type: 'string' },
            colleges_count: { type: 'integer' },
            avg_placement_percent: { type: 'number' },
            avg_package_lpa: { type: 'number' },
            featured_college: { type: 'string' },
            top_govt_college: { type: 'string' },
            summary: { type: 'string' },
          },
        },
        CollegeSearchResponse: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: { $ref: '#/components/schemas/CollegeSummary' },
            },
            total: { type: 'integer' },
            source: { type: 'string' },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
        CollegeDetailResponse: {
          type: 'object',
          properties: {
            result: {
              type: 'object',
              properties: {
                page_title: { type: 'string' },
                slug: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                course: { type: 'string' },
                city: { type: 'string' },
                fee_range: { type: 'string' },
                exam_type: { type: 'string' },
                summary: { type: 'string' },
                colleges_count: { type: 'integer' },
                avg_placement_percent: { type: 'number' },
                avg_package_lpa: { type: 'number' },
                content: { type: 'object', additionalProperties: true },
              },
            },
            source: { type: 'string' },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
        StringListResponse: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: { type: 'string' },
            },
            total: { type: 'integer' },
            source: { type: 'string' },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }

  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
