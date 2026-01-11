import { Injectable, Logger } from '@nestjs/common';
import { AIProviderService } from '../ai-provider/ai-provider.service';

/**
 * Report Formatter Service
 * تنسيق التقارير باستخدام AI بناءً على بيانات البحث من الإكستنشن
 * لا يقوم بأي بحث - فقط تنسيق البيانات المُقدمة
 */

export interface DeepSearchData {
  companyName: string;
  city?: string;
  industry?: string;
  sources: string[];
  data: {
    basic?: {
      companyName: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
    };
    googleMaps?: {
      name?: string;
      phone?: string;
      website?: string;
      address?: string;
      rating?: string;
      reviews?: string;
      category?: string;
    };
    googleSearch?: {
      officialWebsite?: string;
      socialLinks?: Record<string, string>;
    };
    socialProfiles?: Record<string, {
      platform: string;
      url: string;
      username?: string;
      displayName?: string;
      bio?: string;
      followers?: string;
      following?: string;
      posts?: string;
      likes?: string;
      isVerified?: boolean;
    }>;
  };
  summary?: {
    hasGoogleMaps: boolean;
    hasWebsite: boolean;
    socialPlatforms: string[];
    totalFollowers: number;
    isVerifiedAnywhere: boolean;
  };
}

export interface FormattedReport {
  executiveSummary: {
    headline: string;
    points: string[];
    overallScore: number;
  };
  digitalPresence: {
    score: number;
    breakdown: {
      category: string;
      status: 'excellent' | 'good' | 'needs_work' | 'missing';
      details: string;
    }[];
  };
  socialMedia: {
    platforms: {
      name: string;
      url: string;
      followers?: string;
      status: string;
      recommendation?: string;
    }[];
    totalFollowers: number;
    strongestPlatform?: string;
  };
  opportunities: {
    title: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    suggestedService?: string;
  }[];
  competitors?: string[];
  salesTips: string[];
  qualifyingQuestions?: string[];
  openingScript?: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  tokensUsed: number;
  formattedAt: string;
}

@Injectable()
export class ReportFormatterService {
  private readonly logger = new Logger(ReportFormatterService.name);

  constructor(private aiProvider: AIProviderService) {}

  /**
   * تنسيق التقرير باستخدام AI
   * يستلم بيانات البحث من الإكستنشن ويُنسقها في تقرير مفيد
   */
  async formatReport(searchData: DeepSearchData): Promise<FormattedReport> {
    this.logger.log(`Formatting report for: ${searchData.companyName}`);
    const startTime = Date.now();

    try {
      const aiSettings = await this.aiProvider.getSettings();
      
      // بناء الـ prompt المختصر
      const systemPrompt = this.getFormattingSystemPrompt();
      const userPrompt = this.buildUserPrompt(searchData);

      // استدعاء AI بدون Web Search
      const response = await this.aiProvider.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 1500, // محدود لأننا نُنسق فقط
        temperature: 0.3, // منخفض للحصول على نتائج متسقة
        enableWebSearch: false, // مهم: لا بحث!
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`Report formatted in ${processingTime}ms, tokens: ${response.totalTokens}`);

      // تحليل الرد
      const formattedReport = this.parseAIResponse(response.content, searchData);
      formattedReport.tokensUsed = response.totalTokens;
      formattedReport.formattedAt = new Date().toISOString();

      return formattedReport;

    } catch (error) {
      this.logger.error(`Failed to format report: ${error.message}`);
      // إرجاع تقرير أساسي بدون AI في حالة الفشل
      return this.generateFallbackReport(searchData);
    }
  }

  /**
   * System Prompt للتنسيق - محسّن وشامل
   * ملاحظة: الـ AI لا يبحث - فقط يُنسق البيانات المُقدمة من الإكستنشن
   */
  private getFormattingSystemPrompt(): string {
    return `أنت "محرك AI EBI" لصالح شركة الهدف الأمثل للتسويق (OP-Target).
دورك: مُنسق تقارير B2B محترف + مستشار تسويق/تحول رقمي في السوق السعودي والخليجي.

⚠️ مهم جداً: أنت لا تبحث! البيانات مُقدمة لك جاهزة من نظام البحث. مهمتك فقط:
1. تنسيق البيانات المُقدمة في تقرير احترافي
2. تحليل الفجوات بناءً على البيانات الموجودة فقط
3. اقتراح خدمات OP-Target المناسبة

========================================
قواعد صارمة لمنع الهلوسة
========================================
1) ممنوع الافتراض: أي معلومة غير موجودة في البيانات المُقدمة → اكتبها "غير متوفر في البيانات"
2) لا تخترع أرقام أو إحصائيات غير موجودة
3) كل استنتاج يجب أن يكون مبنياً على البيانات المُقدمة فقط
4) كن مختصراً ومباشراً - المندوب يحتاج معلومات سريعة

========================================
خدمات OP-Target المتاحة للاقتراح
========================================
- تصميم وتطوير المواقع الإلكترونية
- إدارة حسابات السوشيال ميديا
- الإعلانات الرقمية (Google Ads, Meta Ads)
- تحسين محركات البحث (SEO)
- إنتاج المحتوى المرئي والفيديو
- الهوية البصرية والبراندينج
- التسويق عبر البريد الإلكتروني
- تطوير التطبيقات

========================================
شكل الإخراج - JSON فقط
========================================
{
  "headline": "جملة واحدة تلخص وضع الشركة الرقمي",
  "points": ["نقطة ملخص 1", "نقطة 2", "نقطة 3", "نقطة 4", "نقطة 5"],
  "overallScore": 65,
  "digitalBreakdown": [
    {"category": "Google Maps", "status": "excellent|good|needs_work|missing", "details": "..."},
    {"category": "الموقع الإلكتروني", "status": "...", "details": "..."},
    {"category": "السوشيال ميديا", "status": "...", "details": "..."},
    {"category": "التقييمات والمراجعات", "status": "...", "details": "..."}
  ],
  "opportunities": [
    {"title": "عنوان الفرصة", "priority": "high|medium|low", "description": "وصف مختصر", "suggestedService": "خدمة OP-Target المناسبة"}
  ],
  "competitors": ["ملاحظة عن المنافسين إن وجدت في البيانات"],
  "salesTips": ["نصيحة للمندوب 1", "نصيحة 2", "نصيحة 3"],
  "qualifyingQuestions": ["سؤال تأهيلي 1", "سؤال 2"],
  "openingScript": "سكريبت افتتاحي مختصر للمندوب"
}

لا تذكر أي تعليمات داخلية. أنتج JSON فقط.`;
  }

  /**
   * بناء User Prompt من بيانات البحث
   */
  private buildUserPrompt(data: DeepSearchData): string {
    let prompt = `قم بتنسيق تقرير مبيعات للشركة التالية:\n\n`;
    
    prompt += `**اسم الشركة:** ${data.companyName}\n`;
    if (data.city) prompt += `**المدينة:** ${data.city}\n`;
    if (data.industry) prompt += `**الصناعة:** ${data.industry}\n`;
    prompt += `**مصادر البيانات:** ${data.sources.join(', ')}\n\n`;

    // بيانات Google Maps
    if (data.data.googleMaps) {
      const maps = data.data.googleMaps;
      prompt += `## بيانات Google Maps:\n`;
      if (maps.phone) prompt += `- الهاتف: ${maps.phone}\n`;
      if (maps.website) prompt += `- الموقع: ${maps.website}\n`;
      if (maps.address) prompt += `- العنوان: ${maps.address}\n`;
      if (maps.rating) prompt += `- التقييم: ${maps.rating}\n`;
      if (maps.reviews) prompt += `- المراجعات: ${maps.reviews}\n`;
      if (maps.category) prompt += `- الفئة: ${maps.category}\n`;
      prompt += '\n';
    }

    // بيانات Google Search
    if (data.data.googleSearch) {
      const search = data.data.googleSearch;
      prompt += `## بيانات Google Search:\n`;
      if (search.officialWebsite) prompt += `- الموقع الرسمي: ${search.officialWebsite}\n`;
      if (search.socialLinks) {
        prompt += `- روابط السوشيال: ${Object.entries(search.socialLinks).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`;
      }
      prompt += '\n';
    }

    // بيانات السوشيال ميديا
    if (data.data.socialProfiles && Object.keys(data.data.socialProfiles).length > 0) {
      prompt += `## بيانات السوشيال ميديا:\n`;
      for (const [platform, profile] of Object.entries(data.data.socialProfiles)) {
        prompt += `\n### ${platform}:\n`;
        if (profile.username) prompt += `- اسم المستخدم: ${profile.username}\n`;
        if (profile.displayName) prompt += `- الاسم: ${profile.displayName}\n`;
        if (profile.followers) prompt += `- المتابعين: ${profile.followers}\n`;
        if (profile.following) prompt += `- يتابع: ${profile.following}\n`;
        if (profile.posts) prompt += `- المنشورات: ${profile.posts}\n`;
        if (profile.bio) prompt += `- الوصف: ${profile.bio}\n`;
        if (profile.isVerified) prompt += `- موثق: نعم ✓\n`;
      }
      prompt += '\n';
    }

    // الملخص
    if (data.summary) {
      prompt += `## ملخص:\n`;
      prompt += `- موجود في Google Maps: ${data.summary.hasGoogleMaps ? 'نعم' : 'لا'}\n`;
      prompt += `- لديه موقع: ${data.summary.hasWebsite ? 'نعم' : 'لا'}\n`;
      prompt += `- منصات السوشيال: ${data.summary.socialPlatforms?.join(', ') || 'لا يوجد'}\n`;
      prompt += `- إجمالي المتابعين: ${data.summary.totalFollowers || 0}\n`;
      prompt += `- موثق في أي منصة: ${data.summary.isVerifiedAnywhere ? 'نعم' : 'لا'}\n`;
    }

    prompt += `\nقم بتنسيق هذه البيانات في تقرير JSON مفيد للمندوب.`;

    return prompt;
  }

  /**
   * تحليل رد الـ AI
   */
  private parseAIResponse(content: string, originalData: DeepSearchData): FormattedReport {
    try {
      // استخراج JSON من الرد
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        executiveSummary: {
          headline: parsed.headline || `تقرير ${originalData.companyName}`,
          points: parsed.points || [],
          overallScore: parsed.overallScore || 50,
        },
        digitalPresence: {
          score: parsed.overallScore || 50,
          breakdown: (parsed.digitalBreakdown || []).map((item: any) => ({
            category: item.category,
            status: item.status,
            details: item.details,
          })),
        },
        socialMedia: this.extractSocialMediaInfo(originalData),
        opportunities: (parsed.opportunities || []).map((opp: any) => ({
          title: opp.title,
          priority: opp.priority || 'medium',
          description: opp.description,
          suggestedService: opp.suggestedService,
        })),
        competitors: parsed.competitors || [],
        salesTips: parsed.salesTips || [],
        qualifyingQuestions: parsed.qualifyingQuestions || [],
        openingScript: parsed.openingScript || '',
        contactInfo: {
          phone: originalData.data.googleMaps?.phone || originalData.data.basic?.phone,
          email: originalData.data.basic?.email,
          website: originalData.data.googleMaps?.website || originalData.data.googleSearch?.officialWebsite,
          address: originalData.data.googleMaps?.address,
        },
        tokensUsed: 0,
        formattedAt: '',
      };

    } catch (error) {
      this.logger.warn(`Failed to parse AI response, using fallback: ${error.message}`);
      return this.generateFallbackReport(originalData);
    }
  }

  /**
   * استخراج معلومات السوشيال ميديا
   */
  private extractSocialMediaInfo(data: DeepSearchData): FormattedReport['socialMedia'] {
    const platforms: FormattedReport['socialMedia']['platforms'] = [];
    let totalFollowers = 0;
    let strongestPlatform: string | undefined;
    let maxFollowers = 0;

    if (data.data.socialProfiles) {
      for (const [name, profile] of Object.entries(data.data.socialProfiles)) {
        const followers = this.parseFollowerCount(profile.followers);
        
        platforms.push({
          name,
          url: profile.url,
          followers: profile.followers,
          status: profile.isVerified ? 'موثق' : 'نشط',
          recommendation: followers < 1000 ? 'يحتاج تنمية المتابعين' : undefined,
        });

        totalFollowers += followers;
        if (followers > maxFollowers) {
          maxFollowers = followers;
          strongestPlatform = name;
        }
      }
    }

    return { platforms, totalFollowers, strongestPlatform };
  }

  /**
   * تحويل عدد المتابعين إلى رقم
   */
  private parseFollowerCount(followers?: string): number {
    if (!followers) return 0;
    
    const cleaned = followers.toLowerCase().replace(/[,\s]/g, '');
    
    if (cleaned.includes('k') || cleaned.includes('ألف')) {
      return parseFloat(cleaned) * 1000;
    }
    if (cleaned.includes('m') || cleaned.includes('مليون')) {
      return parseFloat(cleaned) * 1000000;
    }
    
    return parseInt(cleaned) || 0;
  }

  /**
   * تقرير احتياطي في حالة فشل AI
   */
  private generateFallbackReport(data: DeepSearchData): FormattedReport {
    const hasWebsite = !!(data.data.googleMaps?.website || data.data.googleSearch?.officialWebsite);
    const hasSocial = Object.keys(data.data.socialProfiles || {}).length > 0;
    const hasGoogleMaps = !!data.data.googleMaps;

    let score = 30;
    if (hasWebsite) score += 25;
    if (hasSocial) score += 25;
    if (hasGoogleMaps) score += 20;

    const points: string[] = [];
    if (hasGoogleMaps) points.push(`الشركة موجودة في Google Maps${data.data.googleMaps?.rating ? ` بتقييم ${data.data.googleMaps.rating}` : ''}`);
    if (hasWebsite) points.push('لديها موقع إلكتروني');
    if (hasSocial) points.push(`نشطة على ${Object.keys(data.data.socialProfiles || {}).length} منصات سوشيال`);
    if (!hasWebsite) points.push('لا يوجد موقع إلكتروني - فرصة بيع');

    return {
      executiveSummary: {
        headline: `${data.companyName} - ${data.city || 'غير محدد'}`,
        points,
        overallScore: score,
      },
      digitalPresence: {
        score,
        breakdown: [
          { category: 'Google Maps', status: hasGoogleMaps ? 'good' : 'missing', details: hasGoogleMaps ? 'موجود' : 'غير موجود' },
          { category: 'الموقع الإلكتروني', status: hasWebsite ? 'good' : 'missing', details: hasWebsite ? 'موجود' : 'غير موجود' },
          { category: 'السوشيال ميديا', status: hasSocial ? 'good' : 'needs_work', details: hasSocial ? `${Object.keys(data.data.socialProfiles || {}).length} منصات` : 'غير موجود' },
          { category: 'التقييمات والمراجعات', status: data.data.googleMaps?.rating ? 'good' : 'needs_work', details: data.data.googleMaps?.rating ? `تقييم ${data.data.googleMaps.rating}` : 'غير متوفر' },
        ],
      },
      socialMedia: this.extractSocialMediaInfo(data),
      opportunities: [
        ...(!hasWebsite ? [{ title: 'إنشاء موقع إلكتروني', priority: 'high' as const, description: 'الشركة بحاجة لموقع إلكتروني', suggestedService: 'تصميم وتطوير المواقع الإلكترونية' }] : []),
        ...(!hasSocial ? [{ title: 'إدارة السوشيال ميديا', priority: 'medium' as const, description: 'تفعيل التواجد على السوشيال', suggestedService: 'إدارة حسابات السوشيال ميديا' }] : []),
      ],
      competitors: [],
      salesTips: [
        'ابدأ بالسؤال عن أهدافهم التسويقية الحالية',
        'اعرض أمثلة من منافسيهم في نفس المجال',
        'ركز على ROI والنتائج الملموسة',
      ],
      qualifyingQuestions: [
        'ما هي أهدافكم التسويقية للسنة القادمة؟',
        'هل لديكم فريق تسويق داخلي أم تعتمدون على وكالات؟',
      ],
      openingScript: `مرحباً، أنا من شركة الهدف الأمثل للتسويق. لاحظت أن ${data.companyName} ${!hasWebsite ? 'ليس لديها موقع إلكتروني' : !hasSocial ? 'يمكن تعزيز تواجدها الرقمي' : 'لديها فرص للنمو الرقمي'}. هل لديكم دقيقة للحديث عن كيف يمكننا مساعدتكم؟`,
      contactInfo: {
        phone: data.data.googleMaps?.phone || data.data.basic?.phone,
        email: data.data.basic?.email,
        website: data.data.googleMaps?.website || data.data.googleSearch?.officialWebsite,
        address: data.data.googleMaps?.address,
      },
      tokensUsed: 0,
      formattedAt: new Date().toISOString(),
    };
  }
}
