import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, Save, Send, Image, Video, X, Loader2,
  Instagram, Facebook, Twitter, Linkedin, Clock, AlertCircle,
  Youtube, AtSign, Music2, Ghost, CheckCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getClients, Client, SocialPlatform, PLATFORM_CONFIG, ALL_PLATFORMS } from '../lib/clients-api';
import { 
  getPost, createPost, updatePost, upsertVariants, schedulePost,
  Post, CreateVariantDto, POST_STATUS_CONFIG
} from '../lib/posts-api';
import { uploadMedia, MediaAsset } from '../lib/media-api';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  X: Twitter,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  LINKEDIN: Linkedin,
  YOUTUBE: Youtube,
  THREADS: AtSign,
  TIKTOK: Music2,
  SNAPCHAT: Ghost,
};

const PostEditorPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(postId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [title, setTitle] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [variantContents, setVariantContents] = useState<Record<SocialPlatform, { 
    caption: string; 
    hashtags: string; 
    mediaAssets: MediaAsset[];
    // YouTube specific fields
    videoTitle?: string;
    madeForKids?: boolean;
    visibility?: 'public' | 'unlisted' | 'private';
  }>>({} as any);
  const [scheduledAt, setScheduledAt] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [activeVariantTab, setActiveVariantTab] = useState<SocialPlatform | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [postId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load clients
      const clientsData = await getClients();
      setClients(clientsData);

      // Load post if editing
      if (isEdit && postId) {
        const postData = await getPost(postId);
        setPost(postData);
        setSelectedClient(postData.client.id);
        setTitle(postData.title || '');
        setScheduledAt(postData.scheduledAt ? postData.scheduledAt.slice(0, 16) : '');
        
        // Load variants
        const platforms = postData.variants?.map(v => v.platform) || [];
        setSelectedPlatforms(platforms);
        
        const contents: Record<SocialPlatform, { caption: string; hashtags: string; mediaAssets: MediaAsset[] }> = {} as any;
        postData.variants?.forEach(v => {
          contents[v.platform] = {
            caption: v.caption || '',
            hashtags: v.hashtags || '',
            mediaAssets: [], // TODO: Load existing media assets
          };
        });
        setVariantContents(contents);
        if (platforms.length > 0) {
          setActiveVariantTab(platforms[0]);
        }
      } else {
        // Check for date from URL params
        const dateParam = searchParams.get('date');
        if (dateParam) {
          setScheduledAt(`${dateParam}T10:00`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: SocialPlatform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        const newPlatforms = prev.filter(p => p !== platformId);
        if (activeVariantTab === platformId) {
          setActiveVariantTab(newPlatforms[0] || null);
        }
        return newPlatforms;
      } else {
        if (!activeVariantTab) {
          setActiveVariantTab(platformId);
        }
        // Initialize content for new platform
        if (!variantContents[platformId]) {
          const initialContent: any = { caption: '', hashtags: '', mediaAssets: [] };
          
          // Add YouTube-specific fields
          if (platformId === 'YOUTUBE') {
            initialContent.videoTitle = '';
            initialContent.madeForKids = false;
            initialContent.visibility = 'public';
          }
          
          setVariantContents(prev => ({
            ...prev,
            [platformId]: initialContent,
          }));
        }
        return [...prev, platformId];
      }
    });
  };

  const updateVariantContent = (platform: SocialPlatform, field: string, value: any) => {
    setVariantContents(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const handleMediaUpload = async (file: File) => {
    if (!activeVariantTab) return;
    
    setUploadingMedia(true);
    setError(null);
    
    try {
      const asset = await uploadMedia(file);
      
      setVariantContents(prev => ({
        ...prev,
        [activeVariantTab]: {
          ...prev[activeVariantTab],
          mediaAssets: [...(prev[activeVariantTab]?.mediaAssets || []), asset],
        },
      }));
    } catch (err: any) {
      setError(err.message || 'فشل رفع الملف');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file);
    }
    e.target.value = ''; // Reset input
  };

  const removeMedia = (platform: SocialPlatform, assetId: string) => {
    setVariantContents(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        mediaAssets: prev[platform]?.mediaAssets?.filter(a => a.id !== assetId) || [],
      },
    }));
  };

  const handleSaveDraft = async (shouldSchedule: boolean = false) => {
    if (!selectedClient) {
      setError('يرجى اختيار العميل');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('يرجى اختيار منصة واحدة على الأقل');
      return;
    }

    if (shouldSchedule && !scheduledAt) {
      setError('يرجى تحديد وقت الجدولة');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let savedPost: Post;
      const scheduledAtISO = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;

      if (isEdit && postId) {
        savedPost = await updatePost(postId, {
          title: title || undefined,
          scheduledAt: scheduledAtISO,
        });
        
        // Update variants
        const variants: CreateVariantDto[] = selectedPlatforms.map(platform => ({
          platform,
          caption: variantContents[platform]?.caption || '',
          hashtags: variantContents[platform]?.hashtags || '',
          mediaAssetIds: variantContents[platform]?.mediaAssets?.map(a => a.id) || [],
        }));
        await upsertVariants(postId, variants);
        
        // Schedule if requested
        if (shouldSchedule) {
          await schedulePost(postId, scheduledAtISO);
        }
      } else {
        const variants: CreateVariantDto[] = selectedPlatforms.map(platform => ({
          platform,
          caption: variantContents[platform]?.caption || '',
          hashtags: variantContents[platform]?.hashtags || '',
          mediaAssetIds: variantContents[platform]?.mediaAssets?.map(a => a.id) || [],
        }));

        savedPost = await createPost({
          clientId: selectedClient,
          title: title || undefined,
          scheduledAt: scheduledAtISO,
          variants,
        });
        
        // Schedule the new post if requested
        if (shouldSchedule && savedPost.id) {
          await schedulePost(savedPost.id, scheduledAtISO);
        }
      }

      navigate('/app/posts');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ المنشور');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={() => navigate('/app/posts')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 font-bold"
      >
        <ArrowRight size={20} />
        العودة للتقويم
      </button>

      <PageHeader 
        title={isEdit ? 'تعديل المنشور' : 'منشور جديد'}
        subtitle={isEdit ? 'تحديث محتوى المنشور' : 'إنشاء منشور جديد للنشر'}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">اختر العميل</h3>
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">لا يوجد عملاء. أضف عميل أولاً.</p>
                <button 
                  onClick={() => navigate('/app/clients/new')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  إضافة عميل
                </button>
              </div>
            ) : (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">اختر العميل...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Platform Selection */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">المنصات</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ALL_PLATFORMS.map(platformId => {
                const config = PLATFORM_CONFIG[platformId];
                const Icon = PLATFORM_ICONS[platformId] || Twitter;
                const isSelected = selectedPlatforms.includes(platformId);
                return (
                  <button
                    key={platformId}
                    onClick={() => togglePlatform(platformId)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                      {config.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variant Editor - Tabs per platform */}
          {selectedPlatforms.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-black text-gray-900 mb-4">محتوى المنصات</h3>
              
              {/* Platform Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {selectedPlatforms.map(platform => {
                  const config = PLATFORM_CONFIG[platform];
                  const Icon = PLATFORM_ICONS[platform] || Twitter;
                  return (
                    <button
                      key={platform}
                      onClick={() => setActiveVariantTab(platform)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
                        activeVariantTab === platform
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={16} />
                      {config.name}
                    </button>
                  );
                })}
              </div>

              {/* Active Variant Content */}
              {activeVariantTab && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      المحتوى
                    </label>
                    <textarea
                      value={variantContents[activeVariantTab]?.caption || ''}
                      onChange={(e) => updateVariantContent(activeVariantTab, 'caption', e.target.value)}
                      placeholder={`اكتب محتوى ${PLATFORM_CONFIG[activeVariantTab].name}...`}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <span className="text-sm text-gray-400">
                        {(variantContents[activeVariantTab]?.caption || '').length} حرف
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      الهاشتاقات
                    </label>
                    <input
                      type="text"
                      value={variantContents[activeVariantTab]?.hashtags || ''}
                      onChange={(e) => updateVariantContent(activeVariantTab, 'hashtags', e.target.value)}
                      placeholder="#هاشتاق1 #هاشتاق2"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  {/* YouTube Specific Fields */}
                  {activeVariantTab === 'YOUTUBE' && (
                    <div className="space-y-4 p-4 bg-red-50 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-700 flex items-center gap-2">
                        <Youtube size={18} />
                        إعدادات YouTube
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          عنوان الفيديو <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={variantContents[activeVariantTab]?.videoTitle || ''}
                          onChange={(e) => updateVariantContent(activeVariantTab, 'videoTitle', e.target.value)}
                          placeholder="عنوان الفيديو (100 حرف كحد أقصى)"
                          maxLength={100}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                        />
                        <div className="flex justify-end mt-1">
                          <span className="text-xs text-gray-400">
                            {(variantContents[activeVariantTab]?.videoTitle || '').length}/100
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          هل المحتوى مناسب للأطفال؟ <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="madeForKids"
                              checked={variantContents[activeVariantTab]?.madeForKids === false}
                              onChange={() => updateVariantContent(activeVariantTab, 'madeForKids', false)}
                              className="w-4 h-4 text-red-600"
                            />
                            <span className="text-sm">لا، ليس للأطفال</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="madeForKids"
                              checked={variantContents[activeVariantTab]?.madeForKids === true}
                              onChange={() => updateVariantContent(activeVariantTab, 'madeForKids', true)}
                              className="w-4 h-4 text-red-600"
                            />
                            <span className="text-sm">نعم، للأطفال</span>
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          الخصوصية
                        </label>
                        <select
                          value={variantContents[activeVariantTab]?.visibility || 'public'}
                          onChange={(e) => updateVariantContent(activeVariantTab, 'visibility', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                        >
                          <option value="public">عام - يمكن للجميع مشاهدته</option>
                          <option value="unlisted">غير مدرج - فقط من لديه الرابط</option>
                          <option value="private">خاص - أنت فقط</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Media Preview */}
                  {variantContents[activeVariantTab]?.mediaAssets?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {variantContents[activeVariantTab].mediaAssets.map((asset) => (
                        <div key={asset.id} className="relative group">
                          {asset.type === 'VIDEO' ? (
                            <video 
                              src={asset.url} 
                              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <img 
                              src={asset.url} 
                              alt="Media" 
                              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            />
                          )}
                          <button
                            onClick={() => removeMedia(activeVariantTab, asset.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Media Upload Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="إضافة صورة"
                    >
                      <Image size={20} className="text-blue-500" />
                    </button>
                    <button 
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="p-2 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                      title="إضافة فيديو"
                    >
                      <Video size={20} className="text-purple-500" />
                    </button>
                    {uploadingMedia ? (
                      <span className="text-xs text-blue-500 mr-auto flex items-center gap-1">
                        <Loader2 size={14} className="animate-spin" />
                        جاري الرفع...
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 mr-auto">
                        {variantContents[activeVariantTab]?.mediaAssets?.length 
                          ? `${variantContents[activeVariantTab].mediaAssets.length} ملف مرفق`
                          : 'إضافة صور أو فيديو'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">الجدولة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Clock size={16} className="inline ml-1" />
                  موعد النشر
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
              <AlertCircle size={20} />
              <span className="font-bold text-sm">{error}</span>
            </div>
          )}

          {/* Post Status (if editing) */}
          {isEdit && post && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-black text-gray-900 mb-4">الحالة</h3>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${POST_STATUS_CONFIG[post.status].color}`}>
                {post.status === 'APPROVED' && <CheckCircle size={18} />}
                {POST_STATUS_CONFIG[post.status].label}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 space-y-3">
            {/* زر الجدولة الرئيسي - يظهر دائماً إذا كان هناك وقت جدولة */}
            {scheduledAt && (
              <button
                onClick={() => handleSaveDraft(true)}
                disabled={saving || !selectedClient || selectedPlatforms.length === 0}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock size={20} />
                {saving ? 'جاري الجدولة...' : 'جدولة ونشر'}
              </button>
            )}

            <button
              onClick={() => handleSaveDraft(false)}
              disabled={saving || !selectedClient}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {saving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </button>
          </div>

          {/* Preview */}
          {activeVariantTab && variantContents[activeVariantTab]?.caption && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-black text-gray-900 mb-4">معاينة</h3>
              <div className="bg-gray-50 rounded-2xl p-4 min-h-[100px]">
                <p className="text-gray-700 whitespace-pre-wrap text-sm">
                  {variantContents[activeVariantTab].caption}
                </p>
                {variantContents[activeVariantTab].hashtags && (
                  <p className="text-blue-600 text-sm mt-2">
                    {variantContents[activeVariantTab].hashtags}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostEditorPage;
