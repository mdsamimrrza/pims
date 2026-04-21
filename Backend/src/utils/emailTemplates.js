export const buildInviteEmail = ({ firstName, lastName, email, role, password, loginUrl }) => {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email
  const html = `
    <h1>PIMS Account Created</h1>
    <p>Hello ${displayName},</p>
    <p>Your PIMS account is ready.</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Role:</strong> ${role}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
    <p>Sign in from the PIMS frontend and change your password when needed.</p>
    ${loginUrl ? `<p><a href="${loginUrl}">${loginUrl}</a></p>` : ''}
  `.trim()

  const text = [
    'PIMS Account Created',
    `Hello ${displayName},`,
    `Email: ${email}`,
    `Role: ${role}`,
    `Password: ${password}`,
    loginUrl ? `Login link: ${loginUrl}` : null,
    'Sign in from the PIMS frontend and change your password when needed.',
  ].filter(Boolean).join('\n')

  return {
    subject: 'Your PIMS account is ready',
    html,
    text,
  }
}

export const buildPasswordResetEmail = ({ firstName, lastName, email, resetToken, resetUrl }) => {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email
  const html = `
    <h1>Reset Your PIMS Password</h1>
    <p>Hello ${displayName},</p>
    <p>Use the link below or enter the one-time code in the UI:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p><strong>Reset code:</strong> ${resetToken}</p>
    <p>This code expires soon. If you did not request a password reset, ignore this email.</p>
  `.trim()

  const text = [
    'Reset Your PIMS Password',
    `Hello ${displayName},`,
    `Reset link: ${resetUrl}`,
    `Reset code: ${resetToken}`,
    'This code expires soon. If you did not request a password reset, ignore this email.',
  ].join('\n')

  return {
    subject: 'Reset your PIMS password',
    html,
    text,
  }
}

export const buildPasswordChangedEmail = ({ firstName, lastName, email }) => {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email
  const html = `
    <h1>PIMS Password Changed</h1>
    <p>Hello ${displayName},</p>
    <p>Your PIMS password was changed successfully.</p>
    <p>If you did not make this change, contact an administrator immediately.</p>
  `.trim()

  const text = [
    'PIMS Password Changed',
    `Hello ${displayName},`,
    'Your PIMS password was changed successfully.',
    'If you did not make this change, contact an administrator immediately.',
  ].join('\n')

  return {
    subject: 'Your PIMS password was changed',
    html,
    text,
  }
}

export const buildPrescriptionNotificationEmail = ({
  rxId,
  patientName,
  doctorName,
  isUrgent,
}) => {
  const priority = isUrgent ? 'Urgent' : 'Standard'

  const html = `
    <h1>New Prescription Submitted</h1>
    <p>A new prescription has been submitted in PIMS.</p>
    <ul>
      <li><strong>Rx ID:</strong> ${rxId}</li>
      <li><strong>Patient:</strong> ${patientName}</li>
      <li><strong>Doctor:</strong> ${doctorName}</li>
      <li><strong>Priority:</strong> ${priority}</li>
    </ul>
    <p>Please review it in the pharmacist workflow.</p>
  `.trim()

  const text = [
    'New Prescription Submitted',
    `Rx ID: ${rxId}`,
    `Patient: ${patientName}`,
    `Doctor: ${doctorName}`,
    `Priority: ${priority}`,
    'Please review it in the pharmacist workflow.',
  ].join('\n')

  return {
    subject: `Prescription ${rxId} submitted`,
    html,
    text,
  }
}
