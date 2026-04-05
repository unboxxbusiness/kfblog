'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type ForgotPasswordValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const supabase = createClientComponentClient()
  const [sent, setSent] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setErrorMessage('')

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim().toLowerCase(), {
      redirectTo: `${baseUrl}/admin/auth/callback`,
    })

    if (error) {
      setErrorMessage('Unable to send reset email right now. Please try again.')
      return
    }

    setSent(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-[#e5e5e5] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#000000]">Forgot your password?</h1>
        <p className="mt-2 text-sm text-[#666666]">Enter your admin email and we will send a secure reset link.</p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-[#e5e5e5] bg-[#f5f7fb] p-4 text-sm text-[#14213d]">
            Check your email for a reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#333333]">Email</label>
              <input
                type="email"
                {...register('email')}
                className="h-11 w-full rounded-md border border-[#e5e5e5] px-3 text-sm text-[#333333] outline-none focus:border-[#14213d] focus:ring-2 focus:ring-[#29447e]/25"
                placeholder="admin@kampusfilter.com"
              />
              {errors.email && <p className="mt-1 text-xs text-[#d68502]">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-md bg-[#14213d] text-sm font-semibold text-white hover:bg-[#29447e] disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            {errorMessage && <p className="rounded-md bg-[#fff8ec] px-3 py-2 text-sm text-[#d68502]">{errorMessage}</p>}
          </form>
        )}

        <Link href="/admin/login" className="mt-6 inline-block text-sm font-medium text-[#14213d] hover:text-[#29447e]">
          Back to login
        </Link>
      </section>
    </main>
  )
}
