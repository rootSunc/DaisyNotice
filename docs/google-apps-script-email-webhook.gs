const TOKEN = "replace-with-a-long-random-token";

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getAttachments(payload) {
  return (payload.attachments || []).map((attachment) =>
    Utilities.newBlob(
      Utilities.base64Decode(attachment.contentBase64),
      attachment.contentType || "application/octet-stream",
      attachment.filename || "attachment",
    ),
  );
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");

    if (!TOKEN || payload.token !== TOKEN) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }

    const recipients = Array.isArray(payload.to)
      ? payload.to.join(",")
      : String(payload.to || "");

    if (!recipients) {
      return jsonResponse({ ok: false, error: "Missing recipients" });
    }

    const mail = {
      to: recipients,
      subject: String(payload.subject || "DaisyNotice Notification"),
      body: String(payload.text || ""),
      name: "DaisyNotice",
      attachments: getAttachments(payload),
    };

    if (payload.from) {
      mail.replyTo = String(payload.from);
    }

    MailApp.sendEmail(mail);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String((error && error.message) || error),
    });
  }
}
