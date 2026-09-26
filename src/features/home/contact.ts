import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";
import sanitizeHtml from "sanitize-html";
import { whatsappService } from "@/services/whatsapp.service";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const contactActions = {
  sendContact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(2, "Nama minimal 2 karakter"),
      email: z.string().email("Email tidak valid"),
      subject: z.string().min(5, "Subjek minimal 5 karakter"),
      message: z.string().min(10, "Pesan minimal 10 karakter"),
      hp: z.string().optional(), // Honeypot field
    }),
    handler: async (input) => {
      // Honeypot check
      if (input.hp) {
        return { success: true }; // Silent fail for bots
      }

      // Sanitize message
      const sanitizedMessage = sanitizeHtml(input.message, {
        allowedTags: [],
        allowedAttributes: {},
      });

      try {
        const { data, error } = await resend.emails.send({
          from: "Literasi Brebesan <onboarding@resend.dev>", // Or verified domain
          to: ["literasibrebesan@gmail.com"],
          subject: `Kontak Baru: ${input.subject}`,
          replyTo: input.email,
          html: `
            <h3>Pesan Baru dari Form Kontak</h3>
            <p><strong>Nama:</strong> ${input.name}</p>
            <p><strong>Email:</strong> ${input.email}</p>
            <p><strong>Subjek:</strong> ${input.subject}</p>
            <p><strong>Pesan:</strong></p>
            <p>${sanitizedMessage.replace(/\n/g, "<br>")}</p>
          `,
        });

        if (error) {
          console.error("Resend error:", error);
          throw new Error("Gagal mengirim pesan. Silakan coba lagi nanti.");
        }

        // Kirim notifikasi WhatsApp ke Admin secara non-blocking
        whatsappService
          .notifyContactMessage({
            name: input.name,
            email: input.email,
            subject: input.subject,
            message: sanitizedMessage,
          })
          .catch((err) => console.warn("[WA Contact Notification Failed]", err));

        return { success: true, message: "Pesan berhasil dikirim!" };
      } catch (err) {
        console.error("Action error:", err);
        throw new Error("Terjadi kesalahan pada server.");
      }
    },
  }),
};
