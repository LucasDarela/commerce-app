CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  route_number integer NOT NULL,
  status text DEFAULT 'Pendente',
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for users in the same company" 
ON public.delivery_routes FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow insert for users in the same company" 
ON public.delivery_routes FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow update for users in the same company" 
ON public.delivery_routes FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow delete for users in the same company" 
ON public.delivery_routes FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);
