'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LOCK_DURATION_MS = 30_000
const MAX_FAILED_ATTEMPTS = 5

function getReadableError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password'
  if (lower.includes('fetch') || lower.includes('network')) return 'Connection failed. Please try again.'
  return 'Unable to sign in right now. Please try again.'
}

export default function AdminLoginPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [showPassword, setShowPassword] = React.useState(false)
  const [authError, setAuthError] = React.useState('')
  const [failedAttempts, setFailedAttempts] = React.useState(0)
  const [lockUntil, setLockUntil] = React.useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = React.useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const rememberedEmail = window.localStorage.getItem('kf_admin_email')
    if (rememberedEmail) {
      setValue('email', rememberedEmail)
      setValue('remember', true)
    }
  }, [setValue])

  React.useEffect(() => {
    if (!lockUntil) return

    const timer = window.setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockUntil(null)
        setSecondsLeft(0)
        setAuthError('')
        return
      }
      setSecondsLeft(remaining)
    }, 500)

    return () => window.clearInterval(timer)
  }, [lockUntil])

  const registerFailure = (message: string) => {
    setFailedAttempts((current) => {
      const next = current + 1
      if (next >= MAX_FAILED_ATTEMPTS) {
        setLockUntil(Date.now() + LOCK_DURATION_MS)
        setSecondsLeft(30)
        setAuthError('Too many attempts. Wait 30 seconds.')
        return 0
      }
      setAuthError(message)
      return next
    })
  }

  const onSubmit = async (values: LoginFormValues) => {
    if (lockUntil && Date.now() < lockUntil) {
      setAuthError(`Too many attempts. Wait ${secondsLeft || 30} seconds.`)
      return
    }

    setAuthError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    })

    if (error) {
      registerFailure(getReadableError(error.message))
      return
    }

    if (!data.user?.email) {
      registerFailure('Unable to verify your account. Please try again.')
      return
    }

    const authUserId = String(data.user.id || '').trim()

    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('id', authUserId)
      .maybeSingle()

    if (adminError || !adminRow?.id) {
      await supabase.auth.signOut()
      registerFailure('Your account does not have admin access')
      return
    }

    if (typeof window !== 'undefined') {
      if (values.remember) {
        window.localStorage.setItem('kf_admin_email', values.email.trim().toLowerCase())
      } else {
        window.localStorage.removeItem('kf_admin_email')
      }
      window.localStorage.setItem('kf_admin_last_seen_at', new Date().toISOString())
    }

    setFailedAttempts(0)
    setLockUntil(null)
    setSecondsLeft(0)
    toast.success('Signed in successfully')
    router.replace('/admin/dashboard')
  }

  const reason = searchParams.get('reason')
  const reasonText =
    reason === 'unauthenticated'
      ? 'Please sign in to continue.'
      : reason === 'unauthorized'
        ? 'You are signed in, but your account is not an admin.'
        : ''

  return (
    <main className="grid min-h-screen lg:grid-cols-[45%_55%]">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-[#14213d] via-[#1f2f57] to-[#29447e] p-10 text-white lg:flex">
        <div>
          <p className="text-3xl font-extrabold tracking-tight">Kampus Filter</p>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/70">Admin Panel</p>
          <h1 className="mt-12 text-4xl font-bold leading-tight">Manage leads, track enquiries, and grow admissions</h1>

          <div className="mt-10 space-y-4">
            {[
              'Real-time enquiry dashboard',
              'One-click Excel export',
              'Complete lead lifecycle management',
            ].map((line) => (
              <div key={line} className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-[#fca311]" />
                <p className="text-sm font-medium">{line}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/70">© {new Date().getFullYear()} Kampus Filter</p>
      </section>

      <section className="flex items-center justify-center bg-white px-4 py-10">
        <motion.div
          animate={authError ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-sm"
        >
          <h2 className="text-3xl font-bold text-[#000000]">Welcome back</h2>
          <p className="mt-2 text-sm text-[#666666]">Sign in to your admin account</p>

          {reasonText && <p className="mt-4 rounded-lg bg-[#fff8ec] px-3 py-2 text-sm text-[#d68502]">{reasonText}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#333333]">Email</label>
              <div className="flex items-center rounded-md border border-[#e5e5e5] px-3">
                <Mail className="h-4 w-4 text-[#666666]" />
                <input
                  autoFocus
                  type="email"
                  {...register('email')}
                  className="h-11 w-full bg-transparent px-2 text-sm text-[#333333] outline-none"
                  placeholder="admin@kampusfilter.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-[#d68502]">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#333333]">Password</label>
              <div className="flex items-center rounded-md border border-[#e5e5e5] px-3">
                <Lock className="h-4 w-4 text-[#666666]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="h-11 w-full bg-transparent px-2 text-sm text-[#333333] outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[#666666]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[#d68502]">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-[#333333]">
                <input type="checkbox" {...register('remember')} className="h-4 w-4 rounded border-[#e5e5e5]" />
                Remember me
              </label>
              <Link href="/admin/login/forgot-password" className="text-sm font-medium text-[#14213d] hover:text-[#29447e]">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (lockUntil !== null && Date.now() < lockUntil)}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#14213d] text-sm font-semibold text-white hover:bg-[#29447e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in...
                </span>
              ) : lockUntil && Date.now() < lockUntil ? (
                `Try again in ${secondsLeft}s`
              ) : (
                'Sign In'
              )}
            </button>

            {authError && <p className="rounded-md bg-[#fff8ec] px-3 py-2 text-sm text-[#d68502]">{authError}</p>}
          </form>
        </motion.div>
      </section>
    </main>
  )
}
