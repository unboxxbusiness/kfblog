import { createAdminClient } from './admin-auth'

type LogStatus = 'success' | 'error'

export async function logCronEvent(args: {
  job: string
  status: LogStatus
  message: string
  details?: Record<string, unknown>
}) {
  const adminClientResult = createAdminClient()
  if (!adminClientResult.data) return

  const client = adminClientResult.data
  const createdAt = new Date().toISOString()

  const payloads = [
    {
      job_name: args.job,
      status: args.status,
      message: args.message,
      details: args.details || {},
      created_at: createdAt,
    },
    {
      event: args.job,
      status: args.status,
      message: args.message,
      payload: args.details || {},
      created_at: createdAt,
    },
  ]

  for (const payload of payloads) {
    const { error } = await client.from('cron_logs').insert(payload as Record<string, unknown>)
    if (!error) return
  }
}
