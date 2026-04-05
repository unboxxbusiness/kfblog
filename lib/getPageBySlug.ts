import { supabase } from './supabase'
import { PageRow } from '../types'

export async function getPageBySlug(slug: string): Promise<PageRow | null> {
  if (!slug) return null
  const { data, error } = await supabase
    .from('pages')
    .select('slug, course, city, fee_range, exam_type, page_title, meta_desc, h1_text, content_json, published')
    .eq('slug', slug)
    .eq('published', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Supabase error', error.message)
    return null
  }

  if (!data) return null

  // Ensure content_json is parsed object
  const parsed = typeof data.content_json === 'string' ? JSON.parse(data.content_json) : data.content_json

  return {
    slug: data.slug,
    course: data.course,
    city: data.city,
    fee_range: data.fee_range,
    exam_type: data.exam_type,
    page_title: data.page_title,
    meta_desc: data.meta_desc,
    h1_text: data.h1_text,
    content_json: parsed,
    published: data.published
  }
}
