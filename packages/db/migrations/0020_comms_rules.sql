-- Communication rules (design.md §14, 2026-11-08).

-- Discussion replies nest one level: a reply's parent must be a top-level
-- post in the same thread.
CREATE FUNCTION lms_discussion_post_parent() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_thread uuid;
  parent_parent uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT thread_id, parent_id INTO parent_thread, parent_parent
    FROM discussion_posts WHERE id = NEW.parent_id;
  IF parent_thread IS DISTINCT FROM NEW.thread_id THEN
    RAISE EXCEPTION 'reply parent must be in the same thread' USING ERRCODE = 'check_violation';
  END IF;
  IF parent_parent IS NOT NULL THEN
    RAISE EXCEPTION 'replies nest one level only' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discussion_posts_parent
  BEFORE INSERT OR UPDATE OF parent_id, thread_id ON discussion_posts
  FOR EACH ROW EXECUTE FUNCTION lms_discussion_post_parent();
--> statement-breakpoint

-- Earlier versions of edited posts and messages are evidence for the
-- communication log: append-only.
CREATE TRIGGER message_revisions_append_only
  BEFORE UPDATE OR DELETE ON message_revisions
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint

-- Posts, messages and ticket replies are never deleted (hidden instead).
CREATE TRIGGER discussion_posts_no_delete
  BEFORE DELETE ON discussion_posts
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint
CREATE TRIGGER direct_messages_no_delete
  BEFORE DELETE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
--> statement-breakpoint
CREATE TRIGGER ticket_replies_no_delete
  BEFORE DELETE ON ticket_replies
  FOR EACH ROW EXECUTE FUNCTION lms_reject_change();
