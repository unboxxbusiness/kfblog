'use client'

import * as React from 'react'

type Props = {
  children: any
  fallback?: any
}

type State = {
  hasError: boolean
}

class ErrorBoundaryImpl extends (React as any).Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fff8ec] p-4 text-sm text-[#d68502]">
          Something went wrong while rendering this section.
        </div>
      )
    }
    return this.props.children
  }
}

const ErrorBoundary = ErrorBoundaryImpl as any
export default ErrorBoundary
