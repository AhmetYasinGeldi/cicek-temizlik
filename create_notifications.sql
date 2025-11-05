-- Bildirim Tablosu
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    -- İlişkili veri ID'leri
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    question_id INTEGER,
    campaign_code VARCHAR(50),
    
    -- Admin tarafından gönderilen genel bildirimler için
    is_global BOOLEAN DEFAULT FALSE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_global ON notifications(is_global);

-- Bildirim Tercihleri Tablosu
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Kullanıcı bildirimleri
    order_status_updates BOOLEAN DEFAULT TRUE,
    campaign_notifications BOOLEAN DEFAULT TRUE,
    question_answers BOOLEAN DEFAULT TRUE,
    general_announcements BOOLEAN DEFAULT TRUE,
    
    -- Admin bildirimleri (sadece admin kullanıcılar için)
    new_orders BOOLEAN DEFAULT TRUE,
    new_questions BOOLEAN DEFAULT TRUE,
    low_stock_alerts BOOLEAN DEFAULT TRUE,
    
    -- Email tercihleri (gelecekte kullanım için)
    email_order_status BOOLEAN DEFAULT TRUE,
    email_campaigns BOOLEAN DEFAULT FALSE,
    email_announcements BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Kullanıcı kaydı yapıldığında otomatik tercih oluştur
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
CREATE TRIGGER trigger_create_notification_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_notification_preferences();

-- Mevcut kullanıcılar için tercih oluştur
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Bildirim sayısını getiren view
CREATE OR REPLACE VIEW unread_notification_counts AS
SELECT 
    user_id,
    COUNT(*) as unread_count
FROM notifications
WHERE is_read = FALSE
GROUP BY user_id;

COMMENT ON TABLE notifications IS 'Kullanıcı ve admin bildirimleri';
COMMENT ON TABLE notification_preferences IS 'Kullanıcıların bildirim tercihleri';
