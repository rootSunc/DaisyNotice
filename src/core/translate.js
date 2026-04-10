export function containsEnglish(text) {
  if (!text) return false;
  const englishWords = ['the', 'and', 'this', 'that', 'with', 'from', 'have', 'your', 'what', 'there', 'please', 'english', 'are', 'you', 'will', 'can', 'not', 'has', 'but', 'how'];
  
  let matchCount = 0;
  for (const word of englishWords) {
    const rx = new RegExp(`\\b${word}\\b`, 'i');
    if (rx.test(text)) {
      matchCount++;
    }
  }
  
  return matchCount >= 2;
}

export async function translateFinnishToEnglish(text) {
  if (!text) return null;
  
  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'fi',
      tl: 'en',
      dt: 't',
      q: text
    });
    
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!res.ok) {
        console.error("Translation API failed", res.status, await res.text());
        return null;
    }
    const data = await res.json();
    const translatedText = data[0].map(segment => segment[0]).join('');
    return translatedText;
  } catch (err) {
    console.error("Translation error:", err);
    return null;
  }
}

export async function applyTranslationIfNeeded(message) {
  const fullText = `${message.title || ""} ${message.body || ""}`;
  
  // If the full message contains English, we don't translate at all
  if (containsEnglish(fullText)) {
      return message;
  }
  
  console.log(`Message ${message.id} contains only Finnish, translating...`);
  
  if (message.title) {
      const translatedTitle = await translateFinnishToEnglish(message.title);
      if (translatedTitle) {
          message.title = `${message.title} / 🇬🇧 ${translatedTitle}`;
      }
  }
  
  if (message.body) {
      const translatedBody = await translateFinnishToEnglish(message.body);
      if (translatedBody) {
          message.body = `${message.body}\n\n---\n\n🇬🇧 [English Translation]\n${translatedBody}`;
      }
  }
  
  return message;
}
