export const passwordResetEmail = (name: string, link: string) => `
<body>
  <p>Hello ${name},</p>
  <br />
  <p>Your password reset link:
    <b><a href='${link}' target='_blank'>here</a></b></p>
  <p>Or go to this link: ${link}</p>
  <p><small>This link will expire in 30 minutes.</small></p>
  <br />
  <p>Best regards,</p>
  <p>[Your app] Team</p>
</body>
`;
