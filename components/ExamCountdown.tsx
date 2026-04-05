'use client'

import * as React from 'react'

type Exam = {
  name: string
  date: string
}

const CURRENT_YEAR = new Date().getFullYear()

const EXAMS: Exam[] = [
  { name: 'JEE Main', date: `${CURRENT_YEAR}-04-04` },
  { name: 'NEET', date: `${CURRENT_YEAR}-05-05` },
  { name: 'CUET', date: `${CURRENT_YEAR}-05-15` },
  { name: 'CAT', date: `${CURRENT_YEAR}-11-24` },
  { name: 'MAT', date: `${CURRENT_YEAR}-09-14` }
]

function daysRemaining(isoDate: string, now: Date) {
  const examDate = new Date(isoDate)
  const diffMs = examDate.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function urgencyClass(days: number) {
  if (days < 30) return 'bg-[#fff8ec] text-[#d68502]'
  if (days < 90) return 'bg-[#fff4df] text-[#d68502]'
  return 'bg-[#eef2f8] text-[#14213d]'
}

export default function ExamCountdown() {
  const [now, setNow] = React.useState(new Date())

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <aside className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <h3 className="text-base font-bold text-[#000000]">Exam Countdown</h3>
      <p className="mt-1 text-xs text-[#666666]">Track important entrance exam timelines.</p>

      <div className="mt-4 space-y-3">
        {EXAMS.map((exam) => {
          const days = daysRemaining(exam.date, now)
          const displayDays = days > 0 ? `${days} days` : 'Completed'

          return (
            <div key={exam.name} className="rounded-lg border border-[#e5e5e5] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#000000]">{exam.name}</div>
                  <div className="text-xs text-[#666666]">{new Date(exam.date).toDateString()}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${urgencyClass(Math.max(days, 0))}`}>
                  {displayDays}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
