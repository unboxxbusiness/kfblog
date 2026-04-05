import { NextResponse } from 'next/server'
import { getCities, getCourses, getExamTypes } from '../../../lib/api'

export async function GET() {
  const [courses, cities, exams] = await Promise.all([getCourses(), getCities(), getExamTypes()])

  return NextResponse.json({
    courses,
    cities,
    exams,
  })
}
