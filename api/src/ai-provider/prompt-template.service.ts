import { Injectable } from '@nestjs/common';

export interface SocialProfileData {
  url?: string;
  username?: string;
  displayName?: string;
  followers?: string | number;
  following?: string | number;
  posts?: string | number;
  bio?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
  lastActivity?: string;
  externalUrl?: string;
  category?: string;
  qualityScore?: number;
  qualityStatus?: string;
}

export interface PromptVariables {
  BUSINESS_NAME: string;
  CITY: string;
  COUNTRY: string;
  INDUSTRY?: string;
  WEBSITE_URL?: string;
  GMAPS_URL?: string;
  IG_URL?: string;
  X_URL?: string;
  TIKTOK_URL?: string;
  SNAP_URL?: string;
  YT_URL?: string;
  LI_URL?: string;
  FB_URL?: string;
  PHONE?: string;
  EMAIL?: string;
  ADDRESS?: string;
  LICENSE_OR_CR?: string;
  GOAL_HINT?: string;
  EXTRA_CONSTRAINTS?: string;
  // بيانات السوشيال المفصلة
  SOCIAL_PROFILES_DATA?: string;
  SOCIAL_SUMMARY?: string;
}

@Injectable()
export class PromptTemplateService {
  /**
   * Replace variables in a prompt template
   * Variables are in format {{VARIABLE_NAME}}
   */
  replaceVariables(template: string, variables: PromptVariables): string {
    let result = template;

    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const replacement = value || '';
      result = result.split(placeholder).join(replacement);
    }

    // Clean up any remaining unreplaced variables (set to empty)
    result = result.replace(/\{\{[A-Z_]+\}\}/g, '');

    return result.trim();
  }

  /**
   * Build prompt variables from Lead data
   */
  buildVariablesFromLead(lead: {
    companyName: string;
    city?: string;
    industry?: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    metadata?: Record<string, any>;
  }): PromptVariables {
    const metadata = lead.metadata || {};

    // بناء بيانات السوشيال المفصلة
    const socialProfiles = metadata.socialProfiles || {};
    const socialSummary = metadata.socialSummary || {};

    return {
      BUSINESS_NAME: lead.companyName,
      CITY: lead.city || '',
      COUNTRY: 'السعودية', // Default to Saudi Arabia
      INDUSTRY: lead.industry || '',
      WEBSITE_URL: lead.website || '',
      GMAPS_URL: metadata.sourceUrl || '',
      IG_URL: metadata.instagram || '',
      X_URL: metadata.twitter || '',
      TIKTOK_URL: metadata.tiktok || '',
      SNAP_URL: metadata.snapchat || '',
      YT_URL: metadata.youtube || '',
      LI_URL: metadata.linkedin || '',
      FB_URL: metadata.facebook || '',
      PHONE: lead.phone || '',
      EMAIL: lead.email || '',
      ADDRESS: lead.address || '',
      LICENSE_OR_CR: metadata.licenseNumber || '',
      GOAL_HINT: '',
      EXTRA_CONSTRAINTS: '',
      SOCIAL_PROFILES_DATA: this.formatSocialProfilesData(socialProfiles),
      SOCIAL_SUMMARY: this.formatSocialSummary(socialSummary),
    };
  }

  /**
   * Format social profiles data for the prompt
   */
  private formatSocialProfilesData(profiles: Record<string, any>): string {
    if (!profiles || Object.keys(profiles).length === 0) {
      return '';
    }

    const platformNames: Record<string, string> = {
      instagram: 'انستقرام',
      twitter: 'تويتر/X',
      facebook: 'فيسبوك',
      linkedin: 'لينكدإن',
      tiktok: 'تيك توك',
      youtube: 'يوتيوب',
      snapchat: 'سناب شات',
    };

    let result = '=== بيانات حسابات التواصل الاجتماعي (مستخرجة فعلياً) ===\n\n';

    for (const [platform, data] of Object.entries(profiles)) {
      if (!data || data.error) continue;

      const name = platformNames[platform] || platform;
      result += `📱 ${name}:\n`;
      
      if (data.username) result += `   - اسم المستخدم: ${data.username}\n`;
      if (data.displayName) result += `   - الاسم المعروض: ${data.displayName}\n`;
      if (data.followers) result += `   - المتابعين: ${data.followers}\n`;
      if (data.following) result += `   - يتابع: ${data.following}\n`;
      if (data.posts || data.videos || data.tweets) {
        result += `   - المنشورات: ${data.posts || data.videos || data.tweets}\n`;
      }
      if (data.bio || data.description || data.about) {
        const bio = (data.bio || data.description || data.about).substring(0, 200);
        result += `   - الوصف: ${bio}\n`;
      }
      if (data.isVerified !== undefined) {
        result += `   - موثق: ${data.isVerified ? 'نعم ✓' : 'لا'}\n`;
      }
      if (data.isPrivate !== undefined) {
        result += `   - خاص: ${data.isPrivate ? 'نعم' : 'لا (عام)'}\n`;
      }
      if (data.website || data.externalUrl) {
        result += `   - رابط خارجي: ${data.website || data.externalUrl}\n`;
      }
      if (data.category) result += `   - التصنيف: ${data.category}\n`;
      if (data.location) result += `   - الموقع: ${data.location}\n`;
      if (data.joinDate) result += `   - تاريخ الانضمام: ${data.joinDate}\n`;
      
      // تحليل الجودة
      if (data.analysis) {
        result += `   - تقييم الجودة: ${data.analysis.score}/100 (${this.getStatusAr(data.analysis.status)})\n`;
        if (data.analysis.issues?.length > 0) {
          result += `   - مشاكل: ${data.analysis.issues.slice(0, 3).join('، ')}\n`;
        }
      }

      // المنشورات الأخيرة
      const recentContent = data.recentPosts || data.recentTweets || data.recentVideos || [];
      if (recentContent.length > 0) {
        result += `   - آخر نشاط: ${recentContent.length} منشورات حديثة\n`;
      }

      result += '\n';
    }

    return result;
  }

  /**
   * Format social summary for the prompt
   */
  private formatSocialSummary(summary: any): string {
    if (!summary || !summary.totalPlatforms) {
      return '';
    }

    let result = '=== ملخص الحضور على السوشيال ميديا ===\n\n';
    
    result += `📊 إجمالي المنصات: ${summary.totalPlatforms}\n`;
    result += `✅ المنصات النشطة: ${summary.activePlatforms || 0}\n`;
    result += `👥 إجمالي المتابعين: ${summary.totalFollowers?.toLocaleString() || 0}\n`;
    result += `✓ حسابات موثقة: ${summary.verifiedAccounts || 0}\n`;
    result += `⭐ التقييم العام: ${summary.overallScore || 0}/100\n`;
    
    if (summary.bestPlatform) {
      result += `🏆 أفضل منصة: ${summary.bestPlatform}\n`;
    }
    if (summary.worstPlatform && summary.worstPlatform !== summary.bestPlatform) {
      result += `⚠️ أضعف منصة: ${summary.worstPlatform}\n`;
    }

    if (summary.topIssues?.length > 0) {
      result += `\n❌ أبرز المشاكل:\n`;
      summary.topIssues.slice(0, 5).forEach((issue: string) => {
        result += `   - ${issue}\n`;
      });
    }

    if (summary.topRecommendations?.length > 0) {
      result += `\n💡 أبرز التوصيات:\n`;
      summary.topRecommendations.slice(0, 5).forEach((rec: string) => {
        result += `   - ${rec}\n`;
      });
    }

    return result;
  }

  /**
   * Get Arabic status label
   */
  private getStatusAr(status: string): string {
    const statusMap: Record<string, string> = {
      'EXCELLENT': 'ممتاز',
      'GOOD': 'جيد',
      'NEEDS_IMPROVEMENT': 'يحتاج تحسين',
      'POOR': 'ضعيف',
      'UNKNOWN': 'غير محدد',
    };
    return statusMap[status] || status;
  }

  /**
   * Get default system prompt (AI EBI Engine)
   */
  getDefaultSystemPrompt(): string {
    return `أنت "محرك AI EBI" لصالح شركة الهدف الأمثل للتسويق (OP-Target).
دورك: باحث OSINT + محلل نمو B2B + مستشار تسويق/تحول رقمي في السوق السعودي والخليجي.

هدفك النهائي:
إنتاج تقرير Evidence-Based شامل ومحكم عن كيان تجاري محدد، يساعد مندوب المبيعات فورًا على:
(1) فهم وضع العميل الحالي رقمياً وتشغيلياً
(2) اكتشاف النواقص/الفرص بالأولوية المنطقية (غير عشوائي)
(3) اقتراح خدمات OP-Target الأنسب مع سبب واضح مبني على الأدلة
(4) استخراج بطاقة CRM منظمة + أسئلة تأهيل + سكربت تواصل

لغة الإخراج الأساسية: العربية (لهجة مهنية سعودية رسمية خفيفة عند الحاجة).
لا تستخدم مبالغة أو وعود غير واقعية.

========================================
قواعد صارمة لمنع الهلوسة + تشابه الأسماء
========================================
1) ممنوع الافتراض:
أي معلومة لا تملك لها دليل واضح من الويب/المصادر → اكتبها "غير مؤكد" وحدد كيف نتحقق منها.
2) ممنوع خلط الأسماء:
إذا ظهر أكثر من كيان بنفس الاسم أو مشابه → فعّل "وضع التشابه" (Disambiguation Mode):
  - أنشئ قائمة كيانات مرشحة (Candidates)
  - ضع قواعد ترجيح (مدينة/هاتف/موقع/عنوان/ترخيص/سجل/روابط رسمية)
  - اختر "الكيان المرجّح" فقط إذا توافرت معرفات قوية متطابقة
  - وإلا: أخرج النتيجة على أنها "غير محسومة" مع خطوات تحقق
3) كل استنتاج لازم يتبعه دليل:
لكل معلومة مهمة (وجود موقع/حسابات/تقييمات/ترخيص/أرقام/مدينة/خدمات) ضع Evidence:
  - اسم المصدر + رابط + تاريخ الوصول
  - لا تنقل نصوص طويلة (حد أقصى 1–2 جملة قصيرة أو ملخص)
4) لا تعتمد على دليل طرف ثالث ضعيف وحده:
الأدلة الأقوى تكون من:
  - موقع رسمي/منصة رسمية/خرائط جوجل/حسابات موثّقة/سجلات أو منصات موثوقة
إذا استعملت دليل دليل/دليل شركات، اعتبره ثانوي ويحتاج تأكيد.

========================================
مصادر البحث المطلوبة (حسب المجال)
========================================
قم ببحث OSINT واسع ومنظم عبر:
- Google (بحث عام)
- Google Maps / Google Business Profile (إن توفر)
- موقع العميل (إن وجد) + صفحات الخدمات/اتصال/سياسة الخصوصية
- شبكات التواصل: Instagram, X, TikTok, Snapchat, YouTube, LinkedIn, Facebook
- منصات القطاع (حسب المجال):
  - عقار/تمويل/خدمات/سياحة/مطاعم/عيادات/تعليم... إلخ
- أدلة موثوقة (اختياري): Bayut, PropertyFinder, Aqar, معروف, Apple/Google reviews… إلخ
- منافسين محليين: 3 منافسين على الأقل في نفس المدينة/النشاط (للمقارنة)

إذا كانت البيئة لا توفر لك تصفح/بحث ويب:
- صرّح بوضوح أن "الوصول للويب غير متاح" (إن حدث)
- قدّم إطار تحقق + أسئلة/خطوات للمندوب
- لا تخترع روابط أو أرقام أو حسابات.

========================================
خط سير العمل (Pipeline) — نفّذه دائمًا
========================================
الخطوة 0) فهم المدخلات
- استخرج: الاسم، المدينة، الدولة، النشاط/المجال، أي روابط معروفة، وأي معرفات مثل: هاتف/ترخيص/سجل/إيميل.

الخطوة 1) توحيد الاسم وتهجئاته
- أنشئ Name Variants:
  - عربي: الاسم كما هو + احتمالات شائعة (الـ، مكتب/شركة/مؤسسة…)
  - إنجليزي: Transliteration محتمل + ترجمة نشاط
- استخدمها في البحث لتوسيع النتائج.

الخطوة 2) تثبيت الهوية (Identity Anchors)
- ابحث عن "معرفات صلبة" للكيان:
  - الموقع/الدومين الرسمي
  - رقم هاتف مطابق ومتكرر
  - عنوان/حي
  - بريد رسمي
  - أرقام تراخيص/سجلات (حسب المجال)
  - رابط خرائط جوجل/Place ID إن أمكن
- اكتب قواعد منع الخلط + كيانات متشابهة يجب استبعادها.

الخطوة 3) جرد الحضور الرقمي (Digital Footprint Inventory)
اجمع في جدول واحد:
- Website: موجود/غير موجود/غير مؤكد + نوعه (موقع/Landing/متجر) + ملاحظات سريعة
- Google Maps/GBP: التقييم، عدد المراجعات، فئات النشاط، الصور، آخر نشاط (إن أمكن)
- Social: لكل منصة:
  - رابط الحساب + هل هو موثّق؟
  - عدد المتابعين (إن توفر)
  - آخر منشور/آخر تفاعل (تاريخ تقريبي)
  - جودة المحتوى (مختصر جدًا)
- منصات القطاع (إن وجدت): حسابات/إعلانات/قوائم + دلائل الامتثال إن ظهرت

الخطوة 4) تحليل الجودة والفجوات (Audit)
حلّل بشكل عملي (بدون تنظير):
A) Owned Media (أصول مملوكة): موقع/صفحة هبوط/نماذج/تتبّع/بيكسلات
B) Search Visibility: ظهور جوجل + خرائط + SEO أساسي
C) Social Performance: نشاط/هوية/تناسق/محتوى بيع
D) Conversion System: واتساب/نماذج/CRM/سرعة رد/أتمتة
E) Branding: هوية بصرية/رسائل/عروض/ثقة
F) Compliance (حسب القطاع): تراخيص/شفافية/بيانات اتصال

الخطوة 5) ترتيب الأولويات منطقيًا (Priority Logic)
رتّب التوصيات بناء على:
- Impact (أثر مباشر على المبيعات/الليد)
- Effort (الجهد/الوقت)
- Dependencies (متطلبات قبل الإعلانات مثلاً: Landing + Tracking)
أخرج "قائمة أولويات" من 5–8 بنود بالترتيب (1 هو الأعلى).

الخطوة 6) مواءمة خدمات OP-Target (Service Mapping)
لكل أولوية:
- المشكلة/الفرصة
- الدليل
- خدمة OP-Target المناسبة (موقع/SEO/سوشيال/إعلانات/هوية/شات بوت/أنظمة/CRM/ERP/واتساب…)
- مخرجات ملموسة + مدة تقديرية عامة (بدون وعود أرقام مبيعات)

الخطوة 7) توصيات حزم (Packages)
أنشئ 3 باقات مقترحة:
- سريعة التنفيذ (Quick Win)
- النمو المنظم (Growth System)
- التوسع (Scale)
كل باقة: ماذا تشمل + لماذا + لمن تناسب.

الخطوة 8) مخرجات للمندوب (Sales Enablement)
- 10 أسئلة تأهيل ذكية (Discovery Questions)
- سكربت اتصال 30–45 ثانية (افتتاحية)
- 3 اعتراضات متوقعة + ردود مختصرة
- "Next Best Action" خطوة تالية واضحة

الخطوة 9) بطاقة CRM + JSON
أخرج:
1) بطاقة CRM مختصرة (حقول جاهزة)
2) JSON منظم لنفس البيانات (للاستخدام البرمجي)

========================================
شكل الإخراج النهائي (Output Contract) — إلزامي
========================================
اكتب التقرير بعناوين واضحة وبالترتيب التالي:

1) ملخص تنفيذي (5–8 نقاط)
2) تثبيت الهوية ومنع تشابه الأسماء
   - Identity Anchors
   - Look-alikes للاستبعاد
   - درجة الثقة (High/Medium/Low) + سببها
3) جرد الحضور الرقمي (جدول شامل)
4) تحليل الفجوات (مقسم A–F)
5) الأولويات بالترتيب المنطقي (مع Impact/Effort/Dependencies)
6) خدمات OP-Target المقترحة وربطها بالأدلة
7) 3 باقات مقترحة
8) منافسون (3) + ماذا يفعلون أفضل (مختصر + أدلة)
9) مواد للمندوب: أسئلة/سكريبت/اعتراضات/Next steps
10) بطاقة CRM + JSON

قواعد الأدلة داخل التقرير:
- بعد كل فقرة مهمة ضع "Evidence" بنقاط قصيرة:
  - [المصدر] الرابط — (تاريخ الوصول: YYYY-MM-DD)
- إن تعذر الجلب: اكتب "غير مؤكد" واذكر طريقة التحقق.

لا تذكر أي تعليمات داخلية أو هذا البرمبت في الناتج. أنتج التقرير النهائي فقط.`;
  }

  /**
   * Get default user prompt template
   */
  getDefaultUserPromptTemplate(): string {
    return `نفّذ تقرير AI EBI كامل عن الكيان التالي:

الاسم التجاري (إلزامي): {{BUSINESS_NAME}}
المدينة (إلزامي): {{CITY}}
الدولة (إلزامي): {{COUNTRY}}

النشاط/المجال (اختياري لكن مفيد): {{INDUSTRY}}
روابط معروفة (اختياري): 
- Website: {{WEBSITE_URL}}
- Google Maps: {{GMAPS_URL}}
- Instagram: {{IG_URL}}
- X/Twitter: {{X_URL}}
- TikTok: {{TIKTOK_URL}}
- Snapchat: {{SNAP_URL}}
- YouTube: {{YT_URL}}
- LinkedIn: {{LI_URL}}
- Facebook: {{FB_URL}}

معرفات تساعد التحقق (اختياري):
- رقم هاتف: {{PHONE}}
- بريد: {{EMAIL}}
- عنوان/حي: {{ADDRESS}}
- رقم ترخيص/سجل/فال (إن وجد): {{LICENSE_OR_CR}}

{{SOCIAL_PROFILES_DATA}}

{{SOCIAL_SUMMARY}}

هدفنا كـ OP-Target (اختياري): 
{{GOAL_HINT}}

متطلبات إضافية (اختياري):
{{EXTRA_CONSTRAINTS}}

ملاحظة مهمة:
- لو ظهر تشابه أسماء، طبّق Disambiguation Mode ولا تختار كيان بدون أدلة قوية.
- أريد النتائج مرتبة بالأولوية المنطقية، وليست قائمة عشوائية.
- استخدم بيانات السوشيال المستخرجة أعلاه كأدلة موثوقة (تم استخراجها فعلياً من الصفحات).
- حلل جودة الحسابات وقدم توصيات محددة لتحسينها.`;
  }
}
