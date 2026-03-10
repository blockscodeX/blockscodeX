import { NextResponse } from "next/server"
import Mailjet from "node-mailjet"
import { LRUCache } from "lru-cache"
import { siteConfig } from "../../config/site"

// Rate limiting: 5 requests per IP per hour
const rateLimit = new LRUCache<string, number>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
})

const MAILJET_API_KEY = process.env.MAILJET_API_KEY
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY
const SENDER_EMAIL = process.env.MAILJET_SENDER_EMAIL || "sumanydv514@gmail.com" // Ideally a verified sender in Mailjet
const RECIPIENT_EMAIL = "sumanydv514@gmail.com"

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    const currentUsage = rateLimit.get(ip) || 0

    if (currentUsage >= 5) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }
    rateLimit.set(ip, currentUsage + 1)

    // 2. Parse Body
    const body = await request.json()
    const { name, email, subject, message, website } = body

    // 3. Honeypot Check
    if (website) {
      // Silently fail for bots
      return NextResponse.json({ success: true })
    }

    // 4. Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 5. Mailjet Setup
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      console.error("Mailjet credentials missing")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const mailjet = Mailjet.apiConnect(MAILJET_API_KEY, MAILJET_SECRET_KEY)

    // 6. Send Email
    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: SENDER_EMAIL,
            Name: siteConfig.contactFormName,
          },
          To: [
            {
              Email: RECIPIENT_EMAIL,
              Name: "Admin",
            },
          ],
          ReplyTo: {
            Email: email,
            Name: name,
          },
          Subject: `[Contact Form] ${subject}`,
          TextPart: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
          HTMLPart: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <br/>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, "<br>")}</p>
          `,
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Contact API error:", error)
    // Log detailed Mailjet error if available
    if (error.statusCode && error.response) {
      console.error("Mailjet Error Details:", JSON.stringify(error.response.body, null, 2))
    }
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    )
  }
}
