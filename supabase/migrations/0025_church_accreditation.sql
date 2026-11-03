-- Phase 25: churches publish their own accreditation requirements.
--
-- Each church sets what its counselors had to do to be accredited (training, classes, supervision…). The public
-- /accreditation pages read them from here instead of the prototype's sample list. A church whose counselors are
-- accredited through its denomination or presbytery names it in accredited_by.
-- A church is listed on /accreditation once it has a credential name and at least one requirement.

alter table public.churches
  add column accreditation_summary text not null default '',
  add column credential_name text not null default '',
  add column accredited_by text not null default '',      -- blank: the church accredits its own counselors
  add column requirements jsonb not null default '[]'::jsonb,  -- [{ "title": "Training", "items": ["…"] }]
  add column renewal text not null default '',
  add column how_to_apply text not null default '',
  add column accreditation_updated_at timestamptz;

grant select (accreditation_summary, credential_name, accredited_by, requirements, renewal, how_to_apply, accreditation_updated_at)
  on public.churches to anon, authenticated;

/** A church admin (or a FaithWellness admin) saves the church's requirements. Blank groups and items are dropped. */
create function public.save_church_accreditation(
  p_church_slug text,
  p_summary text,
  p_credential_name text,
  p_accredited_by text,
  p_requirements jsonb,
  p_renewal text,
  p_how_to_apply text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  target uuid := (select id from churches where slug = p_church_slug);
  cleaned jsonb;
begin
  if target is null or not (public.is_church_admin(target) or public.is_admin()) then raise exception 'Not allowed'; end if;
  if jsonb_typeof(coalesce(p_requirements, '[]'::jsonb)) <> 'array' then raise exception 'Requirements must be a list'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('title', g.title, 'items', g.items) order by g.n), '[]'::jsonb)
  into cleaned
  from (
    select n, left(trim(grp->>'title'), 80) as title,
      (select coalesce(jsonb_agg(left(trim(i.item), 300) order by i.m), '[]'::jsonb)
       from jsonb_array_elements_text(case when jsonb_typeof(grp->'items') = 'array' then grp->'items' else '[]'::jsonb end)
         with ordinality as i(item, m)
       where trim(i.item) <> '') as items
    from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) with ordinality as r(grp, n)
    where jsonb_typeof(grp) = 'object' and trim(coalesce(grp->>'title', '')) <> ''
  ) g
  where jsonb_array_length(g.items) > 0;

  if jsonb_array_length(cleaned) > 12 then raise exception 'Too many groups'; end if;

  update churches set
    accreditation_summary = left(trim(coalesce(p_summary, '')), 400),
    credential_name = left(trim(coalesce(p_credential_name, '')), 120),
    accredited_by = left(trim(coalesce(p_accredited_by, '')), 120),
    requirements = cleaned,
    renewal = left(trim(coalesce(p_renewal, '')), 400),
    how_to_apply = left(trim(coalesce(p_how_to_apply, '')), 400),
    accreditation_updated_at = now()
  where id = target;
end;
$$;

revoke execute on function public.save_church_accreditation(text, text, text, text, jsonb, text, text) from public, anon;
grant execute on function public.save_church_accreditation(text, text, text, text, jsonb, text, text) to authenticated;

-- The prototype's sample requirements, moved onto the sample churches (only where nothing is set yet).
-- The Pacific Coast Presbytery accredits Living Waters Presbyterian's counselors.
update public.churches set
  accreditation_summary = 'Accredits pastors and lay counselors on its care team after supervised training and elder review.',
  credential_name = 'Grace Fellowship Care Team Counselor',
  accredited_by = '',
  requirements = '[{"title":"Training","items":["40 hours of the church’s pastoral care course","Trauma-informed care workshop (8 hours)","Ordination or a counseling degree for pastoral counselors"]},{"title":"Classes","items":["Foundations of biblical counseling (8 weeks)","Grace Fellowship membership class"]},{"title":"Ministry service","items":["Serve on the care team for at least one year","Co-lead a small group or care group"]},{"title":"Supervision","items":["20 supervised sessions with a senior care pastor","Monthly case consultation during the first year"]},{"title":"Character and faith","items":["Member of the church for at least two years","Affirms the church’s statement of faith","Interview with the elder board"]},{"title":"Safeguarding","items":["Background check renewed every two years","Mandated-reporter training","Signs the church’s care code of conduct"]}]'::jsonb,
  renewal = 'Every two years, with 10 hours of continuing education.',
  how_to_apply = 'Speak to the care pastor, then complete the church’s care team application.',
  accreditation_updated_at = '2026-09-14T12:00:00Z'
where slug = 'grace-fellowship' and credential_name = '';

update public.churches set
  accreditation_summary = 'Accredits licensed therapists and ministry staff who serve its marriage and family ministry.',
  credential_name = 'Cornerstone Marriage & Family Ministry Counselor',
  accredited_by = '',
  requirements = '[{"title":"Training","items":["State license (LMFT, LPC or LCSW), or a seminary counseling degree","Prepare/Enrich facilitator training"]},{"title":"Classes","items":["Covenant marriage course (6 weeks), taken or taught"]},{"title":"Ministry service","items":["Lead or assist a marriage ministry group for a year","Mentor at least one engaged couple"]},{"title":"Supervision","items":["Quarterly peer review with the ministry team"]},{"title":"Character and faith","items":["Active member in good standing","Recommendation from a pastor"]},{"title":"Safeguarding","items":["Background check","Child-safety training if working with families"]}]'::jsonb,
  renewal = 'Yearly review with the ministry director.',
  how_to_apply = 'Email the marriage and family ministry office with your license and pastor’s recommendation.',
  accreditation_updated_at = '2026-08-02T12:00:00Z'
where slug = 'cornerstone-church' and credential_name = '';

update public.churches set
  accreditation_summary = 'Accredits licensed counselors on its care team, with extra training for abuse and church-hurt recovery.',
  credential_name = 'Hope Community Care Team Counselor',
  accredited_by = '',
  requirements = '[{"title":"Training","items":["State counseling license","Abuse-recovery and church-hurt training (16 hours)","Spiritual abuse awareness course"]},{"title":"Classes","items":["Healing from church hurt (4-week class)"]},{"title":"Ministry service","items":["Serve with the care team’s support groups for six months"]},{"title":"Supervision","items":["Clinical supervision for the first 50 sessions"]},{"title":"Character and faith","items":["Recommendation from two care team members"]},{"title":"Safeguarding","items":["Background check every year","Trauma-informed safeguarding policy signed"]}]'::jsonb,
  renewal = 'Every year.',
  how_to_apply = 'Apply through the care team director.',
  accreditation_updated_at = '2026-07-21T12:00:00Z'
where slug = 'hope-community' and credential_name = '';

update public.churches set
  accreditation_summary = 'Accredits clinicians who also train and supervise the church’s lay counselors.',
  credential_name = 'Redeemer City Clinical Partner',
  accredited_by = '',
  requirements = '[{"title":"Training","items":["Doctoral or master’s clinical license","Faith-integration seminar (12 hours)"]},{"title":"Classes","items":["Teach one session of the lay counselor training each year"]},{"title":"Ministry service","items":["Lead or support a church ministry, such as recovery or young adults"]},{"title":"Supervision","items":["Supervises at least two lay counselors each year"]},{"title":"Character and faith","items":["Member or regular attender for one year"]},{"title":"Safeguarding","items":["Background check","Professional liability insurance"]}]'::jsonb,
  renewal = 'Every two years.',
  how_to_apply = 'Contact the counseling ministry lead for an interview.',
  accreditation_updated_at = '2026-06-30T12:00:00Z'
where slug = 'redeemer-city' and credential_name = '';

update public.churches set
  accreditation_summary = 'Accredits counselors serving any of its member churches, using one shared standard.',
  credential_name = 'Presbytery Commissioned Counselor',
  accredited_by = 'Pacific Coast Presbytery',
  requirements = '[{"title":"Training","items":["Presbytery lay counseling certificate (60 hours), or a professional license","Specialist training for the area served, e.g. biblical financial counseling"]},{"title":"Classes","items":["Reformed theology and pastoral care (12 weeks)","Polity and ethics class for commissioned leaders"]},{"title":"Ministry service","items":["Two years serving as a deacon, elder or care team member","Lead a ministry in your church, such as a Bible study or budgeting class"]},{"title":"Supervision","items":["Assigned mentor from the presbytery’s care committee for one year"]},{"title":"Character and faith","items":["Commissioned by the session of a member church","Affirms the denomination’s confessional standards"]},{"title":"Safeguarding","items":["Background check","Presbytery safeguarding training every three years"]}]'::jsonb,
  renewal = 'Every three years, approved by the care committee.',
  how_to_apply = 'Your church’s session nominates you to the presbytery care committee.',
  accreditation_updated_at = '2026-05-11T12:00:00Z'
where slug = 'living-waters' and credential_name = '';
