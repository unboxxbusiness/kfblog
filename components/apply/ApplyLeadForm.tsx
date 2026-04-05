'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

const applyLeadSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email address').max(160, 'Email is too long'),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  course: z.string().trim().min(1, 'Please select a course'),
  source_page_slug: z.string().trim().optional(),
  source_page_title: z.string().trim().optional(),
  college_name: z.string().trim().optional(),
})

type ApplyLeadFormValues = z.infer<typeof applyLeadSchema>

type ApplyLeadFormProps = {
  courses: string[]
  initialCourse?: string
  sourcePageSlug?: string | null
  sourcePageTitle?: string | null
  collegeName?: string | null
}

type FormFieldProps = {
  htmlFor: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FormField({ htmlFor, label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[#000000]">
        {label}
        {required ? <span className="ml-1 text-[#e40014]">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-[#e40014]">{error}</p> : null}
    </div>
  )
}

export default function ApplyLeadForm({
  courses,
  initialCourse,
  sourcePageSlug,
  sourcePageTitle,
  collegeName,
}: ApplyLeadFormProps) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedback, setFeedback] = React.useState('')

  const courseOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        courses
          .map((course) => String(course || '').trim())
          .filter(Boolean)
      )
    )
      .sort((a, b) => a.localeCompare(b))
      .map((course) => ({ label: course, value: course }))
  }, [courses])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ApplyLeadFormValues>({
    resolver: zodResolver(applyLeadSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      course: initialCourse || '',
      source_page_slug: sourcePageSlug || '',
      source_page_title: sourcePageTitle || '',
      college_name: collegeName || '',
    },
  })

  React.useEffect(() => {
    if (initialCourse) {
      setValue('course', initialCourse)
    }
  }, [initialCourse, setValue])

  React.useEffect(() => {
    setValue('source_page_slug', sourcePageSlug || '')
  }, [sourcePageSlug, setValue])

  React.useEffect(() => {
    setValue('source_page_title', sourcePageTitle || '')
  }, [sourcePageTitle, setValue])

  React.useEffect(() => {
    setValue('college_name', collegeName || '')
  }, [collegeName, setValue])

  const mobileField = register('mobile')

  const onSubmit = async (values: ApplyLeadFormValues) => {
    setStatus('loading')
    setFeedback('')

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit your details right now.')
      }

      setStatus('success')
      setFeedback('Thanks! Your application has been submitted successfully.')
      reset({
        name: '',
        email: '',
        mobile: '',
        course: values.course,
        source_page_slug: values.source_page_slug || '',
        source_page_title: values.source_page_title || '',
        college_name: values.college_name || '',
      })
    } catch {
      setStatus('error')
      setFeedback('Unable to submit your details right now. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <input type="hidden" {...register('source_page_slug')} />
      <input type="hidden" {...register('source_page_title')} />
      <input type="hidden" {...register('college_name')} />

      <FormField htmlFor="lead-name" label="Name" required error={errors.name?.message}>
        <Input
          id="lead-name"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          {...register('name')}
        />
      </FormField>

      <FormField htmlFor="lead-email" label="Email" required error={errors.email?.message}>
        <Input
          id="lead-email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          {...register('email')}
        />
      </FormField>

      <FormField htmlFor="lead-mobile" label="Mobile Number" required error={errors.mobile?.message}>
        <Input
          id="lead-mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          placeholder="10-digit mobile number"
          {...mobileField}
          onChange={(event) => {
            const digits = String(event.target.value || '').replace(/\D/g, '').slice(0, 10)
            event.target.value = digits
            mobileField.onChange(event)
          }}
        />
      </FormField>

      <FormField htmlFor="lead-course" label="Course" required error={errors.course?.message}>
        <Select
          id="lead-course"
          placeholder="Select a course"
          options={courseOptions}
          {...register('course')}
        />
      </FormField>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="w-full justify-center sm:w-auto"
        >
          {status === 'loading' ? 'Submitting...' : 'Submit Application'}
        </Button>
        <p className="text-xs text-[#666666]">We usually get back within 24 hours.</p>
      </div>

      {feedback ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            status === 'success'
              ? 'border-[#009767]/30 bg-[#d0fae5] text-[#007956]'
              : 'border-[#e40014]/30 bg-[#ffe2e2] text-[#bf000f]'
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback}
        </p>
      ) : null}
    </form>
  )
}
