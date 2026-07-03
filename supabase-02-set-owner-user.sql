insert into public.profiles (id, email, full_name, role, status)
select id,
       email,
       'Dono Belaways',
       'owner'::public.user_role,
       'active'
from auth.users
where lower(email) = lower('rls50@me.com')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = 'owner'::public.user_role,
    status = 'active',
    updated_at = now();

insert into public.user_preferences (user_id)
select id
from public.profiles
where lower(email) = lower('rls50@me.com')
on conflict (user_id) do nothing;
