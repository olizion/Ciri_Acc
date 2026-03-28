"""
Invoice Email Template
Renders inline-CSS HTML email — Nordic Editorial aesthetic
Matches the weekly summary email design: forest green gradient,
Georgia serif typography, sage color palette.
"""


def render_invoice_email(
    invoice_number: str,
    customer_name: str,
    company_name: str,
    description: str,
    amount: str,
    mva_amount: str,
    total_amount: str,
    due_date: str,
    public_url: str,
    bank_account: str = "",
    kid_number: str = "",
) -> str:
    """Render an HTML email for an invoice — Nordic Editorial style."""

    kid_row = ""
    if kid_number:
        kid_row = f"""
                <tr>
                    <td style="padding: 14px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #96AFA8; border-bottom: 1px solid #eef1eb;">KID-nummer</td>
                    <td style="padding: 14px 20px; font-family: 'SF Mono', 'Cascadia Mono', 'Fira Code', 'Consolas', monospace; font-size: 14px; color: #2d3a2e; text-align: right; letter-spacing: 0.04em; border-bottom: 1px solid #eef1eb;">{kid_number}</td>
                </tr>"""

    bank_row = ""
    if bank_account:
        bank_row = f"""
                <tr>
                    <td style="padding: 14px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #96AFA8; border-bottom: 1px solid #eef1eb;">Bankkonto</td>
                    <td style="padding: 14px 20px; font-family: 'SF Mono', 'Cascadia Mono', 'Fira Code', 'Consolas', monospace; font-size: 14px; color: #2d3a2e; text-align: right; letter-spacing: 0.04em; border-bottom: 1px solid #eef1eb;">{bank_account}</td>
                </tr>"""

    return f"""<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Faktura {invoice_number} &ndash; {company_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2ed; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f0f2ed;">
<tr><td style="padding: 32px 16px;">

<!-- Main container -->
<table width="600" cellpadding="0" cellspacing="0" align="center" role="presentation" style="max-width: 600px; width: 100%; margin: 0 auto;">

    <!-- Header -->
    <tr><td style="padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(160deg, #2d4a3e 0%, #3E715C 35%, #5B906F 70%, #7aa88a 100%); border-radius: 16px 16px 0 0;">
            <tr><td style="padding: 48px 40px 40px;">

                <!-- Top bar -->
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.5); padding-bottom: 24px;">
                        Faktura &middot; {company_name}
                    </td>
                    <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; letter-spacing: 0.08em; color: rgba(255,255,255,0.4); padding-bottom: 24px;">
                        &#9679; CIRI
                    </td>
                </tr></table>

                <!-- Invoice number -->
                <h1 style="margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; font-weight: 400; color: #ffffff; letter-spacing: -0.03em; line-height: 1.15;">
                    {invoice_number}
                </h1>

                <!-- Decorative line -->
                <div style="width: 48px; height: 2px; background: rgba(207,206,161,0.5); margin: 20px 0 16px; border-radius: 1px;"></div>

                <!-- Description -->
                <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-style: italic; color: rgba(255,255,255,0.65); line-height: 1.5;">
                    {description}
                </p>

            </td></tr>
        </table>
    </td></tr>

    <!-- Greeting + total amount highlight -->
    <tr><td style="padding: 0;">
        <div style="background: #ffffff; padding: 36px 40px 32px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;">

            <p style="margin: 0 0 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #96AFA8;">Til betaling</p>
            <p style="margin: 0 0 20px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #2d3a2e; line-height: 1.5;">
                Hei {customer_name},
            </p>

            <!-- Total amount card -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                    <td style="padding: 0;">
                        <div style="background: linear-gradient(180deg, #f4f7f2 0%, #eef3eb 100%); border-radius: 12px; padding: 28px 24px; text-align: center; border: 1px solid #e2e8dd;">
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #7a8a7c; margin-bottom: 8px;">Totalt &aring; betale</div>
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 42px; font-weight: 600; color: #3E715C; letter-spacing: -0.03em; line-height: 1;">kr {total_amount}</div>
                            <div style="margin-top: 10px; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-style: italic; color: #96AFA8;">
                                Forfaller {due_date}
                            </div>
                        </div>
                    </td>
                </tr>
            </table>

        </div>
    </td></tr>

    <!-- Golden divider -->
    <tr><td style="background: #ffffff; padding: 0 40px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;">
        <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #CFCEA1 30%, #9AAD83 50%, #CFCEA1 70%, transparent 100%);"></div>
    </td></tr>

    <!-- Spacer -->
    <tr><td style="background: #ffffff; padding: 0; height: 28px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;"></td></tr>

    <!-- Invoice details table -->
    <tr><td style="padding: 0; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;">
        <div style="background: #ffffff; padding: 0 40px 32px;">

            <!-- Section header -->
            <p style="margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #96AFA8;">Fakturadetaljer</p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(62,113,92,0.06);">
                <tr>
                    <td style="padding: 14px 20px; background: #f8faf7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #96AFA8; border-bottom: 1px solid #eef1eb;">Beskrivelse</td>
                    <td style="padding: 14px 20px; background: #f8faf7; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; color: #2d3a2e; text-align: right; border-bottom: 1px solid #eef1eb;">{description}</td>
                </tr>
                <tr>
                    <td style="padding: 14px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #96AFA8; border-bottom: 1px solid #eef1eb;">Bel&oslash;p eks. MVA</td>
                    <td style="padding: 14px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 14px; color: #2d3a2e; text-align: right; border-bottom: 1px solid #eef1eb;">kr {amount}</td>
                </tr>
                <tr>
                    <td style="padding: 14px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #96AFA8; border-bottom: 1px solid #eef1eb;">MVA</td>
                    <td style="padding: 14px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 14px; color: #2d3a2e; text-align: right; border-bottom: 1px solid #eef1eb;">kr {mva_amount}</td>
                </tr>
                <tr>
                    <td style="padding: 16px 20px; background: #3E715C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.7); border-bottom: 1px solid #eef1eb;">Totalt</td>
                    <td style="padding: 16px 20px; background: #3E715C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 20px; font-weight: 600; color: #ffffff; text-align: right; letter-spacing: -0.01em; border-bottom: 1px solid #eef1eb;">kr {total_amount}</td>
                </tr>
                <tr>
                    <td style="padding: 14px 20px; background: #f8faf7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #96AFA8; border-bottom: 1px solid #eef1eb;">Forfallsdato</td>
                    <td style="padding: 14px 20px; background: #f8faf7; font-family: 'SF Mono', 'Cascadia Mono', 'Fira Code', 'Consolas', monospace; font-size: 14px; color: #2d3a2e; text-align: right; letter-spacing: 0.02em; border-bottom: 1px solid #eef1eb;">{due_date}</td>
                </tr>{bank_row}{kid_row}
            </table>

        </div>
    </td></tr>

    <!-- CTA section -->
    <tr><td style="padding: 0;">
        <div style="background: #ffffff; padding: 32px 40px 40px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4; border-radius: 0 0 16px 16px; text-align: center;">

            <!-- Decorative element -->
            <div style="width: 32px; height: 32px; margin: 0 auto 20px; border: 2px solid #CFCEA1; border-radius: 50%; opacity: 0.5;"></div>

            <p style="margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #2d3a2e; letter-spacing: -0.02em;">
                Se fullstendig faktura
            </p>
            <p style="margin: 0 0 24px; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-style: italic; color: #96AFA8; line-height: 1.5;">
                &Aring;pne for detaljer og betalingsinformasjon.
            </p>

            <a href="{public_url}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(160deg, #3E715C, #5B906F); color: #ffffff; text-decoration: none; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(62,113,92,0.25), 0 1px 3px rgba(62,113,92,0.15);">
                &Aring;pne faktura &rarr;
            </a>

        </div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding: 28px 40px 16px; text-align: center;">
        <p style="margin: 0 0 6px; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; color: #96AFA8;">
            Sendt via Ciri
        </p>
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; color: #bfc7b8; letter-spacing: 0.05em;">
            P&aring; vegne av {company_name}
        </p>
    </td></tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>"""
