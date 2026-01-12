# ════════════════════════════════════════════════════════════════════════════
# Test Publishing Flow - اختبار شامل لعملية النشر
# ════════════════════════════════════════════════════════════════════════════

$API_URL = "http://localhost:3001"
$EMAIL = "test@postzzz.com"
$PASSWORD = "Test@123"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🧪 اختبار عملية النشر" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# 1. Test API Health
Write-Host "1️⃣ فحص صحة الـ API..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    if ($health.ok) {
        Write-Host "   ✅ API يعمل بشكل صحيح" -ForegroundColor Green
    } else {
        Write-Host "   ❌ API لا يعمل" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ فشل الاتصال بالـ API: $_" -ForegroundColor Red
    exit 1
}

# 2. Login
Write-Host "`n2️⃣ تسجيل الدخول..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $EMAIL
        password = $PASSWORD
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "   ✅ تم تسجيل الدخول بنجاح" -ForegroundColor Green
        Write-Host "   📧 المستخدم: $($loginResponse.user.email)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ فشل تسجيل الدخول" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ خطأ في تسجيل الدخول: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 3. Get User Profile
Write-Host "`n3️⃣ جلب الملف الشخصي..." -ForegroundColor Yellow
try {
    $profile = Invoke-RestMethod -Uri "$API_URL/users/profile" -Method Get -Headers $headers
    Write-Host "   ✅ تم جلب الملف الشخصي" -ForegroundColor Green
    Write-Host "   📱 رقم الواتساب: $($profile.data.whatsappPhone ?? 'غير محدد')" -ForegroundColor Gray
    Write-Host "   🔔 إشعارات النشر: $($profile.data.notifyOnPublish)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ خطأ في جلب الملف الشخصي: $_" -ForegroundColor Red
}

# 4. Update Profile with WhatsApp
Write-Host "`n4️⃣ تحديث رقم الواتساب..." -ForegroundColor Yellow
try {
    $updateBody = @{
        whatsappPhone = "0512345678"
        notifyOnPublish = $true
    } | ConvertTo-Json
    
    $updateResponse = Invoke-RestMethod -Uri "$API_URL/users/profile" -Method Patch -Body $updateBody -Headers $headers
    Write-Host "   ✅ تم تحديث الملف الشخصي" -ForegroundColor Green
    Write-Host "   📱 رقم الواتساب الجديد: $($updateResponse.data.whatsappPhone)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ خطأ في تحديث الملف الشخصي: $_" -ForegroundColor Red
}

# 5. Get Publishing Jobs
Write-Host "`n5️⃣ جلب مهام النشر..." -ForegroundColor Yellow
try {
    $jobs = Invoke-RestMethod -Uri "$API_URL/publishing/jobs?status=QUEUED" -Method Get -Headers $headers
    $jobCount = $jobs.data.Count
    Write-Host "   ✅ تم جلب المهام" -ForegroundColor Green
    Write-Host "   📋 عدد المهام المعلقة: $jobCount" -ForegroundColor Gray
    
    if ($jobCount -gt 0) {
        foreach ($job in $jobs.data) {
            Write-Host "      • $($job.platform) - $($job.scheduledAt) - $($job.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ خطأ في جلب المهام: $_" -ForegroundColor Red
}

# 6. Get Clients
Write-Host "`n6️⃣ جلب العملاء..." -ForegroundColor Yellow
try {
    $clients = Invoke-RestMethod -Uri "$API_URL/clients" -Method Get -Headers $headers
    $clientCount = if ($clients.data) { $clients.data.Count } else { $clients.Count }
    Write-Host "   ✅ تم جلب العملاء" -ForegroundColor Green
    Write-Host "   👥 عدد العملاء: $clientCount" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ خطأ في جلب العملاء: $_" -ForegroundColor Red
}

# 7. Register Device
Write-Host "`n7️⃣ تسجيل الجهاز..." -ForegroundColor Yellow
try {
    $deviceBody = @{
        name = "Test Device"
        userAgent = "PowerShell Test Script"
    } | ConvertTo-Json
    
    $device = Invoke-RestMethod -Uri "$API_URL/devices/register" -Method Post -Body $deviceBody -Headers $headers
    $deviceId = if ($device.data) { $device.data.id } else { $device.id }
    Write-Host "   ✅ تم تسجيل الجهاز" -ForegroundColor Green
    Write-Host "   🔧 Device ID: $deviceId" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ خطأ في تسجيل الجهاز: $_" -ForegroundColor Red
}

# 8. Create a scheduled post for testing
Write-Host "`n8️⃣ إنشاء منشور مجدول للاختبار..." -ForegroundColor Yellow
try {
    # Get first client
    $clientsData = Invoke-RestMethod -Uri "$API_URL/clients" -Method Get -Headers $headers
    $clientsList = if ($clientsData.data) { $clientsData.data } else { $clientsData }
    
    if ($clientsList.Count -gt 0) {
        $clientId = $clientsList[0].id
        $clientName = $clientsList[0].name
        
        # Schedule for 1 minute from now
        $scheduledTime = (Get-Date).AddMinutes(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        $postBody = @{
            clientId = $clientId
            title = "منشور اختبار تلقائي"
            scheduledAt = $scheduledTime
            variants = @(
                @{
                    platform = "X"
                    caption = "اختبار النشر التلقائي على X - $(Get-Date -Format 'HH:mm:ss')"
                }
            )
        } | ConvertTo-Json -Depth 3
        
        $post = Invoke-RestMethod -Uri "$API_URL/posts" -Method Post -Body $postBody -Headers $headers
        $postId = if ($post.data) { $post.data.id } else { $post.id }
        Write-Host "   ✅ تم إنشاء المنشور" -ForegroundColor Green
        Write-Host "   📝 Post ID: $postId" -ForegroundColor Gray
        Write-Host "   👤 العميل: $clientName" -ForegroundColor Gray
        
        # Schedule the post to create publishing jobs
        Write-Host "   ⏳ جدولة المنشور..." -ForegroundColor Gray
        $scheduleBody = @{
            scheduledAt = $scheduledTime
        } | ConvertTo-Json
        
        $scheduledPost = Invoke-RestMethod -Uri "$API_URL/posts/$postId/schedule" -Method Post -Body $scheduleBody -Headers $headers
        Write-Host "   ✅ تم جدولة المنشور" -ForegroundColor Green
        Write-Host "   ⏰ مجدول في: $scheduledTime" -ForegroundColor Gray
        
        # Check jobs again
        Start-Sleep -Seconds 1
        $jobsAfter = Invoke-RestMethod -Uri "$API_URL/publishing/jobs?status=QUEUED" -Method Get -Headers $headers
        $jobCountAfter = $jobsAfter.data.Count
        Write-Host "   📋 عدد المهام المعلقة الآن: $jobCountAfter" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️ لا يوجد عملاء لإنشاء منشور" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ خطأ في إنشاء المنشور: $_" -ForegroundColor Red
}

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ اكتمل الاختبار" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📌 الخطوات التالية:" -ForegroundColor Yellow
Write-Host "   1. أعد تحميل الإكستنشن من chrome://extensions" -ForegroundColor White
Write-Host "   2. سجل الدخول في الإكستنشن" -ForegroundColor White
Write-Host "   3. اضغط على 'فحص المهام' في قسم التشخيص" -ForegroundColor White
Write-Host "   4. راقب الـ Console في Service Worker" -ForegroundColor White
