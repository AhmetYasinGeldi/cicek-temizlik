### ENGLISH

# Çiçek Temizlik - E-Commerce Platform

This project is a full-featured e-commerce platform for "Çiçek Temizlik," a family-owned cleaning supply business. It includes features like product management, user authentication with multiple roles, a shopping cart, an order processing system, and much more.

---

### 🚦 Project Status

**❗ Note:** This project is currently under **active development**. Some features may be incomplete or not fully functional. The list below outlines current, in-progress, and planned features.

---

### ✨ Features

   * User Management:
       * Secure user registration and login (passwords are hashed).
       * JWT-based authentication and authorization.
       * Admin and regular user roles.
   * Product Management (Admin Panel):
       * Add, edit, and delete products.
       * Manage product name, price, description, stock quantity, and active status.
       * Product image upload and cropping feature.
       * Set product-specific critical stock thresholds.
       * Define product-specific out-of-stock display rules (hide/show).
       * Quick editing for products on the homepage (price, stock, active status).
   * Cart Management:
       * Users can add, remove, and update product quantities in their cart.
       * Stock control and insufficient stock warnings.
       * View cart contents and total price.
   * System Settings (Admin Panel):
       * Enable/disable general sales status.
       * Define general out-of-stock product display rules.
       * Set a general critical stock threshold.
       * Configure quick price adjustment step for admin panel.
       * Reset all product stock behavior or critical stock thresholds to general
         settings.
   * User Interface and Experience:
       * Modern and responsive design.
       * Light and Dark Mode theme support.
       * Toast notifications for user feedback.
       * Confirmation modals for critical actions.
   *   * ... and many more features are planned!

---

### 🛠️ Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Frontend:** HTML, CSS, JavaScript
- **Authentication:** JWT, bcrypt
- **File Uploads:** Multer
- **Image Processing:** Jimp (for product image cropping)

---

### 🚀 Setup and Running

Follow these steps to run the project on your local machine:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/AhmetYasinGeldi/cicek-temizlik.git](https://github.com/AhmetYasinGeldi/cicek-temizlik.git)
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd cicek-temizlik
    ```
3.  **Install the required packages:**
    ```bash
    npm install
    ```
4.  **Set up environment variables:**
    - Create a file named `.env` in the root directory.
    - Fill it with your own settings based on the example below:
      ```
      DB_HOST=localhost
      DB_USER=root
      DB_PASSWORD=your_password
      DB_NAME=cicek_temizlik_db
      JWT_SECRET=a_very_secret_key
      ```
5.  **Start the application:**
    ```bash
    npm start
    ```

---

### ©️ Copyright and Licensing

Copyright (c) 2025 Ahmet Yasin Geldi. All Rights Reserved.

This project is created for educational and portfolio purposes. The code is proprietary and may not be used, copied, modified, or distributed without the express written permission of the owner.

---
---

### TÜRKÇE

# Çiçek Temizlik - E-Ticaret Platformu

Bu proje, bir aile şirketi olan "Çiçek Temizlik" için geliştirilmiş tam özellikli bir e-ticaret platformudur. Proje; ürün yönetimi, çoklu kullanıcı rolleri ile kimlik doğrulama, alışveriş sepeti, sipariş yönetim sistemi ve daha birçok özellik içermektedir.

---

### 🚦 Proje Durumu

**❗ Not:** Bu proje şu anda aktif olarak **geliştirilme aşamasındadır**. Bazı özellikler eksik veya hatalı çalışabilir. Aşağıdaki liste, mevcut, geliştirilmekte olan ve planlanan özellikleri özetlemektedir.

---

### ✨ Özellikler

   * Kullanıcı Yönetimi:
       * Güvenli kullanıcı kaydı ve girişi (şifreler hash'lenir).
       * JWT tabanlı kimlik doğrulama ve yetkilendirme.
       * Admin ve normal kullanıcı rolleri.
   * Ürün Yönetimi (Admin Paneli):
       * Ürün ekleme, düzenleme ve silme.
       * Ürün adı, fiyatı, açıklaması, stok miktarı, aktiflik durumu yönetimi.
       * Ürün resmi yükleme ve kırpma özelliği.
       * Ürüne özel kritik stok eşiği belirleme.
       * Ürüne özel stokta yoksa gösterim kuralı (gizle/göster) belirleme.
       * Ana sayfada ürünler için hızlı düzenleme (fiyat, stok, aktiflik).
   * Sepet Yönetimi:
       * Kullanıcıların sepete ürün eklemesi, çıkarması ve miktarını güncellemesi.
       * Stok kontrolü ve yetersiz stok uyarısı.
       * Sepet içeriğini ve toplam fiyatı görüntüleme.
   * Sistem Ayarları (Admin Paneli):
       * Genel satış durumunu açma/kapama.
       * Genel stokta yoksa ürün gösterim kuralı belirleme.
       * Genel kritik stok eşiği belirleme.
       * Hızlı fiyat değişim adımı ayarlama.
       * Tüm ürünlerin stok davranışını veya kritik stok eşiğini genel ayarlara sıfırlama.
   * Kullanıcı Arayüzü ve Deneyimi:
       * Modern ve duyarlı tasarım.
       * Açık ve koyu tema (Dark Mode) desteği.
       * Toast bildirimleri ile kullanıcı geri bildirimi.
       * Onay modal pencereleri ile kritik işlemler için doğrulama.
   *   * ... ve daha birçok özellik planlanmaktadır!*

---

### 🛠️ Kullanılan Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** PostgreSQL
- **Frontend:** HTML, CSS, JavaScript
- **Kimlik Doğrulama:** JWT, bcrypt
- **Diğer:** Dosya Yükleme: Multer
- **Görüntü İşleme:** Jimp (ürün resmi kırpma için)

---

### 🚀 Kurulum ve Çalıştırma

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

1.  **Depoyu klonlayın:**
    ```bash
    git clone [https://github.com/AhmetYasinGeldi/cicek-temizlik.git](https://github.com/AhmetYasinGeldi/cicek-temizlik.git)
    ```
2.  **Proje dizinine gidin:**
    ```bash
    cd cicek-temizlik
    ```
3.  **Gerekli paketleri yükleyin:**
    ```bash
    npm install
    ```
4.  **Ortam değişkenlerini ayarlayın:**
    - Proje ana dizininde `.env` adında bir dosya oluşturun.
    - Aşağıdaki değişkenleri kendi ayarlarınıza göre doldurun:
      ```
      DB_HOST=localhost
      DB_USER=root
      DB_PASSWORD=sifreniz
      DB_NAME=cicek_temizlik_db
      JWT_SECRET=cok_gizli_bir_anahtar
      ```
5.  **Uygulamayı başlatın:**
    ```bash
    npm start
    ```

---

### ©️ Telif Hakkı ve Lisans

Copyright (c) 2025 Ahmet Yasin Geldi. Tüm Hakları Saklıdır.

Bu proje eğitim ve portfolyo amaçlı oluşturulmuştur. Kodlar özel mülktür ve sahibinin açık yazılı izni olmadan kullanılamaz, kopyalanamaz, değiştirilemez veya dağıtılamaz.