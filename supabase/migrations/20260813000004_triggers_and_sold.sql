-- ============================================================
-- Migration: Add `sold` column to products
--            + message notification trigger
-- ============================================================

-- Mark a product as sold when an order is placed
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sold BOOLEAN NOT NULL DEFAULT false;

-- ──────────────────────────────────────────────────────────────
-- Trigger: When a new message is inserted, notify the OTHER
-- participant (the one who did NOT send the message).
-- This runs entirely in Postgres so it works even if the Edge
-- Function is unavailable.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id  uuid;
  v_seller_id uuid;
  v_product_name text;
  v_sender_name text;
  v_recipient_id uuid;
BEGIN
  -- Get chat participants and product name
  SELECT c.buyer_id, c.seller_id, p.name
  INTO v_buyer_id, v_seller_id, v_product_name
  FROM public.chats c
  JOIN public.products p ON p.id = c.product_id
  WHERE c.id = NEW.chat_id;

  -- Get sender name
  SELECT name INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  -- Notify the OTHER participant
  IF NEW.sender_id = v_buyer_id THEN
    v_recipient_id := v_seller_id;
  ELSE
    v_recipient_id := v_buyer_id;
  END IF;

  -- Insert notification for the recipient
  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    v_recipient_id,
    'new_message',
    COALESCE(v_sender_name, 'Someone') || ' sent you a message',
    'Re: ' || COALESCE(v_product_name, 'your listing'),
    '/chat'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;

CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();

-- ──────────────────────────────────────────────────────────────
-- Trigger: When an order is placed, notify buyer & seller and
-- mark the product as sold.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name text;
  v_buyer_name   text;
  v_seller_name  text;
BEGIN
  -- Get product name
  SELECT name INTO v_product_name
  FROM public.products WHERE id = NEW.product_id;

  -- Get buyer and seller names
  SELECT name INTO v_buyer_name FROM public.profiles WHERE id = NEW.buyer_id;
  SELECT name INTO v_seller_name FROM public.profiles WHERE id = NEW.seller_id;

  -- Mark product as sold
  UPDATE public.products SET sold = true WHERE id = NEW.product_id;

  -- Notify buyer
  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    NEW.buyer_id,
    'order_placed',
    'Order placed successfully! 🎉',
    'You bought: ' || COALESCE(v_product_name, 'an item') || '. Contact the seller to arrange pickup.',
    '/chat'
  );

  -- Notify seller
  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    NEW.seller_id,
    'order_received',
    COALESCE(v_buyer_name, 'A student') || ' bought your item!',
    'Sold: ' || COALESCE(v_product_name, 'your listing') || '. Arrange pickup with them.',
    '/chat'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_order ON public.orders;

CREATE TRIGGER trg_handle_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();
