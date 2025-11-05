# 🔔 Bildirim Sistemi Kurulum Kılavuzu

## Veritabanı Kurulumu

1. PostgreSQL'e bağlanın
2. `create_notifications.sql` dosyasını çalıştırın:
   ```bash
   psql -U your_username -d your_database -f create_notifications.sql
   ```

## Bildirim Tipleri

### Kullanıcı Bildirimleri
- **Sipariş Durumu**: Sipariş durumu değiştiğinde otomatik gönderilir
- **Kampanya**: Admin tarafından kampanya duyurusu yapılabilir
- **Soru Cevap**: Sorulan sorulara cevap verildiğinde bildirim
- **Genel Duyuru**: Admin'in tüm kullanıcılara duyurusu
- **Hoşgeldin**: Yeni kayıt olduktan sonra otomatik gönderilir

### Admin Bildirimleri
- **Yeni Sipariş**: Kullanıcı sipariş verdiğinde otomatik gönderilir
- **Yeni Soru**: Kullanıcı soru sorduğunda bildirim
- **Stok Uyarısı**: Ürün stoğu azaldığında uyarı

## API Endpoints

### Bildirimleri Getir
```
GET /api/notifications
GET /api/notifications?unreadOnly=true
```

### Okunmamış Sayısını Getir
```
GET /api/notifications/unread-count
```

### Bildirimi Okundu İşaretle
```
PUT /api/notifications/:id/read
```

### Tümünü Okundu İşaretle
```
PUT /api/notifications/mark-all-read
```

### Bildirim Sil
```
DELETE /api/notifications/:id
```

### Genel Duyuru Gönder (Admin)
```
POST /api/notifications/announce
Body: {
  "title": "Kampanya Başladı!",
  "message": "Tüm ürünlerde %20 indirim",
  "link": "/category.html?id=1"
}
```

### Bildirim Tercihlerini Getir
```
GET /api/notifications/preferences
```

### Bildirim Tercihlerini Güncelle
```
PUT /api/notifications/preferences
Body: {
  "order_status_updates": true,
  "campaign_notifications": false,
  ...
}
```

## Kullanım Örnekleri

### Sipariş Durumu Bildirimi
```javascript
const { notifyOrderStatusChange } = require('./notificationHelper');

// Sipariş durumu güncellendiğinde
await notifyOrderStatusChange(orderId, 'shipped', userId);
```

### Yeni Sipariş Bildirimi (Adminlere)
```javascript
const { notifyNewOrder } = require('./notificationHelper');

// Yeni sipariş oluşturulduğunda
await notifyNewOrder(orderId, customerName, totalAmount);
```

### Kampanya Bildirimi
```javascript
const { notifyCampaign } = require('./notificationHelper');

// Kampanya duyurusu
await notifyCampaign({
    title: 'Yaz İndirimleri Başladı!',
    message: 'Tüm temizlik ürünlerinde %30 indirim',
    campaignCode: 'YAZ30',
    link: '/'
});
```

### Hoşgeldin Bildirimi
```javascript
const { notifyWelcome } = require('./notificationHelper');

// Yeni kullanıcı kaydında
await notifyWelcome(userId, firstName);
```

### Stok Uyarısı (Adminlere)
```javascript
const { notifyLowStock } = require('./notificationHelper');

// Stok azaldığında
await notifyLowStock(productId, productName, stockQuantity);
```

## Ön Yüz Kullanımı

### Bildirim Badge'ini Header'a Eklemek

Her sayfanın header bölümüne bildirim ikonu eklenmiştir. Badge otomatik güncellenir:

```javascript
// Okunmamış bildirim sayısını getir
async function updateNotificationBadge() {
    const response = await fetch('/api/notifications/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    const badge = document.getElementById('notification-badge');
    if (data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}
```

## Bildirim Tercihleri

Kullanıcılar `/notifications.html` sayfasından bildirim tercihlerini yönetebilir:

- ✅ Hangi bildirimleri almak istediklerini seçebilir
- ✅ Email bildirimlerini (gelecekte) aktif/pasif edebilir
- ✅ Admin kullanıcılar admin bildirimleri için ayrı ayarlar yapabilir

## Önemli Notlar

1. **Bildirimler Gerçek Zamanlı Değil**: Şu an için bildirimler sayfa yenilendiğinde veya her 30 saniyede bir güncellenir. WebSocket entegrasyonu eklenebilir.

2. **Email Gönderimi**: Email altyapısı hazır ama şu an aktif değil. Email tercihleri database'de kayıtlı.

3. **Bildirim Filtreleme**: Kullanıcılar tercihlere göre bildirim almayabilir. `checkUserPreference()` fonksiyonu kontrol eder.

4. **Admin Duyuruları**: Admin, tüm kullanıcılara toplu bildirim gönderebilir.

## Gelecek İyileştirmeler

- [ ] WebSocket ile gerçek zamanlı bildirimler
- [ ] Email gönderimi (Nodemailer ile)
- [ ] Push notification (Web Push API)
- [ ] Bildirim sesleri
- [ ] Bildirim gruplaması
- [ ] Bildirim arşivi (30 gün sonra otomatik silme)

## Test

Sistemi test etmek için:

1. Yeni bir kullanıcı kayıt edin → Hoşgeldin bildirimi gelmeli
2. Bir sipariş verin → Adminlere yeni sipariş bildirimi gitmeli
3. Admin olarak sipariş durumunu değiştirin → Kullanıcıya bildirim gitmeli
4. Admin olarak genel duyuru gönderin → Tüm kullanıcılara gitmeli

## Sorun Giderme

**Bildirimler görünmüyor:**
- Token'ın geçerli olduğundan emin olun
- Browser console'da hata kontrolü yapın
- `/api/notifications` endpoint'ine manuel istek atın

**Badge güncellenmiyor:**
- `updateNotificationBadge()` fonksiyonunun çağrıldığından emin olun
- Style.css'de `.notification-badge` stilinin yüklendiğini kontrol edin

**Tercihler kaydedilmiyor:**
- User'ın `notification_preferences` tablosunda kaydı olduğundan emin olun
- Trigger'ın çalıştığını kontrol edin (yeni kullanıcılar için otomatik oluşur)
