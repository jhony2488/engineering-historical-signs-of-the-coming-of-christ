type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function emailConfig() {
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  const resendKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const dryRunFlag = process.env.EMAIL_DRY_RUN === "true";
  const configured = Boolean(from && resendKey);

  return {
    from,
    resendKey,
    dryRun: dryRunFlag || !configured,
    configured,
  };
}

export function isEmailConfigured(): boolean {
  return emailConfig().configured;
}

export function isEmailDryRun(): boolean {
  return emailConfig().dryRun;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const { from, resendKey, dryRun } = emailConfig();

  if (dryRun) {
    console.info("[email/dry-run]", { to: input.to, subject: input.subject });
    return true;
  }

  const payload: Record<string, unknown> = {
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
  };
  if (input.html) {
    payload.html = input.html;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[email/resend]", response.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email/resend]", error);
    return false;
  }
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:sans-serif;line-height:1.5">${escaped.replace(/\n/g, "<br>")}</div>`;
}
