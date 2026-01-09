/**
 * Leedz Extension - Smart Matcher
 * خوارزمية التطابق الذكية - 90%+ للنتائج المقبولة
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

class SmartMatcher {
  // الحد الأدنى للقبول
  static THRESHOLD = 90;
  
  // أوزان عوامل التطابق
  static WEIGHTS = {
    name: 0.50,      // تطابق الاسم (50%)
    city: 0.25,      // تطابق المدينة (25%)
    activity: 0.15,  // تطابق النشاط (15%)
    contact: 0.10,   // وجود معلومات الاتصال (10%)
  };

  /**
   * حساب درجة التطابق الكلية
   * @param {Object} searchQuery - استعلام البحث
   * @param {Object} result - النتيجة المراد تقييمها
   * @returns {Object} - درجة التطابق والتفاصيل
   */
  static calculateMatch(searchQuery, result) {
    const factors = [];
    let totalScore = 0;
    let totalWeight = 0;

    // 1. تطابق الاسم (إجباري)
    const nameScore = this.calculateNameMatch(searchQuery.name || searchQuery.query, result.name);
    factors.push({ factor: 'name', score: nameScore, weight: this.WEIGHTS.name });
    totalScore += nameScore * this.WEIGHTS.name;
    totalWeight += this.WEIGHTS.name;

    // 2. تطابق المدينة (إن وُجدت)
    if (searchQuery.city && result.address) {
      const cityScore = this.calculateCityMatch(searchQuery.city, result.address);
      factors.push({ factor: 'city', score: cityScore, weight: this.WEIGHTS.city });
      totalScore += cityScore * this.WEIGHTS.city;
      totalWeight += this.WEIGHTS.city;
    }

    // 3. تطابق النشاط/الفئة (إن وُجد)
    if (searchQuery.activity && result.category) {
      const activityScore = this.calculateActivityMatch(searchQuery.activity, result.category);
      factors.push({ factor: 'activity', score: activityScore, weight: this.WEIGHTS.activity });
      totalScore += activityScore * this.WEIGHTS.activity;
      totalWeight += this.WEIGHTS.activity;
    }

    // 4. وجود معلومات الاتصال (bonus)
    const contactScore = this.calculateContactScore(result);
    factors.push({ factor: 'contact', score: contactScore, weight: this.WEIGHTS.contact });
    totalScore += contactScore * this.WEIGHTS.contact;
    totalWeight += this.WEIGHTS.contact;

    // حساب النتيجة النهائية (تطبيع حسب الأوزان المستخدمة)
    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) : 0;

    return {
      totalScore: finalScore,
      isMatch: finalScore >= this.THRESHOLD,
      threshold: this.THRESHOLD,
      factors,
      recommendation: this.getRecommendation(finalScore),
    };
  }

  /**
   * حساب تطابق الاسم
   * @param {string} query - اسم البحث
   * @param {string} name - اسم النتيجة
   * @returns {number} - درجة التطابق (0-100)
   */
  static calculateNameMatch(query, name) {
    if (!query || !name) return 0;

    const q = this.normalize(query);
    const n = this.normalize(name);

    // تطابق تام
    if (q === n) return 100;

    // يحتوي على الاسم كاملاً
    if (n === q || n.includes(q)) return 95;
    if (q.includes(n) && n.length > 3) return 90;

    // حساب Levenshtein distance
    const distance = this.levenshtein(q, n);
    const maxLen = Math.max(q.length, n.length);
    const levenshteinScore = Math.round(((maxLen - distance) / maxLen) * 100);

    // تطابق الكلمات
    const wordMatchScore = this.calculateWordMatch(q, n);

    // تطابق البداية
    const prefixScore = this.calculatePrefixMatch(q, n);

    // أخذ أفضل نتيجة
    return Math.max(levenshteinScore, wordMatchScore, prefixScore);
  }

  /**
   * حساب تطابق المدينة
   * @param {string} city - المدينة المطلوبة
   * @param {string} address - العنوان
   * @returns {number} - درجة التطابق (0-100)
   */
  static calculateCityMatch(city, address) {
    if (!city || !address) return 50; // neutral score

    const normalizedCity = this.normalize(city);
    const normalizedAddress = this.normalize(address);

    // تطابق تام
    if (normalizedAddress.includes(normalizedCity)) return 100;

    // تطابق جزئي
    const cityWords = normalizedCity.split(' ');
    let matchedWords = 0;
    for (const word of cityWords) {
      if (word.length > 2 && normalizedAddress.includes(word)) {
        matchedWords++;
      }
    }

    if (matchedWords > 0) {
      return Math.round((matchedWords / cityWords.length) * 80) + 20;
    }

    return 30; // لا تطابق
  }

  /**
   * حساب تطابق النشاط/الفئة
   * @param {string} activity - النشاط المطلوب
   * @param {string} category - فئة النتيجة
   * @returns {number} - درجة التطابق (0-100)
   */
  static calculateActivityMatch(activity, category) {
    if (!activity || !category) return 50;

    const normalizedActivity = this.normalize(activity);
    const normalizedCategory = this.normalize(category);

    // تطابق تام
    if (normalizedCategory.includes(normalizedActivity)) return 100;
    if (normalizedActivity.includes(normalizedCategory)) return 90;

    // تطابق الكلمات
    return this.calculateWordMatch(normalizedActivity, normalizedCategory);
  }

  /**
   * حساب درجة معلومات الاتصال
   * @param {Object} result - النتيجة
   * @returns {number} - درجة (0-100)
   */
  static calculateContactScore(result) {
    let score = 0;
    
    if (result.phone) score += 40;
    if (result.website) score += 30;
    if (result.email) score += 20;
    if (result.address) score += 10;

    return Math.min(score, 100);
  }

  /**
   * تطبيع النص للمقارنة
   * @param {string} str - النص
   * @returns {string} - النص المطبّع
   */
  static normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      // إزالة التشكيل العربي
      .replace(/[\u064B-\u065F]/g, '')
      // إزالة الرموز الخاصة
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      // تطبيع المسافات
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * حساب Levenshtein distance
   * @param {string} a - النص الأول
   * @param {string} b - النص الثاني
   * @returns {number} - المسافة
   */
  static levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // استبدال
            matrix[i][j - 1] + 1,     // إدراج
            matrix[i - 1][j] + 1      // حذف
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * حساب تطابق الكلمات
   * @param {string} query - استعلام البحث
   * @param {string} name - الاسم
   * @returns {number} - درجة التطابق (0-100)
   */
  static calculateWordMatch(query, name) {
    const queryWords = query.split(' ').filter(w => w.length > 1);
    const nameWords = name.split(' ').filter(w => w.length > 1);

    if (queryWords.length === 0) return 0;

    let matchedWords = 0;
    let partialMatches = 0;

    for (const qw of queryWords) {
      let bestMatch = 0;
      for (const nw of nameWords) {
        if (nw === qw) {
          bestMatch = 1;
          break;
        } else if (nw.includes(qw) || qw.includes(nw)) {
          bestMatch = Math.max(bestMatch, 0.8);
        } else {
          // Levenshtein للكلمات القصيرة
          const dist = this.levenshtein(qw, nw);
          const maxLen = Math.max(qw.length, nw.length);
          const similarity = (maxLen - dist) / maxLen;
          if (similarity > 0.7) {
            bestMatch = Math.max(bestMatch, similarity * 0.7);
          }
        }
      }
      
      if (bestMatch === 1) {
        matchedWords++;
      } else if (bestMatch > 0) {
        partialMatches += bestMatch;
      }
    }

    const totalMatches = matchedWords + partialMatches;
    return Math.round((totalMatches / queryWords.length) * 100);
  }

  /**
   * حساب تطابق البداية
   * @param {string} query - استعلام البحث
   * @param {string} name - الاسم
   * @returns {number} - درجة التطابق (0-100)
   */
  static calculatePrefixMatch(query, name) {
    const minLen = Math.min(query.length, name.length);
    let matchLen = 0;

    for (let i = 0; i < minLen; i++) {
      if (query[i] === name[i]) {
        matchLen++;
      } else {
        break;
      }
    }

    if (matchLen === 0) return 0;
    
    // نسبة التطابق من البداية
    const prefixRatio = matchLen / query.length;
    return Math.round(prefixRatio * 85); // max 85 for prefix match
  }

  /**
   * الحصول على توصية بناءً على الدرجة
   * @param {number} score - الدرجة
   * @returns {string} - التوصية
   */
  static getRecommendation(score) {
    if (score >= 95) return 'EXACT_MATCH';
    if (score >= 90) return 'HIGH_CONFIDENCE';
    if (score >= 80) return 'POSSIBLE_MATCH';
    if (score >= 70) return 'LOW_CONFIDENCE';
    return 'NO_MATCH';
  }

  /**
   * فلترة النتائج حسب الحد الأدنى
   * @param {Object} searchQuery - استعلام البحث
   * @param {Array} results - النتائج
   * @param {number} threshold - الحد الأدنى (افتراضي 90)
   * @returns {Array} - النتائج المفلترة مع درجات التطابق
   */
  static filterResults(searchQuery, results, threshold = this.THRESHOLD) {
    const scoredResults = results.map(result => {
      const match = this.calculateMatch(searchQuery, result);
      return {
        ...result,
        matchScore: match.totalScore,
        matchDetails: match,
      };
    });

    // فلترة وترتيب
    return scoredResults
      .filter(r => r.matchScore >= threshold)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * البحث عن أفضل تطابق
   * @param {Object} searchQuery - استعلام البحث
   * @param {Array} results - النتائج
   * @returns {Object|null} - أفضل نتيجة أو null
   */
  static findBestMatch(searchQuery, results) {
    if (!results || results.length === 0) return null;

    const filtered = this.filterResults(searchQuery, results);
    
    if (filtered.length === 0) {
      console.log('[SmartMatcher] No results met the threshold of', this.THRESHOLD);
      return null;
    }

    return filtered[0];
  }

  /**
   * التحقق من تطابق نتيجة واحدة
   * @param {Object} searchQuery - استعلام البحث
   * @param {Object} result - النتيجة
   * @returns {boolean} - هل تطابق؟
   */
  static isMatch(searchQuery, result) {
    const match = this.calculateMatch(searchQuery, result);
    return match.isMatch;
  }
}

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SmartMatcher };
}
