export const confirmationEmail = (name: string, link: string) => `
<body>
  <p>Hello ${name},</p>
  <br />
  <p>Welcome to [Your app],</p>
  <p>
    Click
    <b><a href='${link}' target='_blank'>here</a></b>
    to activate your acount or go to this link:
    ${link}
  </p>
  <p><small>This link will expire in an hour.</small></p>
  <br />
  <p>Best of luck,</p>
  <p>[Your app] Team</p>
</body>
`;
