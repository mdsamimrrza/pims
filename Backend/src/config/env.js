const requiredEnv = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
  'ADMIN_SETUP_TOKEN',
]

export const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key])
  const emailMode = String(process.env.EMAIL_MODE || 'file').trim().toLowerCase()

  if (emailMode === 'smtp') {
    const smtpRequiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
    missing.push(...smtpRequiredEnv.filter((key) => !process.env[key]))
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (process.env.ADMIN_SETUP_TOKEN && process.env.ADMIN_SETUP_TOKEN.length < 6) {
    throw new Error('ADMIN_SETUP_TOKEN must be at least 6 characters long')
  }
}
