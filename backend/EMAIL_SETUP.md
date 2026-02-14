# Email Monitoring Setup for Ciri

Ciri can automatically monitor your email inbox for incoming invoices and receipts, process them through OCR, and add them to your accounting system.

## How It Works

1. **Incoming Email**: Invoices/receipts are sent or forwarded to your Ciri email address
2. **Webhook**: Email provider sends the email to Ciri's API
3. **Processing**: Ciri extracts attachments and runs OCR
4. **Categorization**: Ciri auto-categorizes based on sender and content
5. **Matching**: Ciri attempts to match with bank transactions
6. **Activity Log**: All actions are logged to Ciri's activity timeline

## Supported Providers

### Option 1: Postmark (Recommended)

Postmark offers reliable inbound email processing with excellent deliverability.

#### Setup Steps:

1. **Create Postmark Account**
   - Go to https://postmarkapp.com
   - Create a new server for Ciri

2. **Configure Inbound Processing**
   - Go to Servers → Your Server → Settings → Inbound
   - Set the webhook URL: `https://your-api.com/api/email/postmark`
   - Copy your Inbound Token

3. **Set Up DNS**
   - Add MX record pointing to Postmark's inbound servers
   - Example: `inbound.postmarkapp.com` with priority 10

4. **Configure Environment**
   ```env
   EMAIL_PROVIDER=postmark
   EMAIL_INBOUND_ADDRESS=bilag@inbound.yourcompany.com
   POSTMARK_SERVER_TOKEN=your-server-token
   POSTMARK_INBOUND_TOKEN=your-inbound-token
   COMPANY_NAME=Your Company AS
   ```

### Option 2: SendGrid

SendGrid's Inbound Parse is another reliable option.

#### Setup Steps:

1. **Create SendGrid Account**
   - Go to https://sendgrid.com
   - Navigate to Settings → Inbound Parse

2. **Add Domain**
   - Add your receiving domain (e.g., `inbound.yourcompany.com`)
   - Set URL: `https://your-api.com/api/email/sendgrid`

3. **Configure MX Records**
   - Point your subdomain's MX record to `mx.sendgrid.net`

4. **Configure Environment**
   ```env
   EMAIL_PROVIDER=sendgrid
   EMAIL_INBOUND_ADDRESS=bilag@inbound.yourcompany.com
   SENDGRID_API_KEY=your-api-key
   COMPANY_NAME=Your Company AS
   ```

## Email Address Patterns

Users can send invoices to Ciri using several patterns:

| Address | Purpose |
|---------|---------|
| `bilag@inbound.yourcompany.com` | General invoice/receipt inbox |
| `faktura@inbound.yourcompany.com` | Specifically for invoices |
| `kvittering@inbound.yourcompany.com` | Specifically for receipts |

## Automatic Forwarding

Set up automatic forwarding from your main email to Ciri:

### Gmail:
1. Settings → Forwarding
2. Add forwarding address: `bilag@inbound.yourcompany.com`
3. Create filter for invoices (e.g., subject contains "faktura")
4. Set filter to forward to Ciri

### Outlook:
1. Settings → Mail → Rules
2. Create rule for messages from known invoice senders
3. Forward to Ciri's address

## Manual Submission

Users can also manually forward emails or use the API:

```bash
curl -X POST https://your-api.com/api/email/submit \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "supplier@example.com",
    "subject": "Faktura #12345",
    "attachments": [{
      "filename": "faktura.pdf",
      "content_base64": "base64-encoded-content",
      "content_type": "application/pdf"
    }]
  }'
```

## Activity Feed

Ciri logs all email processing activities:

```bash
# Get recent activities
curl https://your-api.com/api/email/activities?limit=20

# Get activity statistics
curl https://your-api.com/api/email/activities/stats
```

## Security Considerations

1. **Webhook Verification**: Validate that webhooks come from your email provider
2. **Rate Limiting**: Implement rate limiting on webhook endpoints
3. **Attachment Scanning**: Scan attachments for malware before processing
4. **Email Filtering**: Only process emails from known/expected senders

## Troubleshooting

### Emails Not Being Received

1. Check MX records are correctly configured
2. Verify webhook URL is accessible
3. Check email provider's delivery logs
4. Ensure firewall allows incoming requests

### OCR Not Working

1. Check Ollama is running with Qwen2.5-VL model
2. Verify attachment is a supported format (PDF, PNG, JPG)
3. Check image quality is sufficient for OCR

### Activities Not Showing

1. Check API connectivity
2. Verify `/api/email/activities` endpoint is working
3. Check browser console for errors

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/email/postmark` | Postmark inbound webhook |
| POST | `/api/email/sendgrid` | SendGrid inbound webhook |
| POST | `/api/email/submit` | Manual email submission |
| GET | `/api/email/activities` | Get activity feed |
| GET | `/api/email/activities/stats` | Get activity statistics |
| GET | `/api/email/config/status` | Check configuration status |
