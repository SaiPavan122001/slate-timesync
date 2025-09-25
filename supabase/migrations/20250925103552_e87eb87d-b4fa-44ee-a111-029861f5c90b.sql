-- Update user role to super_admin for the specified email
UPDATE public.user_roles 
SET role = 'super_admin'::app_role
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  WHERE email = 'saipavanadusumalli2001@gmail.com'
);