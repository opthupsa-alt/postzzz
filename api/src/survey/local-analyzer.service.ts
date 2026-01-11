import { Injectable, Logger } from '@nestjs/common';

/**
 * Local Analyzer Service
 * تحليل محلي ذكي للشركات بدون الحاجة لـ AI خارجي
 * يعطي توصيات بناءً على البيانات المتاحة
 */

export interface SocialProfile {
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
  website?: string;
  location?: string;
  scrapedAt?: string;
}

export interface CompanyData {
  companyName: string;
  industry?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  socialLinks?: Record<string, string>;
  socialProfiles?: Record<string, SocialProfile>;
  // بيانات جديدة من البحث المتعدد الطبقات
  allEmails?: string[];
  allPhones?: string[];
  totalFollowers?: number;
  strongestPlatform?: string;
  dataCompleteness?: number;
  dataSources?: {
    googleMaps?: boolean;
    googleSearch?: boolean;
    website?: boolean;
    socialMedia?: boolean;
  };
  description?: string;
  metadata?: any;
}

export interface LocalAnalysisResult {
  executiveSummary: {
    points: string[];
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  digitalPresenceScore: number;
  gaps: {
    category: string;
    status: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'MISSING';
    recommendation: string;
  }[];
  recommendedServices: {
    service: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  }[];
  salesTips: string[];
  qualificationScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class LocalAnalyzerService {
  private readonly logger = new Logger(LocalAnalyzerService.name);

  /**
   * تحليل شركة محلياً بدون AI
   */
  analyzeCompany(data: CompanyData): LocalAnalysisResult {
    this.logger.log(`Analyzing company locally: ${data.companyName}`);

    const digitalScore = this.calculateDigitalPresenceScore(data);
    const gaps = this.identifyGaps(data);
    const services = this.recommendServices(data, gaps);
    const summary = this.generateSummary(data, digitalScore, gaps);
    const salesTips = this.generateSalesTips(data, gaps);
    const qualificationScore = this.calculateQualificationScore(data, digitalScore);

    return {
      executiveSummary: summary,
      digitalPresenceScore: digitalScore,
      gaps,
      recommendedServices: services,
      salesTips,
      qualificationScore,
      priority: qualificationScore >= 70 ? 'HIGH' : qualificationScore >= 40 ? 'MEDIUM' : 'LOW',
    };
  }

  /**
   * حساب درجة الحضور الرقمي - محسّن
   */
  private calculateDigitalPresenceScore(data: CompanyData): number {
    let score = 0;
    const weights = {
      website: 20,
      phone: 10,
      email: 10,
      address: 5,
      rating: 15,
      socialMedia: 20,
      socialProfiles: 10,
      dataCompleteness: 10,
    };

    // الموقع الإلكتروني
    if (data.website) {
      score += weights.website;
      // مكافأة إضافية للمواقع HTTPS
      if (data.website.startsWith('https://')) {
        score += 3;
      }
    }

    // الهاتف
    if (data.phone) {
      score += weights.phone;
    }

    // البريد الإلكتروني - تحسين: التحقق من جميع المصادر
    if (data.email || (data.allEmails && data.allEmails.length > 0)) {
      score += weights.email;
      // مكافأة للبريد الرسمي
      const email = data.email || data.allEmails?.[0];
      if (email && (email.includes('info@') || email.includes('contact@'))) {
        score += 2;
      }
    }

    // العنوان
    if (data.address) {
      score += weights.address;
    }

    // التقييم
    if (data.rating) {
      const ratingScore = (data.rating / 5) * weights.rating;
      score += ratingScore;
      // مكافأة للتقييمات العالية مع عدد مراجعات كبير
      if (data.rating >= 4 && data.reviewCount && data.reviewCount > 50) {
        score += 5;
      }
    }

    // السوشيال ميديا - روابط
    const socialCount = Object.keys(data.socialLinks || {}).length;
    if (socialCount > 0) {
      const socialScore = Math.min(socialCount * 4, weights.socialMedia);
      score += socialScore;
    }

    // السوشيال ميديا - بيانات مفصلة
    const profileCount = Object.keys(data.socialProfiles || {}).length;
    if (profileCount > 0) {
      score += Math.min(profileCount * 3, weights.socialProfiles);
      
      // مكافأة للمتابعين الكثر
      if (data.totalFollowers && data.totalFollowers > 10000) {
        score += 5;
      }
    }

    // مكافأة لاكتمال البيانات
    if (data.dataCompleteness && data.dataCompleteness > 70) {
      score += weights.dataCompleteness;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * تحديد الفجوات - محسّن
   */
  private identifyGaps(data: CompanyData): LocalAnalysisResult['gaps'] {
    const gaps: LocalAnalysisResult['gaps'] = [];

    // فجوة الموقع الإلكتروني
    if (!data.website) {
      gaps.push({
        category: 'الموقع الإلكتروني',
        status: 'MISSING',
        recommendation: 'إنشاء موقع إلكتروني احترافي يعكس هوية الشركة ويعرض خدماتها',
      });
    } else if (!data.website.startsWith('https://')) {
      gaps.push({
        category: 'أمان الموقع',
        status: 'NEEDS_IMPROVEMENT',
        recommendation: 'تفعيل شهادة SSL لتأمين الموقع وتحسين ترتيبه في محركات البحث',
      });
    } else {
      gaps.push({
        category: 'الموقع الإلكتروني',
        status: 'GOOD',
        recommendation: 'الموقع موجود - يُنصح بمراجعة سرعته وتجربة المستخدم',
      });
    }

    // فجوة السوشيال ميديا - محسّن: استخدام socialProfiles أيضاً
    const socialLinksCount = Object.keys(data.socialLinks || {}).length;
    const socialProfilesCount = Object.keys(data.socialProfiles || {}).length;
    const totalSocialPresence = Math.max(socialLinksCount, socialProfilesCount);
    
    if (totalSocialPresence === 0) {
      gaps.push({
        category: 'السوشيال ميديا',
        status: 'MISSING',
        recommendation: 'إنشاء حسابات على المنصات الرئيسية (انستقرام، تويتر، لينكدإن) والنشر بانتظام',
      });
    } else if (totalSocialPresence < 3) {
      gaps.push({
        category: 'السوشيال ميديا',
        status: 'NEEDS_IMPROVEMENT',
        recommendation: `موجود على ${totalSocialPresence} منصات - يُنصح بالتوسع في منصات إضافية`,
      });
    } else {
      // تحليل أعمق للسوشيال
      let recommendation = 'حضور جيد';
      if (data.totalFollowers && data.totalFollowers < 1000) {
        recommendation = 'حضور جيد لكن المتابعين قليلون - يُنصح بحملات لزيادة المتابعين';
      } else if (data.strongestPlatform) {
        recommendation = `حضور قوي خاصة على ${data.strongestPlatform} - يُنصح بتعزيز المنصات الأخرى`;
      }
      gaps.push({
        category: 'السوشيال ميديا',
        status: 'GOOD',
        recommendation,
      });
    }

    // فجوة التقييمات
    if (!data.rating || data.rating < 3) {
      gaps.push({
        category: 'التقييمات والسمعة',
        status: data.rating ? 'NEEDS_IMPROVEMENT' : 'MISSING',
        recommendation: 'تحسين جودة الخدمة وتشجيع العملاء على ترك تقييمات إيجابية',
      });
    } else if (data.rating >= 4) {
      const reviewNote = data.reviewCount && data.reviewCount > 100 
        ? `تقييم ممتاز (${data.rating}/5) مع ${data.reviewCount} مراجعة`
        : `تقييم جيد (${data.rating}/5)`;
      gaps.push({
        category: 'التقييمات والسمعة',
        status: 'GOOD',
        recommendation: `${reviewNote} - يُنصح بالاستفادة منه في التسويق`,
      });
    } else {
      gaps.push({
        category: 'التقييمات والسمعة',
        status: 'NEEDS_IMPROVEMENT',
        recommendation: `تقييم متوسط (${data.rating}/5) - يحتاج تحسين`,
      });
    }

    // فجوة البريد الإلكتروني - محسّن: التحقق من allEmails أيضاً
    const hasEmail = data.email || (data.allEmails && data.allEmails.length > 0);
    if (!hasEmail) {
      gaps.push({
        category: 'البريد الإلكتروني',
        status: 'MISSING',
        recommendation: 'إنشاء بريد إلكتروني رسمي باسم الشركة لزيادة المصداقية',
      });
    } else {
      const email = data.email || data.allEmails?.[0];
      const isOfficial = email && !email.includes('gmail') && !email.includes('yahoo') && !email.includes('hotmail');
      gaps.push({
        category: 'البريد الإلكتروني',
        status: isOfficial ? 'GOOD' : 'NEEDS_IMPROVEMENT',
        recommendation: isOfficial 
          ? 'بريد رسمي موجود ✓'
          : 'يُنصح باستخدام بريد رسمي باسم الدومين بدلاً من البريد الشخصي',
      });
    }

    // فجوة الهاتف
    const hasPhone = data.phone || (data.allPhones && data.allPhones.length > 0);
    if (!hasPhone) {
      gaps.push({
        category: 'رقم الهاتف',
        status: 'MISSING',
        recommendation: 'إضافة رقم هاتف للتواصل المباشر مع العملاء',
      });
    }

    // فجوة SEO
    gaps.push({
      category: 'تحسين محركات البحث (SEO)',
      status: data.website ? 'NEEDS_IMPROVEMENT' : 'MISSING',
      recommendation: data.website 
        ? 'تحسين ظهور الموقع في نتائج البحث من خلال تحسين المحتوى والكلمات المفتاحية'
        : 'إنشاء موقع أولاً ثم العمل على تحسين ظهوره في محركات البحث',
    });

    // فجوة Google Maps
    if (!data.dataSources?.googleMaps) {
      gaps.push({
        category: 'Google Maps',
        status: 'MISSING',
        recommendation: 'إضافة النشاط التجاري في Google Maps لتسهيل وصول العملاء',
      });
    }

    return gaps;
  }

  /**
   * توصية الخدمات المناسبة
   */
  private recommendServices(data: CompanyData, gaps: LocalAnalysisResult['gaps']): LocalAnalysisResult['recommendedServices'] {
    const services: LocalAnalysisResult['recommendedServices'] = [];

    // خدمات بناءً على الفجوات
    for (const gap of gaps) {
      if (gap.status === 'MISSING') {
        switch (gap.category) {
          case 'الموقع الإلكتروني':
            services.push({
              service: 'تصميم وتطوير موقع إلكتروني',
              priority: 'HIGH',
              reason: 'الشركة بدون موقع إلكتروني - فرصة كبيرة للتحسين',
            });
            break;
          case 'السوشيال ميديا':
            services.push({
              service: 'إدارة حسابات السوشيال ميديا',
              priority: 'HIGH',
              reason: 'غياب تام عن منصات التواصل الاجتماعي',
            });
            break;
          case 'البريد الإلكتروني':
            services.push({
              service: 'إعداد البريد الإلكتروني الرسمي',
              priority: 'MEDIUM',
              reason: 'لا يوجد بريد إلكتروني رسمي للشركة',
            });
            break;
        }
      } else if (gap.status === 'NEEDS_IMPROVEMENT') {
        switch (gap.category) {
          case 'السوشيال ميديا':
            services.push({
              service: 'تطوير استراتيجية السوشيال ميديا',
              priority: 'MEDIUM',
              reason: 'حضور محدود على منصات التواصل',
            });
            break;
          case 'التقييمات والسمعة':
            services.push({
              service: 'إدارة السمعة الرقمية',
              priority: 'MEDIUM',
              reason: 'التقييمات تحتاج تحسين',
            });
            break;
          case 'تحسين محركات البحث (SEO)':
            services.push({
              service: 'تحسين محركات البحث (SEO)',
              priority: 'MEDIUM',
              reason: 'الموقع يحتاج تحسين في الظهور',
            });
            break;
        }
      }
    }

    // خدمات إضافية بناءً على النشاط
    const industry = (data.industry || '').toLowerCase();
    
    if (industry.includes('مطعم') || industry.includes('مقهى') || industry.includes('كافيه')) {
      services.push({
        service: 'تصوير احترافي للمنتجات',
        priority: 'HIGH',
        reason: 'قطاع المطاعم يحتاج صور جذابة للأطعمة',
      });
      services.push({
        service: 'إدارة التقييمات على Google Maps',
        priority: 'HIGH',
        reason: 'التقييمات مهمة جداً في قطاع المطاعم',
      });
    }

    if (industry.includes('عقار') || industry.includes('مقاولات')) {
      services.push({
        service: 'تصوير فيديو وجولات افتراضية',
        priority: 'HIGH',
        reason: 'العقارات تحتاج عرض بصري قوي',
      });
    }

    if (industry.includes('طب') || industry.includes('صحة') || industry.includes('عيادة')) {
      services.push({
        service: 'تسويق المحتوى الصحي',
        priority: 'HIGH',
        reason: 'بناء الثقة مهم في القطاع الصحي',
      });
    }

    // إزالة التكرارات وترتيب حسب الأولوية
    const uniqueServices = services.filter((s, i, arr) => 
      arr.findIndex(x => x.service === s.service) === i
    );

    return uniqueServices.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }).slice(0, 6);
  }

  /**
   * توليد الملخص التنفيذي
   */
  private generateSummary(
    data: CompanyData, 
    digitalScore: number, 
    gaps: LocalAnalysisResult['gaps']
  ): LocalAnalysisResult['executiveSummary'] {
    const points: string[] = [];

    // نقطة عن الشركة
    points.push(`${data.companyName} - ${data.industry || 'نشاط غير محدد'} في ${data.city || 'موقع غير محدد'}`);

    // نقطة عن الحضور الرقمي
    if (digitalScore >= 70) {
      points.push(`حضور رقمي قوي (${digitalScore}%) - الشركة لديها أساس جيد للتطوير`);
    } else if (digitalScore >= 40) {
      points.push(`حضور رقمي متوسط (${digitalScore}%) - فرص كبيرة للتحسين والنمو`);
    } else {
      points.push(`حضور رقمي ضعيف (${digitalScore}%) - الشركة بحاجة ماسة للتحول الرقمي`);
    }

    // نقاط عن الفجوات الرئيسية
    const missingGaps = gaps.filter(g => g.status === 'MISSING');
    if (missingGaps.length > 0) {
      points.push(`فجوات رئيسية: ${missingGaps.map(g => g.category).join('، ')}`);
    }

    // نقطة عن التقييم
    if (data.rating) {
      if (data.rating >= 4) {
        points.push(`تقييم ممتاز (${data.rating}/5) مع ${data.reviewCount || 0} مراجعة - سمعة جيدة يمكن الاستفادة منها`);
      } else if (data.rating >= 3) {
        points.push(`تقييم متوسط (${data.rating}/5) - يحتاج تحسين في جودة الخدمة`);
      } else {
        points.push(`تقييم منخفض (${data.rating}/5) - أولوية قصوى لتحسين تجربة العملاء`);
      }
    }

    // نقطة عن الفرصة
    if (digitalScore < 50) {
      points.push('فرصة مبيعات عالية - العميل يحتاج خدمات رقمية متعددة');
    }

    // تحديد مستوى الثقة
    let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    const dataPoints = [data.website, data.phone, data.email, data.address, data.rating].filter(Boolean).length;
    if (dataPoints >= 4) {
      confidenceLevel = 'HIGH';
    } else if (dataPoints <= 1) {
      confidenceLevel = 'LOW';
    }

    return { points, confidenceLevel };
  }

  /**
   * توليد نصائح للمبيعات
   */
  private generateSalesTips(data: CompanyData, gaps: LocalAnalysisResult['gaps']): string[] {
    const tips: string[] = [];

    // نصائح بناءً على الفجوات
    const missingGaps = gaps.filter(g => g.status === 'MISSING');
    
    if (missingGaps.some(g => g.category === 'الموقع الإلكتروني')) {
      tips.push('ابدأ الحديث عن أهمية الموقع الإلكتروني في عصر التحول الرقمي');
      tips.push('اسأل: "كيف يجدك العملاء الجدد حالياً؟"');
    }

    if (missingGaps.some(g => g.category === 'السوشيال ميديا')) {
      tips.push('اسأل: "هل تستخدمون السوشيال ميديا للتواصل مع العملاء؟"');
      tips.push('أظهر أمثلة لمنافسين ناجحين على السوشيال ميديا');
    }

    // نصائح عامة
    if (data.rating && data.rating >= 4) {
      tips.push('استخدم التقييم الجيد كنقطة قوة - "تقييمكم ممتاز، كيف يمكننا مساعدتكم للوصول لعملاء أكثر؟"');
    }

    if (data.rating && data.rating < 3) {
      tips.push('كن حذراً عند ذكر التقييم - ركز على الحلول لتحسين تجربة العملاء');
    }

    tips.push('اسأل عن أهداف الشركة للسنة القادمة');
    tips.push('اسأل عن التحديات الحالية في جذب العملاء');

    return tips.slice(0, 6);
  }

  /**
   * حساب درجة التأهيل
   */
  private calculateQualificationScore(data: CompanyData, digitalScore: number): number {
    let score = 0;

    // كلما كان الحضور الرقمي أضعف، كلما كانت الفرصة أكبر
    if (digitalScore < 30) {
      score += 40; // فرصة كبيرة جداً
    } else if (digitalScore < 50) {
      score += 30; // فرصة كبيرة
    } else if (digitalScore < 70) {
      score += 20; // فرصة متوسطة
    } else {
      score += 10; // فرصة محدودة
    }

    // وجود معلومات الاتصال يزيد من إمكانية التواصل
    if (data.phone) score += 20;
    if (data.email) score += 15;
    if (data.website) score += 10;

    // التقييم الجيد يدل على شركة ناجحة قد تستثمر
    if (data.rating && data.rating >= 4) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * التحقق من جودة اسم الشركة
   */
  validateCompanyName(name: string): { valid: boolean; reason?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, reason: 'الاسم فارغ' };
    }

    const trimmed = name.trim();

    // التحقق من الطول
    if (trimmed.length < 2) {
      return { valid: false, reason: 'الاسم قصير جداً' };
    }

    if (trimmed.length > 100) {
      return { valid: false, reason: 'الاسم طويل جداً' };
    }

    // التحقق من الأحرف الغريبة
    const hasWeirdChars = /[^\w\s\u0600-\u06FF\u0750-\u077F\-&.,()]/g.test(trimmed);
    if (hasWeirdChars) {
      return { valid: false, reason: 'الاسم يحتوي على أحرف غير صالحة' };
    }

    // التحقق من أن الاسم ليس مجرد أرقام
    if (/^\d+$/.test(trimmed)) {
      return { valid: false, reason: 'الاسم لا يمكن أن يكون أرقاماً فقط' };
    }

    // التحقق من أن الاسم يحتوي على كلمات حقيقية
    const words = trimmed.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) {
      return { valid: false, reason: 'الاسم لا يحتوي على كلمات صالحة' };
    }

    return { valid: true };
  }
}
