-- Fix: profiles_phone_public_exposure
-- Restrict the phone column so it is not readable by all authenticated users.
-- Owners fetch their own profile (including phone) via a SECURITY DEFINER RPC.

REVOKE SELECT (phone) ON public.profiles FROM authenticated;
REVOKE SELECT (phone) ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Fix: orders_missing_update_delete
-- Only the buyer or seller of an order may update or delete it.

CREATE POLICY "Order participants update"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Order participants delete"
  ON public.orders FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
