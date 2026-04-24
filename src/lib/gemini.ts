import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const models = {
  flash: "gemini-3-flash-preview",
  pro: "gemini-3.1-pro-preview",
  lite: "gemini-3.1-flash-lite-preview"
};

export async function analyzeStartupHealth(idea: string, stage: string) {
  const response = await ai.models.generateContent({
    model: models.flash,
    contents: `Ushbu startap g'oyasi va bosqichini tahlil qiling:
G'oya: ${idea}
Bosqich: ${stage}

Quyidagi formatda faqat JSON qaytaring:
{
  "healthScore": 0-100 gacha son,
  "metrics": {
    "ideaStrength": 0-100,
    "execution": 0-100,
    "marketFit": 0-100
  },
  "status": "healthy" | "risky" | "critical",
  "reasoning": "O'zbek tilida qisqa (2-3 jumla) professional tahlil va tavsiya"
}
Diqqat: "reasoning" maydoni O'ZBEK TILIDA bo'lishi shart.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function generateRoadmap(idea: string, stage: string) {
  const response = await ai.models.generateContent({
    model: models.flash,
    contents: `Ushbu startap uchun aqlli roadmap (yo'l xaritasi) yarating: ${idea}. Hozirgi bosqich: ${stage}.
4 ta asosiy bosqich (fazalar) yarating va har bir bosqich uchun 3 ta aniq vazifani (priority bilan) belgilang.
Barcha vazifa nomlari va tavsiflari O'ZBEK TILIDA bo'lishi shart.
JSON formatida qat'iy quyidagi ARRAY strukturasida qaytaring (hech qanday qo'shimcha text yoki markdown bo'lmasin):
[
  {
    "title": "Bosqich nomi",
    "description": "Bosqich maqsadi",
    "tasks": [
      {
         "id": "t1",
         "title": "Vazifa nomi",
         "status": "todo",
         "priority": "high"
      }
    ]
  }
]`,
    config: {
      responseMimeType: "application/json"
    }
  });

  let data = JSON.parse(response.text || "[]");
  if (!Array.isArray(data)) {
    if (data.roadmap && Array.isArray(data.roadmap)) data = data.roadmap;
    else if (data.steps && Array.isArray(data.steps)) data = data.steps;
    else data = [];
  }
  return data;
}

export async function generatePitch(idea: string, details: any) {
  const response = await ai.models.generateContent({
    model: models.flash,
    contents: `Quyidagi g'oya uchun investorlarbop pitch (taqdimot mazmuni) yarating: ${idea}.
Bo'limlar: Muammo (Problem), Yechim (Solution), Bozor (Market), Biznes model (Business Model), Raqobat (Competition).
Barcha matnlar O'ZBEK TILIDA bo'lishi shart.
JSON formatida quyidagi kalitlar bilan javob qaytaring: "problem", "solution", "market", "businessModel", "competition".
Javob faqat JSON bo'lsin.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function buildPhaseWithAI(startup: any, phase: string) {
  let contents = `Siz noldan startap quruvchi kofaundersiz. Qisqa va yechimga qaratilgan amaliy ma'lumot bering. Ushbu startap ma'lumotlari asosida "${phase}" bosqichini hal qilib bering:
Loyiha nomi: ${startup.name}
G'oya: ${startup.idea}\n`;
  
  let schemaDescription = '';
  
  if (phase === 'vazifa_belgilash') {
    contents += "Vazifa: G'oyani va muammoni yanada lo'nda, logik jihatdan mukammal va professional qilib pishitib (refine qilib) bering.";
    schemaDescription = `{ "idea": "Sayqallangan g'oya matni (2-3 jumla)" }`;
  } else if (phase === 'biznes_reja') {
    contents += "Vazifa: Startap uchun ixcham Lean Canvas (1 sahifali biznes reja) tayyorlang.";
    schemaDescription = `{ "leanCanvas": "Barcha 9 qismni (muammo, yechim, maqsadli bozor, raqobat ustunligi va hokazo) o'z ichiga olgan qisqa matn. Har bir qismni yangi qatordan chiroyli formatlab yozing." }`;
  } else if (phase === 'raqobat') {
    contents += "Vazifa: Asosiy 3 ta kutilayotgan yoki bor raqobatchilarni tahlil qiling va bizning 'Unfair Advantage' (yashirin ustunligimiz) nima ekanini aniqlang.";
    schemaDescription = `{ "competitors": "Raqobatchilar tahlili va yashirin ustunlik tahlili" }`;
  } else if (phase === 'bozor_tahlili') {
    contents += "Vazifa: Maqsadli auditoriya kimlar ekanligi haqida aniq profil yozing.";
    schemaDescription = `{ "targetAudience": "Auditoriya haqida aniq vizual ta'rif (2-3 jumla)" }`;
  } else if (phase === 'strategiya') {
    contents += "Vazifa: Qanday qilib pul topish mumkinligi (daromad modeli).";
    schemaDescription = `{ "revenueModel": "Daromad modeli qanday ishlashi haqida", "channels": ["Telegram Ads", "Cold Outreach", "..."] }`;
  } else if (phase === 'narxlash') {
    contents += "Vazifa: Dastlabki narxlash strukturasi (Pricing) va nechta mijoz minimal foydaga chiqish uchun kerakligini hisoblabering.";
    schemaDescription = `{ "pricing": "Pricing bo'limlari (masalan: Basic, Pro, Enterprise) va Unit economics izohi" }`;
  } else if (phase === 'identiteti') {
    contents += "Vazifa: Startap uchun yodda qoluvchi qisqa slogan (shior), loyihaga mos keluvchi 3 ta HEX vizual rang va kerakli emotsiyani beruvchi 1 ta Google Font nomini yozing.";
    schemaDescription = `{ "slogan": "Slogan", "colors": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "font": "Inter" }`;
  } else if (phase === 'mvp_qurish') {
    contents += "Vazifa: Minimal ishlovchi versiya (MVP) qurish uchun kerakli hamma narsani aniqlang. Tizim juda sodda va tushunarli bo'lishi kerak.";
    schemaDescription = `{ "mvpFeatures": "MVP dagi asosiy 3 ta muhim funksiya nomi va sababi", "techStack": "Texnologiyalar steki (Masalan: React, Firebase, Tailwind css, etc.)", "nextSteps": "Loyiha qurishni boshlash uchun eng muhim 3 ta amaliy qadam" }`;
  } else if (phase === 'go_to_market') {
    contents += "Vazifa: Ilk 100 ta qulay va ishonchli mijozni qaerdan va qanday topish bo'yicha amaliy qadamlar ssenariysini yozing.";
    schemaDescription = `{ "go_to_market": "Ilk 100 foydalanuvchini olib kelish kanallari va aniq usullari" }`;
  }

  contents += `\nDiqqat: Faqat JSON formatida va O'ZBEK TILIDA qaytaring. Format: ${schemaDescription}`;

  const response = await ai.models.generateContent({
    model: models.flash,
    contents,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function generateWebsite(startup: any) {
  let projectTypeInstruction = `Siz jahon darajasidagi Full-Stack va Senior UX/UI dasturchisiz. Foydalanuvchi uchun oddiy landing page emas, balki "Apple" va "Stripe" darajasidagi premium dizayn, mukammal animatsiyalar va yuqori darajadagi interaktivlikka ega bo'lgan professional platforma (SaaS/Dashboard/Marketplace) prototipini qurishingiz kerak.`;
  let structureInstruction = `1. **Premium App Layout**: Zamonaviy, toza va keng (spacious) dizayn. Chapda shisha korpusli (glassmorphism) Sidebar yoki tepada oqlangan Navbar.
2. **Dashboard Dinamikasi**: Asosiy sahifada g'oyaga mos "Bento Grid" uslubidagi statistik kartalar, jonli ko'rinishdagi grafiklar (CSS orqali) va oxirgi harakatlar jadvali.
3. **Mukammal Interaktivlik**: 'Alpine.js' yoki 'React State' yordamida bo'limlararo (masalan: Analytics, Users, Settings, Billing) silliq o'tishlar.
4. **Professional Elementlar**: Foydalanuvchi profili vidjeti, bildirishnomalar paneli, qidiruv paneli va yuqori sifatli mock ma'lumotlar bilan boyitilgan UI.`;

  if (startup.projectType === 'landing') {
    projectTypeInstruction = `Siz mukammal "Landing Page" ustasisiz. Sizning maqsadingiz foydalanuvchini vizual ravishda hayratda qoldirish (WOW effect) va konversiyani oshirishdir.`;
    structureInstruction = `1. **Hero Section**: Katta, qalin (bold) sarlavha, professional subtext va interaktiv CTA tugmasi.
2. **Visual Rhythm**: Bento gridlar orqali xizmatlarni ko'rsatish, zamonaviy 'Social Proof' (mijozlar logotiplari), jozibali 'Pricing Table' va 'FAQ' akordeoni.
3. **Modern UI Trends**: Glassmorphism, yumshoq soyalar (soft shadows), gradient matnlar va Tailwind-ning eng yaxshi rang kombinatsiyalari.`;
  } else if (startup.projectType === 'mobile') {
    projectTypeInstruction = `Siz jahon darajasidagi Mobile App (IOS/Android) UI dizaynerisiz. Ilovani xuddi App Store-dagi eng mashhur ilovalardek jozibali yarating.`;
    structureInstruction = `1. **Mobile Experience**: Vertikal, bir qo'l bilan boshqarishga (thumb-friendly) optimallashtirilgan dizayn.
2. **App Components**: Pastki qismda 'Floating Navigation Bar', yuqori sifatli 'Card' elementlari, piktogrammalar va mobil interfeysga xos bo'lgan listlar.
3. **Mobile-First Layout**: Mobil telefon ramkasi (mockup) ichida markazlashgan holda taqdim etishga harakat qiling.`;
  } else if (startup.projectType === 'ecommerce') {
    projectTypeInstruction = `Siz yuqori darajadagi E-commerce va d-commerce mutaxassisiz. Sizning saytingiz Amazon yoki Shopify-dan ham chiroyliroq bo'lishi kerak.`;
    structureInstruction = `1. **Product Discovery**: Vizual boy mahsulotlar to'plami, 'Quick View' funksiyasi maketi, savatchaga qo'shish animatsiyalari.
2. **Shopping Flow**: Qidiruv, filtrlar, kategoriya panellari va professional ko'rinishdagi checkout (to'lov) sahifasi maketi.`;
  }

  const contents = `${projectTypeInstruction}
Loyiha mukammal arxitekturaga ega bo'lishi uchun, React, Tailwind va Lucide-react ishlatadigan ko'p faylli (multi-file) komponentlarga bo'lingan professional React loyihasini yarating. 
Siz shunchaki bitta fayl emas, balki to'liq loyiha arxitekturasini (fayllar tizimini) yaratishingiz shart.

PROYEKRTNING MINIMAL TARKIBI:
- /src/App.js (Asosiy router va sahifalar jamlanmasi)
- /src/components/Layout.js (Sidebar, Navbar ve Footer)
- /src/components/Dashboard.js (Asosiy UI widgetlar)
- /src/components/Sidebar.js (Navigatsiya)
- /src/components/Header.js (User profile, Search)
- /src/index.css (Tailwind direktivalari bilan)
- /src/mockData.js (Loyiha uchun kerakli boyitilgan ma'lumotlar to'plami)

UI USLUBI (VIBE):
- **Typography**: "Inter" fontidan foydalaning, sarlavhalar uchun qalinroq (font-bold) va tracking-tight ishlating.
- **Colors**: ${startup.branding?.colors?.join(', ') || '#6366f1, #1e1b4b'} - bu ranglardan asosiy (primary) va aksent sifatida foydalaning.
- **Spacing**: Kenglik (spacing) va oq bo'shliqlar (whitespace) orqali premium tuyg'u bering.

FAQAT VA FAQAT quyidagi XML ko'rinishida fayllarni qaytaring. "Hello World" kabi sodda javoblar QAT'IYAN TAQIQLANADI. Hech qanday JSON ishlatmang.
Masalan:
<file path="/src/App.js">
import React from 'react';
// code ...
</file>
<file path="/src/index.css">
/* css code */
</file>

Startap Nomi: ${startup.name}
G'oya: ${startup.idea}
Talab qilinadigan MVP: ${startup.websiteBrief?.sections?.[0]?.content || 'To\'liq funksional platforma'}

Konstruktsiya talablari:
${structureInstruction}

- Tailwind CSS va Lucide-react dan professional foydalaning.
- Loyihani "Prototype" deb nomlamang, u xuddi haqiqiy tayyor mahsulotdek ko'rinsin.
- FAQAT VA FAQAT <file> formatida kod qaytaring. Hech qanday JSON yoki Markdown blocklarsiz!`;

  const response = await ai.models.generateContent({
    model: models.flash,
    contents
  });
  
  return response.text || "";
}

export async function editWebsite(currentCode: string, prompt: string, startup: any) {
  const contents = `Siz master darajadagi Frontend dasturchisiz. Foydalanuvchi quyidagi mavjud HTML/JS kod bo'yicha o'zgartirish talabini yubordi.
Vazifangiz - MAVJUD KODGA kiritilgan talablar bo'yicha to'g'ri o'zgartirishlarni qo'shib TO'LIQ yangilangan DASTUR/KOD matnini qaytarish.
Hech qanday izoh qo'shmang. Mavjud HTML taglari va mantiqlarni buzib qo'ymang.

Startap Nomi: ${startup.name}
O'zgartirish talabi: "${prompt}"

MAVJUD KOD:
\`\`\`
${currentCode}
\`\`\`

Diqqat: Faqat yakuniy RAW kod matnini qaytaring. Uni Markdown ichiga olsa ham bo'ladi.`;

  const response = await ai.models.generateContent({
    model: models.flash,
    contents
  });
  
  let result = response.text || "";
  const match = result.match(/```[a-z]*\n([\s\S]*?)\n```/);
  if (match) {
    return match[1].trim();
  }
  return result.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
}

export async function generateBackend(startup: any) {
  let requirements = `- Express server o'rnatish kodi.\n- Firestore (Firebase) yoki Mongoose Schema misollari (comments da Node mantiqi bilan)\n- /api/users, /api/data kabi loyihaga qattiq moslashtirilgan routelar.\n- Swagger/OpenAPI dokumentatsiyasi (swagger-ui-express ishlatib) /api-docs route orqali ochiq bo'lishi shart.`;
  if (startup.projectType === 'bot') {
    requirements = `- Node.js yordamida Telegram Bot (Telegraf.js yoki node-telegram-bot-api bilan) uchun webhook/polling arxitekturasi.\n- Bot komandalari (/start, /help) va xabarlarga javob qaytarish mantiqi.\n- Ma'lumotlarni saqlash db mantiqi.\n- Bot funksiyalari uchun API dokumentatsiyasi (Swagger) yaratish.`;
  }

  const contents = `Siz Senior Backend Dasturchisiz. Loyiha (MVP) uchun Node.js / Express arxitekturasida ko'p faylli (multi-file) strukturani yarating.
Barcha mantiqni \`server.js\` ga joylamang, balki route va controllerlarni chiroyli papkalarga JSON orqali bo'lib chiqing.
Swagger/OpenAPI dokumentatsiyasini albatta qo'shing va u /api-docs manzili orqali ishlasin. 

FAQAT VA FAQAT quyidagi XML ko'rinishida fayllarni qaytaring. "Hello World" kabi sodda javoblar QAT'IYAN TAQIQLANADI. Hech qanday JSON ishlatmang.
Masalan:
<file path="/server.js">
const express = ...
</file>
<file path="/package.json">
{ "dependencies": { "express": "^4.18.2" } }
</file>

Startap Nomi: ${startup.name}
G'oya: ${startup.idea}
Loyiha Turi: ${startup.projectType || 'webapp'}
Asosiy Funksiyalar: ${startup.websiteBrief?.sections?.[0]?.content || 'Foydalanuvchilar, Ma\'lumotlar, Autentifikatsiya'}

Talablar:
${requirements}
- Loyiha toza MVC yoki shunga o'xshash arxitekturaga (routes, controllers, models/utils) ega bo'lsin.
- Swagger dokumentatsiyasi barcha API nuqtalarini (endpoints) o'z ichiga olsin.
- Kod ishlashga tayyordek professional kommentariylar (O'zbek tilida) bilan yozilsin.
- FAQAT VA FAQAT <file> formatida kod qaytaring. Markdown va izohlarsiz!`;

  const response = await ai.models.generateContent({
    model: models.flash,
    contents
  });
  
  return response.text || "";
}

export async function editBackend(currentCode: string, prompt: string, startup: any) {
  const contents = `Siz Senior Backend dasturchisiz. Mavjud Backend JS kodiga foydalanuvchining iltimosi asosida tahrir kiritishingiz kerak.
Vazifangiz to'liq yangilangan kodni qaytarish, markdown va ortiqcha gaplarsiz.

Startap: ${startup.name}
Talab: "${prompt}"

MAVJUD KOD:
\`\`\`
${currentCode}
\`\`\`

Faqat yakuniy RAW JavaScript kodini qaytaring.`;

  const response = await ai.models.generateContent({
    model: models.flash,
    contents
  });
  
  let result = response.text || "";
  const match = result.match(/```[a-z]*\n([\s\S]*?)\n```/);
  if (match) {
    return match[1].trim();
  }
  return result.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
}

export async function assistCodebase(currentCode: string, prompt: string, startup: any, isFrontend: boolean, history: any[], otherCode: string, image?: string | null, selector?: string) {
  const historyText = history.map(h => `${h.role === 'user' ? 'Foydalanuvchi' : 'AI Yordamchi'}: ${h.text}`).join('\n');

  const contents = `Siz jahon darajasidagi muhandis va mahsulot dizaynerisiz (xuddi Google AI Studio Build agenti kabi).
Siz foydalanuvchining tabiiy tildagi buyruqlarini qabul qilib, ularni ishlab chiqarish darajasidagi (production-ready) kodga aylantirasiz, va unga loyihani qurishda professional darajada yordam berasiz.

${isFrontend ? 'SIZNING NATIJANGIZ SANDPACK EDITORIDA ISHGA TUSHIRILADI. Shuning uchun professional ko\'p faylli (multi-file) React loyihasini yaratishingiz shart.' : 'Siz professional Node.js backend arxitekturasini yaratasiz.'}

${selector ? `DIQQAT: Foydalanuvchi joriy interfeysda '${selector}' selektori orqali belgilangan aniq elementga e'tibor qaratmoqda. Sizning o'zgarishlaringiz asosan (lekin faqatgina emas) shu element va uning atrofidagi mantiq/stilga qaratilishi kerak.` : ''}

Foydalanuvchi hozirda Startap kod bazasi ustida ishlamoqda.
Siz suhbatni va uning buyrug'ini tahlil qilishingiz zarur. Agar foydalanuvchi rasm (masalan, Figma dizayn skrinshoti) yuklagan bo'lsa, rasmdagi vizuallarga aynan o'xshash bo'lgan va xuddi shunday ishlaydigan kod yaratishingiz shart.

Qoidalar asosi:
- Agar u e'tiroz bildirsa, maslahat so'rasa, muammoni tushuntirishni so'rasa yoki shunchaki salomlashsa: BU "reply" harakati hisoblanadi (kod o'zgarmaydi).
- Agar u aniq KODGA O'ZGARTIRISH KIRITISHNI talab qilsa: BU "update" harakati hisoblanadi.

Tafsilotlar:
- Startap: ${startup.name} (${startup.idea})
- Muhit: ${isFrontend ? 'Frontend (React/Sandpack)' : 'Backend (Node.js/Express)'}

- Suhbat tarixi:
${historyText || 'Suhbat endi boshlandi.'}

Foydalanuvchining yangi gapi: "${prompt}"

Siz O'ZGARTIRISHINGIZ mumkin bo'lgan MAVJUD KOD:
\`\`\`
${currentCode}
\`\`\`

DIQQAT! Siz HAR DOIM quyidagi aniq strukturada qat'iy javob berishingiz SHART.
[JSON_START]
{
  "action": "reply" yoki "update",
  "message": "Nima o'zgarish qilganingizni qisqacha sifatli bayon qiling (O'zbek tilida)."
}
[JSON_END]

Agar siz "update" action tanlagan bo'lsangiz, KODNI albatta quyidagi XML ko'rinishida biriktiring. Hech qanday JSON ishlatmang:
[CODE_START]
<file path="/src/App.js">
... kodingiz ...
</file>
<file path="/src/index.css">
... kodingiz ...
</file>
[CODE_END]

"Hello World" kabi sodda javoblar QAT'IYAN TAQIQLANADI. To'liq, ishlovchi va professional loyiha qaytaring.`;

  const apiParts: any[] = [{ text: contents }];
  
  if (image) {
     const mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';'));
     const base64Data = image.split(',')[1];
     apiParts.push({
        inlineData: {
           data: base64Data,
           mimeType: mimeType
        }
     });
  }

  const response = await ai.models.generateContent({
    model: models.flash,
    contents: apiParts
  });

  let text = response.text || "";
  let action = "reply";
  let message = "Kechirasiz, javobni qayta ishlashda xatolik yuz berdi.";
  let code = null;

  const jsonMatch = text.match(/\[JSON_START\]([\s\S]*?)\[JSON_END\]/);
  if (jsonMatch) {
     try {
        const parsed = JSON.parse(jsonMatch[1]);
        action = parsed.action;
        message = parsed.message;
     } catch(e) {
        console.error("Agent JSON parsing error:", e);
     }
  }

  if (action === "update") {
     const codeMatch = text.match(/\[CODE_START\]([\s\S]*?)\[CODE_END\]/);
     if (codeMatch) {
         code = codeMatch[1].trim();
         const regexMatch = code.match(/```[a-z]*\n([\s\S]*?)\n```/);
         if (regexMatch) {
             code = regexMatch[1].trim();
         } else {
             code = code.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
         }
     }
  }

  return { action, message, code };
}

export function createStartupChat(startup: any, history: any[] = []) {
  const context = `
STARTAP KONTEKSTI (Ma'lumot uchun):
- Nomi: ${startup.name}
- Asosiy g'oya (Idea): ${startup.idea}
- Loyiha Turi: ${startup.projectType || 'webapp'}
- Startap bosqichi: ${startup.stage}
- Joriy qurish (Builder) bosqichi: ${startup.builderPhase}
- Samardorlik (Health Score): ${startup.healthScore}/100
- AI Xulosasi (Reasoning): ${startup.reasoning || "Yo'q"}
- Kontekst (Bozor/Auditoriya): ${startup.strategy?.targetAudience || "Hali aniqlanmagan"}
- Kontekst (Daromad Modeli): ${startup.strategy?.revenueModel || "Hali aniqlanmagan"}
- Kontekst (Slogan): ${startup.branding?.slogan || "Hali aniqlanmagan"}
- Kontekst (MVP Rejasi): ${startup.websiteBrief?.sections?.[0]?.content || "Hali aniqlanmagan"}
`;

  return ai.chats.create({
    model: models.flash,
    history,
    config: {
      systemInstruction: `Siz "Startup Garage" tizimining SI-Kofaunderi (Sherigi) hisoblanasiz. Sizning asosiy vazifangiz asoschi (founder) bilan birgalikda startapni noldan (0 dan) MVP gacha birma-bir qurishdir.

${context}

Siz shunchaki gaplashuvchi robot emassiz, siz haqiqiy SHERIK (COLLABORATOR) bo'lishingiz kerak. 
Quyidagi bosqichlar bo'yicha ketma-ket ishlang:
1. G'OYANI_PIXITLASH: Muammoni aniqlang, g'oyani charxlang.
2. BOZOR_TAHLILI: Raqobatchilarni va maqsadli auditoriyani aniqlang.
3. STRATEGIYA_VA_MODEL: Biznes model va roadmapni birga tuzing.
4. BRENDING_VA_VEBSAYT: Nomi, ranglari, slogani va veb-sayt tuzilishini (landing page qismlari) kelishib oling.
5. MVP_REJASI: Birinchi versiyani qurish va ilk foydalanuvchilarni jalb qilish rejasini ishlab chiqing.

Sizning muloqot tarzingiz:
- Foydalanuvchi yuqoridagi kontekstni sizga berganini yodda tuting, loyiha bosqichida aynan qaysi holatda ekanligini tahlil qiling.
- Savollarga javob berish bilan cheklanmang, o'zingiz ham faol savollar bering. Maxsus ehtiyojlarga moslashib suhbatlashing.
- Har bir bosqich tasdiqlangandan keyingina keyingisiga o'ting.
- "Y-Combinator" uslubida: "Odamlar xohlaydigan narsani quring" (Build something people want).
- Professional va konkret maslahatlar bering.

BARCHA JAVOBLAR FAQAT O'ZBEK TILIDA BO'LISHI SHART.`
    }
  });
}
