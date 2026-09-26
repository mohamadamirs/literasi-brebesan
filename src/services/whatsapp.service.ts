// src/services/whatsapp.service.ts
/**
 * WhatsApp Gateway Client Service untuk Literasi Brebesan
 * Berfungsi sebagai jembatan komunikasi antara aplikasi web dan WhatsApp Gateway Engine.
 */

export interface SendMessagePayload {
  receiver: string;
  message: string;
}

export interface SendMediaPayload {
  receiver: string;
  media_url: string;
  media_type?: "image" | "document" | "audio";
  caption?: string;
}

export interface ContactNotificationParams {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ArticleNotificationParams {
  title: string;
  authorName?: string;
  slug?: string;
  status?: "pending" | "published" | "draft";
  rejectionReason?: string | null;
  receiverPhone?: string;
}

export interface AgendaNotificationParams {
  title: string;
  eventDate: string | Date;
  eventTime: string;
  location: string;
  waLink?: string;
  imageUrl?: string | null;
}

class WhatsAppService {
  private get gatewayUrl(): string {
    return (
      (import.meta as any).env?.WA_GATEWAY_URL ||
      "http://127.0.0.1:8080"
    );
  }

  private get apiKey(): string {
    return (
      (import.meta as any).env?.WA_GATEWAY_SECRET ||
      ""
    );
  }

  private get adminPhone(): string {
    return (
      (import.meta as any).env?.WA_ADMIN_PHONE ||
      "628993986415"
    );
  }

  /**
   * Mengirim pesan teks umum ke nomor penerima melalui Gateway
   */
  async sendText(receiver: string, message: string): Promise<boolean> {
    const url = `${this.gatewayUrl}/api/v1/send/text`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          receiver,
          message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn(`[WA Gateway Warning] Gagal kirim pesan ke ${receiver}:`, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`[WA Gateway Error] Tidak dapat menghubungi server gateway di ${url}:`, error);
      return false;
    }
  }

  /**
   * Mengirim pesan media (gambar / dokumen)
   */
  async sendMedia(payload: SendMediaPayload): Promise<boolean> {
    const url = `${this.gatewayUrl}/api/v1/send/media`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn(`[WA Gateway Warning] Gagal kirim media ke ${payload.receiver}:`, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`[WA Gateway Error] Tidak dapat menghubungi server gateway di ${url}:`, error);
      return false;
    }
  }

  /**
   * 1. Notifikasi Pesan Kontak Masuk (ke Admin)
   */
  async notifyContactMessage(params: ContactNotificationParams): Promise<void> {
    const text = [
      "📩 *PESAN BARU DARI FORM KONTAK*",
      "───────────────────────",
      `👤 *Nama:* ${params.name}`,
      `📧 *Email:* ${params.email}`,
      `📌 *Subjek:* ${params.subject}`,
      "",
      "📝 *Isi Pesan:*",
      params.message,
      "───────────────────────",
      "_Pesan otomatis dari portal Literasi Brebesan._",
    ].join("\n");

    await this.sendText(this.adminPhone, text);
  }

  /**
   * 2. Notifikasi Artikel Baru Diajukan (ke Admin untuk Direview)
   */
  async notifyArticleSubmitted(params: { title: string; authorName: string; postId: string }): Promise<void> {
    const text = [
      "📝 *TULISAN BARU PERLU DITINJAU*",
      "───────────────────────",
      `✍️ *Penulis:* ${params.authorName}`,
      `📖 *Judul:* *${params.title}*`,
      `🆔 *ID Post:* ${params.postId}`,
      "",
      "Silakan tinjau dan moderasi melalui Panel Admin:",
      "https://literasibrebesan.my.id/admin/posts",
      "───────────────────────",
      "_Notifikasi otomatis Literasi Brebesan Engine._",
    ].join("\n");

    await this.sendText(this.adminPhone, text);
  }

  /**
   * 3. Notifikasi Artikel Terbit / Selesai Dimoderasi
   */
  async notifyArticlePublished(params: { title: string; slug: string; authorPhone?: string }): Promise<void> {
    const postUrl = `https://literasibrebesan.my.id/publikasi/${params.slug}`;

    const text = [
      "🎉 *ARTIKEL TELAH DITERBITKAN!*",
      "───────────────────────",
      `📖 *Judul:* *${params.title}*`,
      `🔗 *Tautan Baca:* ${postUrl}`,
      "",
      "Selamat membaca dan menyebarkan literasi untuk Brebes!",
      "───────────────────────",
      "_Portal Literasi Brebesan_",
    ].join("\n");

    // Kirim ke penulis jika nomor terdaftar, atau ke admin channel
    const target = params.authorPhone || this.adminPhone;
    await this.sendText(target, text);
  }

  /**
   * 4. Notifikasi Agenda Kegiatan Baru Diterbitkan
   */
  async notifyAgendaPublished(params: AgendaNotificationParams): Promise<void> {
    const formattedDate =
      params.eventDate instanceof Date
        ? params.eventDate.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : String(params.eventDate);

    const text = [
      "📢 *AGENDA KEGIATAN LITERASI BREBESAN*",
      "───────────────────────",
      `📌 *Kegiatan:* *${params.title}*`,
      `📅 *Waktu:* ${formattedDate} (${params.eventTime})`,
      `📍 *Lokasi:* ${params.location}`,
      ...(params.waLink ? [`💬 *Info/Pendaftaran:* ${params.waLink}`] : []),
      "",
      "Yuk ramaikan dan berpartisipasi aktif dalam kegiatan literasi bersama kami!",
      "───────────────────────",
      "_Literasi Brebesan Community_",
    ].join("\n");

    if (params.imageUrl) {
      await this.sendMedia({
        receiver: this.adminPhone,
        media_url: params.imageUrl,
        media_type: "image",
        caption: text,
      });
    } else {
      await this.sendText(this.adminPhone, text);
    }
  }
}

export const whatsappService = new WhatsAppService();
