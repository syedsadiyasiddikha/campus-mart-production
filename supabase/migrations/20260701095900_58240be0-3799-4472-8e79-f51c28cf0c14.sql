
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM authenticated;
