# المرحلة 5: Data Merger & Verification

> آخر تحديث: 2026-01-08

---

## 🎯 الهدف

إنشاء نظام ذكي لدمج البيانات من مصادر متعددة والتحقق من صحتها.

---

## 📊 مصادر البيانات

| المصدر | البيانات المتوفرة |
|--------|-------------------|
| Google Maps | الاسم، العنوان، الهاتف، الموقع، التقييم |
| Google Search | الموقع الرسمي، روابط Social Media |
| Instagram | حساب Instagram، Bio، Website |
| Twitter/X | حساب Twitter، Bio |
| LinkedIn | صفحة الشركة، Industry |
| Facebook | صفحة Facebook، Category |

---

## 🔧 خوارزمية الدمج

### 1. Data Merger

```javascript
// extension/search/data-merger.js

class DataMerger {
  constructor() {
    this.sources = [];
    this.mergedData = {};
  }

  /**
   * إضافة بيانات من مصدر
   */
  addSource(sourceName, data) {
    this.sources.push({
      name: sourceName,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * دمج جميع المصادر
   */
  merge() {
    this.mergedData = {
      // البيانات الأساسية
      companyName: this.mergeField('companyName', 'name'),
      industry: this.mergeField('industry', 'category', 'type'),
      
      // بيانات الاتصال
      phones: this.mergePhones(),
      emails: this.mergeEmails(),
      website: this.mergeWebsite(),
      
      // العناوين
      addresses: this.mergeAddresses(),
      
      // الروابط
      links: this.mergeLinks(),
      
      // معلومات إضافية
      rating: this.getFromSource('google_maps', 'rating'),
      reviewsCount: this.getFromSource('google_maps', 'reviews'),
      workingHours: this.getFromSource('google_maps', 'hours'),
      
      // التحقق
      verification: this.calculateVerification(),
    };

    return this.mergedData;
  }

  /**
   * دمج حقل من مصادر متعددة
   */
  mergeField(...fieldNames) {
    for (const source of this.sources) {
      for (const fieldName of fieldNames) {
        if (source.data[fieldName]) {
          return source.data[fieldName];
        }
      }
    }
    return null;
  }

  /**
   * دمج أرقام الهواتف
   */
  mergePhones() {
    const phones = new Set();
    
    for (const source of this.sources) {
      const phone = source.data.phone || source.data.phones;
      if (phone) {
        if (Array.isArray(phone)) {
          phone.forEach(p => phones.add(this.normalizePhone(p)));
        } else {
          phones.add(this.normalizePhone(phone));
        }
      }
    }
    
    return [...phones].filter(Boolean);
  }

  /**
   * تطبيع رقم الهاتف
   */
  normalizePhone(phone) {
    if (!phone) return null;
    // إزالة كل شيء ما عدا الأرقام و +
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * دمج الإيميلات
   */
  mergeEmails() {
    const emails = new Set();
    
    for (const source of this.sources) {
      const email = source.data.email || source.data.emails;
      if (email) {
        if (Array.isArray(email)) {
          email.forEach(e => emails.add(e.toLowerCase()));
        } else {
          emails.add(email.toLowerCase());
        }
      }
    }
    
    return [...emails].filter(Boolean);
  }

  /**
   * دمج الموقع الإلكتروني
   */
  mergeWebsite() {
    // الأولوية: Google Maps > Google Search > Instagram > LinkedIn
    const priority = ['google_maps', 'google_search', 'instagram', 'linkedin'];
    
    for (const sourceName of priority) {
      const source = this.sources.find(s => s.name === sourceName);
      if (source?.data.website) {
        return this.normalizeUrl(source.data.website);
      }
    }
    
    return null;
  }

  /**
   * تطبيع URL
   */
  normalizeUrl(url) {
    if (!url) return null;
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    try {
      const parsed = new URL(url);
      return parsed.origin + parsed.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  /**
   * دمج العناوين
   */
  mergeAddresses() {
    const addresses = {
      main: null,
      branches: [],
    };
    
    const mapsSource = this.sources.find(s => s.name === 'google_maps');
    if (mapsSource?.data.address) {
      addresses.main = mapsSource.data.address;
    }
    
    return addresses;
  }

  /**
   * دمج الروابط
   */
  mergeLinks() {
    const links = {
      googleMaps: null,
      website: null,
      instagram: null,
      twitter: null,
      facebook: null,
      linkedin: null,
      tiktok: null,
      snapchat: null,
    };
    
    for (const source of this.sources) {
      // Google Maps link
      if (source.name === 'google_maps' && source.data.sourceUrl) {
        links.googleMaps = source.data.sourceUrl;
      }
      
      // Website
      if (source.data.website && !links.website) {
        links.website = this.normalizeUrl(source.data.website);
      }
      
      // Social Media links
      if (source.name === 'instagram' && source.data.url) {
        links.instagram = source.data.url;
      }
      if (source.name === 'twitter' && source.data.url) {
        links.twitter = source.data.url;
      }
      if (source.name === 'facebook' && source.data.url) {
        links.facebook = source.data.url;
      }
      if (source.name === 'linkedin' && source.data.url) {
        links.linkedin = source.data.url;
      }
      if (source.name === 'tiktok' && source.data.url) {
        links.tiktok = source.data.url;
      }
      if (source.name === 'snapchat' && source.data.url) {
        links.snapchat = source.data.url;
      }
      
      // Social links from Google Search
      if (source.name === 'google_search' && source.data.socialLinks) {
        const social = source.data.socialLinks;
        if (social.instagram && !links.instagram) links.instagram = social.instagram;
        if (social.twitter && !links.twitter) links.twitter = social.twitter;
        if (social.facebook && !links.facebook) links.facebook = social.facebook;
        if (social.linkedin && !links.linkedin) links.linkedin = social.linkedin;
        if (social.tiktok && !links.tiktok) links.tiktok = social.tiktok;
      }
    }
    
    return links;
  }

  /**
   * حساب درجة التحقق
   */
  calculateVerification() {
    const sources = this.sources.map(s => s.name);
    
    // حساب Confidence Score
    let confidence = 0;
    
    // نقاط لكل مصدر
    if (sources.includes('google_maps')) confidence += 40;
    if (sources.includes('google_search')) confidence += 20;
    if (sources.includes('instagram')) confidence += 10;
    if (sources.includes('twitter')) confidence += 10;
    if (sources.includes('linkedin')) confidence += 10;
    if (sources.includes('facebook')) confidence += 5;
    if (sources.includes('tiktok')) confidence += 3;
    if (sources.includes('snapchat')) confidence += 2;
    
    // نقاط إضافية للبيانات المتطابقة
    if (this.hasMatchingWebsites()) confidence += 10;
    if (this.hasMatchingPhones()) confidence += 10;
    
    return {
      confidence: Math.min(100, confidence),
      sources,
      sourcesCount: sources.length,
      lastVerified: new Date().toISOString(),
    };
  }

  /**
   * التحقق من تطابق المواقع
   */
  hasMatchingWebsites() {
    const websites = this.sources
      .map(s => this.normalizeUrl(s.data.website))
      .filter(Boolean);
    
    if (websites.length < 2) return false;
    
    const unique = new Set(websites);
    return unique.size < websites.length; // هناك تطابق
  }

  /**
   * التحقق من تطابق الهواتف
   */
  hasMatchingPhones() {
    const phones = this.sources
      .map(s => this.normalizePhone(s.data.phone))
      .filter(Boolean);
    
    if (phones.length < 2) return false;
    
    const unique = new Set(phones);
    return unique.size < phones.length;
  }

  /**
   * الحصول على قيمة من مصدر محدد
   */
  getFromSource(sourceName, fieldName) {
    const source = this.sources.find(s => s.name === sourceName);
    return source?.data[fieldName] || null;
  }
}

export default DataMerger;
```

---

## 🔄 Orchestrator الرئيسي

```javascript
// extension/search/orchestrator.js

import DataMerger from './data-merger.js';
import { searchGoogleMaps } from './google-maps.js';
import { searchGoogle } from './google-search.js';
import { searchSocialMedia } from './social-media.js';

class SearchOrchestrator {
  constructor(config = {}) {
    this.config = {
      enableGoogleMaps: true,
      enableGoogleSearch: true,
      enableSocialMedia: true,
      socialPlatforms: ['instagram', 'twitter', 'linkedin'],
      ...config,
    };
  }

  /**
   * البحث الفردي المُثري
   */
  async searchSingle(companyName, city, country = 'السعودية') {
    const merger = new DataMerger();
    const progress = { current: 0, total: 100 };
    
    try {
      // Layer 1: Google Maps (40%)
      if (this.config.enableGoogleMaps) {
        this.updateProgress(progress, 10, 'جاري البحث في خرائط جوجل...');
        const mapsResults = await searchGoogleMaps({
          query: companyName,
          city,
          country,
          searchType: 'SINGLE',
        });
        
        if (mapsResults.length > 0) {
          merger.addSource('google_maps', mapsResults[0]);
        }
        this.updateProgress(progress, 40);
      }
      
      // Layer 2: Google Search (20%)
      if (this.config.enableGoogleSearch) {
        this.updateProgress(progress, 45, 'جاري البحث في جوجل...');
        const searchResults = await searchGoogle(companyName, city);
        
        if (searchResults) {
          merger.addSource('google_search', searchResults);
        }
        this.updateProgress(progress, 60);
      }
      
      // Layer 3: Social Media (30%)
      if (this.config.enableSocialMedia && this.config.socialPlatforms.length > 0) {
        this.updateProgress(progress, 65, 'جاري البحث في منصات التواصل...');
        const socialResults = await searchSocialMedia(
          companyName,
          city,
          this.config.socialPlatforms
        );
        
        for (const [platform, data] of Object.entries(socialResults)) {
          if (data) {
            merger.addSource(platform, data);
          }
        }
        this.updateProgress(progress, 90);
      }
      
      // Merge all data
      this.updateProgress(progress, 95, 'جاري دمج البيانات...');
      const mergedLead = merger.merge();
      
      this.updateProgress(progress, 100, 'اكتمل البحث');
      
      return {
        success: true,
        lead: mergedLead,
        sources: merger.sources.map(s => s.name),
      };
      
    } catch (error) {
      console.error('Search failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * البحث الجماعي
   */
  async searchBulk(activity, city, country = 'السعودية', maxResults = 30) {
    // البحث الجماعي يستخدم Google Maps فقط
    const mapsResults = await searchGoogleMaps({
      query: activity,
      city,
      country,
      searchType: 'BULK',
      maxResults,
    });
    
    return {
      success: true,
      leads: mapsResults.map(r => ({
        companyName: r.name,
        industry: activity,
        city,
        phone: r.phone,
        website: r.website,
        address: r.address,
        links: {
          googleMaps: r.sourceUrl,
        },
        verification: {
          confidence: 40,
          sources: ['google_maps'],
          sourcesCount: 1,
        },
      })),
      count: mapsResults.length,
    };
  }

  updateProgress(progress, value, message) {
    progress.current = value;
    if (this.onProgress) {
      this.onProgress(value, message);
    }
  }
}

export default SearchOrchestrator;
```

---

## 📁 تحديث Backend

### تحديث Lead Model

```prisma
// api/prisma/schema.prisma

model Lead {
  id          String   @id @default(uuid())
  tenantId    String
  
  // البيانات الأساسية
  companyName String
  industry    String?
  city        String?
  country     String?
  
  // بيانات الاتصال
  phone       String?
  phones      String[]  // 🆕 أرقام متعددة
  email       String?
  emails      String[]  // 🆕 إيميلات متعددة
  website     String?
  address     String?
  
  // الروابط 🆕
  links       Json?     // { googleMaps, instagram, twitter, ... }
  
  // التحقق 🆕
  verification Json?    // { confidence, sources, lastVerified }
  
  // Metadata
  source      String?
  jobId       String?
  metadata    Json?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
}
```

### تحديث Create Lead DTO

```typescript
// api/src/leads/dto/create-lead.dto.ts

export class CreateLeadDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  phones?: string[];  // 🆕

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsArray()
  emails?: string[];  // 🆕

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  links?: {           // 🆕
    googleMaps?: string;
    website?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    snapchat?: string;
  };

  @IsOptional()
  @IsObject()
  verification?: {    // 🆕
    confidence: number;
    sources: string[];
    sourcesCount: number;
    lastVerified?: string;
  };

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

---

## ✅ قائمة المهام

### Extension
- [ ] إنشاء data-merger.js
- [ ] إنشاء orchestrator.js
- [ ] تحديث background.js لاستخدام Orchestrator
- [ ] اختبار الدمج

### Backend
- [ ] تحديث schema.prisma
- [ ] تشغيل migration
- [ ] تحديث create-lead.dto.ts
- [ ] تحديث leads.service.ts

### Frontend
- [ ] تحديث Lead interface
- [ ] عرض Confidence Score
- [ ] عرض مصادر البيانات
- [ ] عرض روابط Social Media

---

## 📈 معايير النجاح

| المعيار | الهدف |
|---------|-------|
| دمج 3+ مصادر | يعمل بدون أخطاء |
| Confidence Score | دقيق ومنطقي |
| لا تكرارات | 100% |
| وقت الدمج | < 1 ثانية |
