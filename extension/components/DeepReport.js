/**
 * Deep Report Component
 * مكون التقرير الشامل - يعمل من داخل الإكستنشن
 * يقوم بالبحث في Google Maps + Google Search + Social Media
 * ثم يرسل النتائج للـ API لتنسيقها بالـ AI
 */

class DeepReportComponent {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.isSearching = false;
    this.searchProgress = 0;
    this.searchStatus = '';
    this.result = null;
    this.error = null;
  }

  /**
   * تنفيذ البحث الشامل وإنشاء التقرير
   */
  async generateReport(companyData) {
    if (this.isSearching) return;
    
    this.isSearching = true;
    this.searchProgress = 0;
    this.error = null;
    this.result = null;
    this.render();

    try {
      // المرحلة 1: البحث الشامل من الإكستنشن
      this.updateProgress(10, 'جاري البحث في Google Maps...');
      
      const searchResult = await this.executeDeepSearch(companyData);
      
      if (!searchResult.success) {
        throw new Error(searchResult.error || 'فشل البحث');
      }

      this.updateProgress(70, 'جاري تنسيق التقرير بالذكاء الاصطناعي...');

      // المرحلة 2: تنسيق التقرير بالـ AI
      const formattedReport = await this.formatReportWithAI(searchResult);

      this.updateProgress(100, 'تم!');
      this.result = formattedReport;
      this.isSearching = false;
      this.render();

      return formattedReport;

    } catch (error) {
      console.error('[DeepReport] Error:', error);
      this.error = error.message;
      this.isSearching = false;
      this.render();
      throw error;
    }
  }

  /**
   * تنفيذ البحث الشامل
   */
  async executeDeepSearch(companyData) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'DEEP_SEARCH', companyData },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'No response' });
          }
        }
      );
    });
  }

  /**
   * تنسيق التقرير بالـ AI
   */
  async formatReportWithAI(searchResult) {
    const apiUrl = this.config.apiUrl || 'https://leedz-api.onrender.com';
    const token = await this.getAuthToken();

    const response = await fetch(`${apiUrl}/survey/format-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(searchResult),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * الحصول على التوكن
   */
  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
        resolve(result.authToken || '');
      });
    });
  }

  /**
   * تحديث التقدم
   */
  updateProgress(progress, status) {
    this.searchProgress = progress;
    this.searchStatus = status;
    this.render();
  }

  /**
   * رسم المكون
   */
  render() {
    if (!this.container) return;

    if (this.isSearching) {
      this.container.innerHTML = this.renderSearching();
    } else if (this.error) {
      this.container.innerHTML = this.renderError();
    } else if (this.result) {
      this.container.innerHTML = this.renderResult();
    } else {
      this.container.innerHTML = this.renderInitial();
    }

    this.attachEventListeners();
  }

  renderInitial() {
    return `
      <div class="deep-report-card">
        <div class="deep-report-header">
          <div class="deep-report-icon">📊</div>
          <div>
            <h3>تقرير شامل</h3>
            <p>بحث في Google + السوشيال ميديا + تنسيق AI</p>
          </div>
        </div>
        <button class="deep-report-btn" id="startDeepReport">
          🚀 إنشاء تقرير شامل
        </button>
        <div class="deep-report-info">
          <span>⏱️ ~20 ثانية</span>
          <span>💰 ~$0.01</span>
        </div>
      </div>
    `;
  }

  renderSearching() {
    return `
      <div class="deep-report-card searching">
        <div class="deep-report-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${this.searchProgress}%"></div>
          </div>
          <p class="progress-status">${this.searchStatus}</p>
        </div>
        <div class="search-steps">
          <div class="step ${this.searchProgress >= 10 ? 'active' : ''}">
            <span class="step-icon">🗺️</span>
            <span>Google Maps</span>
          </div>
          <div class="step ${this.searchProgress >= 30 ? 'active' : ''}">
            <span class="step-icon">🔍</span>
            <span>Google Search</span>
          </div>
          <div class="step ${this.searchProgress >= 50 ? 'active' : ''}">
            <span class="step-icon">📱</span>
            <span>السوشيال ميديا</span>
          </div>
          <div class="step ${this.searchProgress >= 70 ? 'active' : ''}">
            <span class="step-icon">🤖</span>
            <span>تنسيق AI</span>
          </div>
        </div>
      </div>
    `;
  }

  renderError() {
    return `
      <div class="deep-report-card error">
        <div class="error-icon">❌</div>
        <h3>حدث خطأ</h3>
        <p>${this.error}</p>
        <button class="deep-report-btn retry" id="retryDeepReport">
          🔄 إعادة المحاولة
        </button>
      </div>
    `;
  }

  renderResult() {
    const r = this.result;
    return `
      <div class="deep-report-result">
        <!-- Header with Score -->
        <div class="result-header">
          <div class="score-circle">
            <span class="score-value">${r.executiveSummary.overallScore}</span>
            <span class="score-label">%</span>
          </div>
          <div class="header-text">
            <h3>${r.executiveSummary.headline}</h3>
            <p>تم التحليل في ${new Date(r.formattedAt).toLocaleTimeString('ar-SA')}</p>
          </div>
        </div>

        <!-- Summary Points -->
        <div class="result-section">
          <h4>📋 ملخص</h4>
          <ul class="summary-points">
            ${r.executiveSummary.points.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>

        <!-- Digital Presence -->
        <div class="result-section">
          <h4>🌐 الحضور الرقمي</h4>
          <div class="presence-breakdown">
            ${r.digitalPresence.breakdown.map(item => `
              <div class="presence-item ${item.status}">
                <span class="presence-category">${item.category}</span>
                <span class="presence-status">${this.getStatusLabel(item.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Social Media -->
        ${r.socialMedia.platforms.length > 0 ? `
          <div class="result-section">
            <h4>📱 السوشيال ميديا</h4>
            <div class="social-platforms">
              ${r.socialMedia.platforms.map(p => `
                <a href="${p.url}" target="_blank" class="social-platform">
                  <span class="platform-name">${p.name}</span>
                  ${p.followers ? `<span class="platform-followers">${p.followers}</span>` : ''}
                </a>
              `).join('')}
            </div>
            ${r.socialMedia.totalFollowers > 0 ? `
              <p class="total-followers">إجمالي المتابعين: ${r.socialMedia.totalFollowers.toLocaleString()}</p>
            ` : ''}
          </div>
        ` : ''}

        <!-- Opportunities -->
        <div class="result-section">
          <h4>💡 الفرص</h4>
          <div class="opportunities">
            ${r.opportunities.map(opp => `
              <div class="opportunity ${opp.priority}">
                <div class="opp-header">
                  <span class="opp-title">${opp.title}</span>
                  <span class="opp-priority">${this.getPriorityLabel(opp.priority)}</span>
                </div>
                <p class="opp-desc">${opp.description}</p>
                ${opp.suggestedService ? `<span class="opp-service">💼 ${opp.suggestedService}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sales Tips -->
        <div class="result-section">
          <h4>🎯 نصائح للمبيعات</h4>
          <ul class="sales-tips">
            ${r.salesTips.map((tip, i) => `<li><span class="tip-num">${i + 1}</span>${tip}</li>`).join('')}
          </ul>
        </div>

        <!-- Contact Info -->
        <div class="result-section contact-info">
          <h4>📞 معلومات الاتصال</h4>
          <div class="contact-grid">
            ${r.contactInfo.phone ? `<a href="tel:${r.contactInfo.phone}" class="contact-item">📱 ${r.contactInfo.phone}</a>` : ''}
            ${r.contactInfo.email ? `<a href="mailto:${r.contactInfo.email}" class="contact-item">📧 ${r.contactInfo.email}</a>` : ''}
            ${r.contactInfo.website ? `<a href="${r.contactInfo.website}" target="_blank" class="contact-item">🌐 الموقع</a>` : ''}
          </div>
          ${r.contactInfo.address ? `<p class="address">📍 ${r.contactInfo.address}</p>` : ''}
        </div>

        <!-- Footer -->
        <div class="result-footer">
          <span class="tokens-used">🪙 ${r.tokensUsed} توكن</span>
          <button class="deep-report-btn small" id="newDeepReport">تقرير جديد</button>
        </div>
      </div>
    `;
  }

  getStatusLabel(status) {
    const labels = {
      excellent: '✅ ممتاز',
      good: '👍 جيد',
      needs_work: '⚠️ يحتاج تحسين',
      missing: '❌ غائب',
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority) {
    const labels = {
      high: '🔴 عالية',
      medium: '🟡 متوسطة',
      low: '🟢 منخفضة',
    };
    return labels[priority] || priority;
  }

  attachEventListeners() {
    const startBtn = this.container.querySelector('#startDeepReport');
    const retryBtn = this.container.querySelector('#retryDeepReport');
    const newBtn = this.container.querySelector('#newDeepReport');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.config.companyData) {
          this.generateReport(this.config.companyData);
        }
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (this.config.companyData) {
          this.generateReport(this.config.companyData);
        }
      });
    }

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        this.result = null;
        this.error = null;
        this.render();
      });
    }
  }
}

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeepReportComponent;
}
