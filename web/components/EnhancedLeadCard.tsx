import React, { useState } from 'react';
import {
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  Users,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Building2,
  Calendar,
  MessageSquare,
  Link2,
  Smartphone,
  Hash,
  Eye,
  Heart,
  Video,
  Image as ImageIcon,
} from 'lucide-react';

interface SocialProfile {
  platform: string;
  url?: string;
  followers?: string | number;
  following?: string | number;
  posts?: string | number;
  videos?: string | number;
  tweets?: string | number;
  likes?: string | number;
  isVerified?: boolean;
  isPrivate?: boolean;
  bio?: string;
  description?: string;
  about?: string;
  username?: string;
  displayName?: string;
  lastPostDate?: string;
  lastTweetDate?: string;
  lastVideoDate?: string;
  joinDate?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  recentPostsCount?: number;
  recentTweetsCount?: number;
  recentVideosCount?: number;
  responseTime?: string;
  workingHours?: string;
}

interface LeadMetadata {
  rating?: string;
  reviews?: string;
  reviewCount?: number;
  type?: string;
  sourceUrl?: string;
  googleMapsUrl?: string;
  socialLinks?: Record<string, string>;
  socialProfiles?: Record<string, SocialProfile>;
  allEmails?: string[];
  allPhones?: string[];
  description?: string;
  dataCompleteness?: number;
  strongestPlatform?: string;
  totalFollowers?: number;
  latestSocialActivity?: string;
  totalSocialPosts?: number;
  responseTime?: string;
  workingHours?: string;
  services?: string[];
  externalLinks?: string[];
  dataSources?: {
    googleMaps?: boolean;
    googleSearch?: boolean;
    website?: boolean;
    websitePages?: number;
    socialMedia?: boolean;
    socialPlatforms?: string[];
  };
}

interface EnhancedLeadCardProps {
  lead: {
    id: string;
    companyName: string;
    industry?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    metadata?: LeadMetadata;
  };
}

const EnhancedLeadCard: React.FC<EnhancedLeadCardProps> = ({ lead }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['contact', 'social']);
  const metadata = lead.metadata || {};

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const platformIcons: Record<string, string> = {
    instagram: '📸',
    twitter: '🐦',
    facebook: '📘',
    linkedin: '💼',
    tiktok: '🎵',
    youtube: '📺',
    snapchat: '👻',
    whatsapp: '💬',
  };

  const platformNames: Record<string, string> = {
    instagram: 'انستقرام',
    twitter: 'تويتر/X',
    facebook: 'فيسبوك',
    linkedin: 'لينكدإن',
    tiktok: 'تيك توك',
    youtube: 'يوتيوب',
    snapchat: 'سناب شات',
    whatsapp: 'واتساب',
  };

  const formatNumber = (num: string | number | undefined): string => {
    if (!num) return '0';
    const n = typeof num === 'string' ? parseInt(num.replace(/[^\d]/g, '')) : num;
    if (isNaN(n)) return String(num);
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString('ar-SA');
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'غير محدد';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'اليوم';
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
      if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
      return `منذ ${Math.floor(diffDays / 365)} سنوات`;
    } catch {
      return dateStr;
    }
  };

  const getActivityStatus = (dateStr: string | undefined): { label: string; color: string } => {
    if (!dateStr) return { label: 'غير محدد', color: 'gray' };
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) return { label: 'نشط جداً', color: 'green' };
      if (diffDays <= 30) return { label: 'نشط', color: 'blue' };
      if (diffDays <= 90) return { label: 'متوسط النشاط', color: 'yellow' };
      return { label: 'غير نشط', color: 'red' };
    } catch {
      return { label: 'غير محدد', color: 'gray' };
    }
  };

  const socialProfiles = metadata.socialProfiles || {};
  const socialLinks = metadata.socialLinks || {};
  const activityStatus = getActivityStatus(metadata.latestSocialActivity);

  return (
    <div className="space-y-6">
      {/* ========== ملخص سريع ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* اكتمال البيانات */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
          <div className="text-xs text-gray-500 font-bold mb-1">اكتمال البيانات</div>
          <div className="text-3xl font-black text-purple-600">{metadata.dataCompleteness || 0}%</div>
        </div>

        {/* إجمالي المتابعين */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
          <div className="text-xs text-gray-500 font-bold mb-1">إجمالي المتابعين</div>
          <div className="text-3xl font-black text-blue-600">{formatNumber(metadata.totalFollowers)}</div>
        </div>

        {/* عدد المنصات */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
          <div className="text-xs text-gray-500 font-bold mb-1">منصات التواصل</div>
          <div className="text-3xl font-black text-green-600">{Object.keys(socialProfiles).length}</div>
        </div>

        {/* إجمالي المنشورات */}
        <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-100">
          <div className="text-xs text-gray-500 font-bold mb-1">إجمالي المنشورات</div>
          <div className="text-3xl font-black text-yellow-600">{formatNumber(metadata.totalSocialPosts)}</div>
        </div>

        {/* التقييم */}
        {metadata.rating && (
          <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-100">
            <div className="text-xs text-gray-500 font-bold mb-1">التقييم</div>
            <div className="flex items-center gap-2">
              <Star size={20} className="text-amber-500 fill-amber-500" />
              <span className="text-3xl font-black text-amber-600">{metadata.rating}</span>
            </div>
          </div>
        )}

        {/* حالة النشاط */}
        <div className={`p-4 rounded-2xl border ${
          activityStatus.color === 'green' ? 'bg-green-50 border-green-100' :
          activityStatus.color === 'blue' ? 'bg-blue-50 border-blue-100' :
          activityStatus.color === 'yellow' ? 'bg-yellow-50 border-yellow-100' :
          activityStatus.color === 'red' ? 'bg-red-50 border-red-100' :
          'bg-gray-50 border-gray-100'
        }`}>
          <div className="text-xs text-gray-500 font-bold mb-1">حالة النشاط</div>
          <div className={`text-lg font-black ${
            activityStatus.color === 'green' ? 'text-green-600' :
            activityStatus.color === 'blue' ? 'text-blue-600' :
            activityStatus.color === 'yellow' ? 'text-yellow-600' :
            activityStatus.color === 'red' ? 'text-red-600' :
            'text-gray-600'
          }`}>{activityStatus.label}</div>
        </div>
      </div>

      {/* ========== معلومات الاتصال الموسعة ========== */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('contact')}
          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Phone size={20} className="text-blue-600" />
            <span className="font-bold text-gray-900">معلومات الاتصال</span>
            {(metadata.allEmails?.length || 0) + (metadata.allPhones?.length || 0) > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {(metadata.allEmails?.length || 0) + (metadata.allPhones?.length || 0)} عنصر
              </span>
            )}
          </div>
          {expandedSections.includes('contact') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSections.includes('contact') && (
          <div className="p-4 space-y-4">
            {/* الإيميلات */}
            {metadata.allEmails && metadata.allEmails.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Mail size={14} /> البريد الإلكتروني ({metadata.allEmails.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {metadata.allEmails.slice(0, 5).map((email, i) => (
                    <a
                      key={i}
                      href={`mailto:${email}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                        i === 0 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {i === 0 && <CheckCircle2 size={14} />}
                      {email}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* الهواتف */}
            {metadata.allPhones && metadata.allPhones.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Phone size={14} /> أرقام الهاتف ({metadata.allPhones.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {metadata.allPhones.slice(0, 5).map((phone, i) => (
                    <a
                      key={i}
                      href={`tel:${phone}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                        i === 0 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {i === 0 && <CheckCircle2 size={14} />}
                      {phone}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* الموقع والعنوان */}
            <div className="grid md:grid-cols-2 gap-4">
              {lead.website && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Globe size={18} className="text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 font-bold">الموقع الإلكتروني</div>
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline truncate block">
                      {lead.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={18} className="text-red-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 font-bold">العنوان</div>
                    <div className="text-sm font-bold text-gray-700 truncate">{lead.address}</div>
                  </div>
                </div>
              )}
            </div>

            {/* ساعات العمل */}
            {metadata.workingHours && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock size={18} className="text-purple-600" />
                <div>
                  <div className="text-xs text-gray-500 font-bold">ساعات العمل</div>
                  <div className="text-sm font-bold text-gray-700">{metadata.workingHours}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== منصات التواصل الاجتماعي ========== */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('social')}
          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users size={20} className="text-purple-600" />
            <span className="font-bold text-gray-900">منصات التواصل الاجتماعي</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
              {Object.keys(socialProfiles).length} منصة
            </span>
          </div>
          {expandedSections.includes('social') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSections.includes('social') && (
          <div className="p-4">
            {Object.keys(socialProfiles).length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(socialProfiles).map(([platform, profileData]) => {
                  if (!profileData) return null;
                  const data = profileData as SocialProfile;
                  
                  const followers = data.followers || data.likes;
                  const posts = data.posts || data.videos || data.tweets || data.recentPostsCount || data.recentTweetsCount || data.recentVideosCount;
                  const lastActivity = data.lastPostDate || data.lastTweetDate || data.lastVideoDate;
                  const url = data.url || socialLinks[platform];

                  return (
                    <div key={platform} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{platformIcons[platform] || '🌐'}</span>
                          <span className="font-bold text-gray-900">{platformNames[platform] || platform}</span>
                        </div>
                        {data.isVerified && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            موثق
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {(data.username || data.displayName) && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">الحساب:</span>
                            <span className="font-bold text-gray-700">@{data.username || data.displayName}</span>
                          </div>
                        )}
                        {followers && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">المتابعين:</span>
                            <span className="font-bold text-purple-600">{typeof followers === 'number' ? formatNumber(followers) : followers}</span>
                          </div>
                        )}
                        {data.following && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">يتابع:</span>
                            <span className="text-gray-700">{data.following}</span>
                          </div>
                        )}
                        {posts && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">المنشورات:</span>
                            <span className="text-gray-700">{posts}</span>
                          </div>
                        )}
                        {lastActivity && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">آخر نشاط:</span>
                            <span className="text-gray-700">{formatDate(lastActivity)}</span>
                          </div>
                        )}
                        {data.isPrivate && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">الخصوصية:</span>
                            <span className="text-yellow-600 font-bold">حساب خاص</span>
                          </div>
                        )}
                      </div>

                      {(data.bio || data.description || data.about) && (
                        <p className="mt-3 text-xs text-gray-500 line-clamp-2 border-t pt-2">
                          {(data.bio || data.description || data.about)?.substring(0, 100)}...
                        </p>
                      )}

                      {/* معلومات إضافية من السوشيال */}
                      {(data.email || data.phone || data.website) && (
                        <div className="mt-3 pt-2 border-t space-y-1">
                          {data.email && (
                            <div className="flex items-center gap-2 text-xs">
                              <Mail size={12} className="text-blue-600" />
                              <span className="text-blue-600 font-bold">{data.email}</span>
                            </div>
                          )}
                          {data.phone && (
                            <div className="flex items-center gap-2 text-xs">
                              <Phone size={12} className="text-green-600" />
                              <span className="text-green-600 font-bold">{data.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-600 hover:underline p-2 bg-blue-50 rounded-lg"
                        >
                          <ExternalLink size={12} />
                          زيارة الحساب
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات منصات تواصل</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== مصادر البيانات ========== */}
      {metadata.dataSources && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => toggleSection('sources')}
            className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Link2 size={20} className="text-green-600" />
              <span className="font-bold text-gray-900">مصادر البيانات</span>
            </div>
            {expandedSections.includes('sources') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {expandedSections.includes('sources') && (
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {metadata.dataSources.googleMaps && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold">
                    <MapPin size={16} />
                    خرائط جوجل
                  </div>
                )}
                {metadata.dataSources.googleSearch && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold">
                    <Globe size={16} />
                    بحث جوجل
                  </div>
                )}
                {metadata.dataSources.website && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold">
                    <Building2 size={16} />
                    الموقع الإلكتروني ({metadata.dataSources.websitePages || 0} صفحة)
                  </div>
                )}
                {metadata.dataSources.socialMedia && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold">
                    <Users size={16} />
                    السوشيال ميديا ({metadata.dataSources.socialPlatforms?.length || 0} منصة)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== الوصف والخدمات ========== */}
      {(metadata.description || (metadata.services && metadata.services.length > 0)) && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => toggleSection('description')}
            className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-indigo-600" />
              <span className="font-bold text-gray-900">عن الشركة</span>
            </div>
            {expandedSections.includes('description') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {expandedSections.includes('description') && (
            <div className="p-4 space-y-4">
              {metadata.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">الوصف</h4>
                  <p className="text-gray-700 leading-relaxed">{metadata.description}</p>
                </div>
              )}
              
              {metadata.services && metadata.services.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">الخدمات</h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.services.map((service, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedLeadCard;
