-- ============================================================================
--  Éclats — données de démonstration
--  À exécuter APRÈS schema.sql (SQL Editor > New query > Run).
--  Crée le mariage démo "Amaury & Charlie" et ses 30 défis.
--  Idempotent : peut être relancé sans créer de doublons.
-- ============================================================================

insert into public.events
  (slug, couple_names, event_date, place, welcome_message, game_active)
values
  ('amaury-charlie', 'Amaury & Charlie', '2027-06-12',
   'Domaine du Vieux Chêne · Belgique',
   'Vous avez capturé un moment ? Partagez-le avec nous — chaque photo compte pour raconter notre journée.',
   true)
on conflict (slug) do nothing;

-- On repart d'une liste propre pour ce mariage.
delete from public.photo_challenges
where event_id in (select id from public.events where slug = 'amaury-charlie');

with e as (select id from public.events where slug = 'amaury-charlie')
insert into public.photo_challenges (event_id, label, sort_order, unlock_threshold)
select e.id, v.label, v.ord, v.thr
from e, (values
  ('📸 Une photo avec quelqu''un que tu rencontres pour la première fois aujourd''hui.', 1, 0),
  ('🕺 Une photo avec quelqu''un en pleine danse complètement ridicule.', 2, 0),
  ('👴 Une photo avec la personne la plus âgée de la soirée.', 3, 0),
  ('👶 Une photo avec l''un des plus jeunes invités.', 4, 0),
  ('😎 Une photo de groupe façon « pochette d''album ».', 5, 0),
  ('❤️ Une photo avec un couple ensemble depuis plus de 10 ans.', 6, 0),
  ('🥂 Une photo où au moins 5 personnes trinquent en même temps.', 7, 0),
  ('🤪 Une photo avec trois personnes faisant leur plus belle grimace.', 8, 0),
  ('💃 Une photo avec quelqu''un dans une pose de mannequin.', 9, 0),
  ('🦸 Une photo de groupe façon équipe de super-héros.', 10, 0),
  ('👔 Une photo avec quelqu''un qui porte un nœud papillon ou une cravate.', 11, 0),
  ('👗 Une photo avec trois personnes portant la même couleur.', 12, 0),
  ('🍰 Une photo avec quelque chose à manger… mais présentée comme une publicité de luxe.', 13, 0),
  ('🌸 Une photo avec une fleur récupérée quelque part dans la décoration.', 14, 0),
  ('💍 Une photo où quelqu''un « demande en mariage » quelqu''un d''autre.', 15, 0),
  ('😂 Une photo avec quelqu''un en train de rire pour de vrai.', 16, 0),
  ('🪑 Une photo de cinq personnes essayant de tenir autour d''une seule chaise.', 17, 0),
  ('🧘 Une photo dans une position de yoga complètement improvisée.', 18, 0),
  ('🚂 Une photo d''une mini chenille de danse avec au moins 6 personnes.', 19, 0),
  ('🤵 Une photo avec le marié… mais tout le monde doit prendre exactement sa pose.', 20, 0),
  ('👰 Une photo avec la mariée… façon couverture de magazine.', 21, 0),
  ('🫶 Une photo où au moins 8 personnes forment un cœur avec leurs mains.', 22, 0),
  ('🥸 Une photo avec un accessoire complètement détourné de son utilisation normale.', 23, 0),
  ('🎬 Une photo reproduisant une scène de film connue.', 24, 0),
  ('🗿 Une photo où tout le monde doit rester complètement sérieux sauf une personne.', 25, 0),
  ('🤸 Une photo où personne n''a les deux pieds au sol.', 26, 0),
  ('🔄 Une photo avec quelqu''un qui porte quelque chose à l''envers.', 27, 0),
  ('👯 Une photo avec deux personnes qui se ressemblent ou sont habillées presque pareil.', 28, 0),
  ('🌙 Une photo prise tard dans la soirée avec les derniers survivants sur la piste de danse.', 29, 0),
  ('🏆 Le défi ultime : réunir sur une seule photo une personne de chaque « groupe » du mariage — famille de Charlie, famille d''Amaury, amis de Charlie, amis d''Amaury, et quelqu''un qui connaît les deux depuis longtemps.', 30, 10)
) as v(label, ord, thr);

-- ============================================================================
--  Rappel : pour devenir administrateur de ce mariage, crée d'abord ton compte
--  (voir README, étape "Créer ton accès admin"), puis exécute :
--
--    insert into public.event_admins (event_id, user_id, role)
--    select e.id, u.id, 'owner'
--    from public.events e, auth.users u
--    where e.slug = 'amaury-charlie' and u.email = 'ton.email@exemple.com'
--    on conflict do nothing;
-- ============================================================================
