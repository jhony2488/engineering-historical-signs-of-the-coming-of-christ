-- Push subscriptions table for PWA notifications
-- Stores Web Push API subscriptions for sending notifications to users

-- Drop table if exists (for re-running migration)
DROP TABLE IF EXISTS push_subscriptions CASCADE;

CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by endpoint
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Index for cleanup of old subscriptions
CREATE INDEX idx_push_subscriptions_created_at ON push_subscriptions(created_at);

-- Comment
COMMENT ON TABLE push_subscriptions IS 'Web Push API subscriptions for PWA notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push subscription endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'VAPID public key (p256dh)';
COMMENT ON COLUMN push_subscriptions.auth IS 'VAPID authentication secret';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'User agent string for debugging';
