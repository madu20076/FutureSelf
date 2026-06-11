-- ── Phase 6: Admin Dashboard ──────────────────────────────────────────────────
-- RPC function for recent chats with last-message per session.
-- Restricted to the service_role so the anon/authenticated roles cannot call it.

CREATE OR REPLACE FUNCTION public.get_admin_recent_chats()
RETURNS TABLE(
  session_id       uuid,
  user_email       text,
  display_name     text,
  last_message     text,
  last_message_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cs.id                    AS session_id,
    p.email                  AS user_email,
    fp.display_name,
    lm.content               AS last_message,
    lm.created_at            AS last_message_at
  FROM chat_sessions cs
  JOIN  profiles            p  ON p.id       = cs.user_id
  LEFT JOIN futureself_profiles fp ON fp.user_id = cs.user_id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM   chat_messages
    WHERE  session_id = cs.id
    ORDER  BY created_at DESC
    LIMIT  1
  ) lm ON true
  ORDER BY COALESCE(lm.created_at, cs.created_at) DESC
  LIMIT 10;
$$;

-- Only service_role may call this function
REVOKE EXECUTE ON FUNCTION public.get_admin_recent_chats() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_admin_recent_chats() TO   service_role;
