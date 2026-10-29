-- Seed: migrates the hardcoded BlogPage.tsx ARTICLES into the real
-- blog_posts CMS schema (src/database/supabase_schema.sql), so server-side
-- SSR (server.ts) and the public blog can read real per-article content and
-- metadata instead of a client-only localStorage mock (security/SEO audit 3.2).
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING / UPDATE).

ALTER TABLE public.blog_authors ADD COLUMN IF NOT EXISTS role_title text;

-- ---- blog_authors ----
INSERT INTO public.blog_authors (display_name, slug, photo_url, bio, role_title)
VALUES ('Sonia Benali', 'sonia-benali', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80', 'Spécialiste des structures de recrutement et de la préparation aux entretiens dans les secteurs tech et exécutif.', 'RÉDACTRICE & AUTEURE')
ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name, photo_url = EXCLUDED.photo_url, bio = EXCLUDED.bio, role_title = EXCLUDED.role_title;
INSERT INTO public.blog_authors (display_name, slug, photo_url, bio, role_title)
VALUES ('Claire Delamare', 'claire-delamare', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80', 'Experte en processus de sélection automatisés et refonte de candidatures exécutives.', 'CONSULTANTE RH & HEADHUNTER')
ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name, photo_url = EXCLUDED.photo_url, bio = EXCLUDED.bio, role_title = EXCLUDED.role_title;
INSERT INTO public.blog_authors (display_name, slug, photo_url, bio, role_title)
VALUES ('Marc-Antoine Sorel', 'marc-antoine-sorel', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', 'Accompagnateur de carrière spécialisé dans les outils digitaux et le personal branding.', 'LEAD CAREER COACH')
ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name, photo_url = EXCLUDED.photo_url, bio = EXCLUDED.bio, role_title = EXCLUDED.role_title;

-- ---- blog_categories ----
INSERT INTO public.blog_categories (name, slug)
VALUES ('Méthode & Entretien', 'methode-entretien')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.blog_categories (name, slug)
VALUES ('Guides de Rédaction', 'guides-de-redaction')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.blog_categories (name, slug)
VALUES ('Comparatifs', 'comparatifs')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.blog_categories (name, slug)
VALUES ('Entretien & Pitch', 'entretien-pitch')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.blog_categories (name, slug)
VALUES ('Gestion de Carrière', 'gestion-de-carriere')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- ---- blog_tags ----
INSERT INTO public.blog_tags (name, slug)
VALUES ('#MÉTHODE STAR', 'methode-star')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#ENTRETIEN', 'entretien')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#RECRUTEMENT', 'recrutement')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#PITCH', 'pitch')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#SCÉNARIO', 'scenario')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#ATS', 'ats')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#FORMATAGE', 'formatage')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#CV', 'cv')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#RH', 'rh')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#EFFICACITÉ', 'efficacite')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#COMPARATIF', 'comparatif')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#CVPILOT', 'cvpilot')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#CANVA', 'canva')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#WORD', 'word')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#OUTILS', 'outils')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#LETTRE', 'lettre')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#REDACTION', 'redaction')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#IA', 'ia')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#MOTIVATION', 'motivation')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#STORYTELLING', 'storytelling')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#CARRIÈRE', 'carriere')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#SNOB', 'snob')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#PORTFOLIO', 'portfolio')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#WEB', 'web')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#CANDIDATURE', 'candidature')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.blog_tags (name, slug)
VALUES ('#DIGITAL', 'digital')
ON CONFLICT (slug) DO NOTHING;

-- ---- blog_posts ----
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content, content_html,
  featured_image, featured_image_alt, seo_title, seo_description,
  reading_time_minutes, author_id, category_id, status, visibility,
  featured, locale, published_at
)
VALUES (
  'methode-star-entretien', 'Comprendre et Appliquer la Méthode STAR à votre Entretien', 'Décryptage étape par étape des 4 piliers comportementaux : de la Mise en Marge de la Situation au Résultat final.', 'Découvrez la méthodologie reine utilisée par Amazon, Google et les recruteurs internationaux pour structurer vos réponses avec brio.',
  '{"quote":"Créée pour structurer l''expression orale, la grille de lecture « STAR » est devenue l''une des méthodes d''analyse les plus populaires au monde pour le recrutement. Son secret ? Proposer un équilibre rythmique clair tout en laissant une liberté créative totale.","sections":[{"id":"pourquoi-star","title":"1. Pourquoi la méthode STAR séduit le Recrutement","content":"Répéter un CV sans relief ne suffit plus. Les grands cabinets de recrutement appliquent la méthode STAR de manière intuitive : une progression structurée en 4 temps forts qui matérialisent votre savoir-faire en illustrant un cheminement logique du début à la fin."},{"id":"piliers-decortiques","title":"2. Les 4 Piliers fondamentaux décortiqués","content":"Sur une présentation standard de 2 minutes lors d''une question comportementale, chaque étape doit occuper une proportion stratégique bien définie :","bullets":["• Situation (15%) : Mettez en place le cadre (projet, entreprise, contraintes temporelles).","• Tâche (15%) : Précisez votre responsabilité directe et l''objectif spécifique qui vous était confié.","• Action (50%) : Le cœur du récit ! Détaillez les démarches, outils et décisions que VOUS avez déployés.","• Résultat (20%) : Présentez des métriques chiffrées (chiffre d''affaires, temps gagné) et le bilan tiré."]},{"id":"phase-situation-tache","title":"3. Phase S & T : L''Ancien Monde et le Déclencheur","content":"Commencez par poser le contexte initial du problème sans vous perdre dans les détails techniques secondaires. L''interlocuteur doit immédiatement saisir l''enjeu stratégique et la tension opérationnelle de la situation."},{"id":"phase-action","title":"4. Phase A : L''Action Stratégique au Cœur du Pitch","content":"C''est l''étape où vous brillez. Mettez l''accent sur les choix individuels, la gestion de crise, l''utilisation d''outils modernes (IA, frameworks, méthodologies agiles) et la coordination de votre équipe."},{"id":"phase-resultat","title":"5. Phase R : La Réconciliation et l''Impact Mesurable","content":"Terminez toujours sur une note positive et quantifiée. Un bon résultat associe des métriques concrètes (ex: +30% d''efficacité) et un apprentissage durable réutilisable dans votre futur poste."},{"id":"conclusion","title":"En Conclusion","content":"Dans CVPilot, vous pouvez vous entraîner directement grâce au Simulateur d''Entretien IA qui évalue en temps réel la structure STAR de vos réponses orales et écrites."}]}'::jsonb, '<blockquote>Créée pour structurer l''expression orale, la grille de lecture « STAR » est devenue l''une des méthodes d''analyse les plus populaires au monde pour le recrutement. Son secret ? Proposer un équilibre rythmique clair tout en laissant une liberté créative totale.</blockquote>
<h2>1. Pourquoi la méthode STAR séduit le Recrutement</h2>
<p>Répéter un CV sans relief ne suffit plus. Les grands cabinets de recrutement appliquent la méthode STAR de manière intuitive : une progression structurée en 4 temps forts qui matérialisent votre savoir-faire en illustrant un cheminement logique du début à la fin.</p>
<h2>2. Les 4 Piliers fondamentaux décortiqués</h2>
<p>Sur une présentation standard de 2 minutes lors d''une question comportementale, chaque étape doit occuper une proportion stratégique bien définie :</p>
<ul>
<li>Situation (15%) : Mettez en place le cadre (projet, entreprise, contraintes temporelles).</li>
<li>Tâche (15%) : Précisez votre responsabilité directe et l''objectif spécifique qui vous était confié.</li>
<li>Action (50%) : Le cœur du récit ! Détaillez les démarches, outils et décisions que VOUS avez déployés.</li>
<li>Résultat (20%) : Présentez des métriques chiffrées (chiffre d''affaires, temps gagné) et le bilan tiré.</li>
</ul>
<h2>3. Phase S & T : L''Ancien Monde et le Déclencheur</h2>
<p>Commencez par poser le contexte initial du problème sans vous perdre dans les détails techniques secondaires. L''interlocuteur doit immédiatement saisir l''enjeu stratégique et la tension opérationnelle de la situation.</p>
<h2>4. Phase A : L''Action Stratégique au Cœur du Pitch</h2>
<p>C''est l''étape où vous brillez. Mettez l''accent sur les choix individuels, la gestion de crise, l''utilisation d''outils modernes (IA, frameworks, méthodologies agiles) et la coordination de votre équipe.</p>
<h2>5. Phase R : La Réconciliation et l''Impact Mesurable</h2>
<p>Terminez toujours sur une note positive et quantifiée. Un bon résultat associe des métriques concrètes (ex: +30% d''efficacité) et un apprentissage durable réutilisable dans votre futur poste.</p>
<h2>En Conclusion</h2>
<p>Dans CVPilot, vous pouvez vous entraîner directement grâce au Simulateur d''Entretien IA qui évalue en temps réel la structure STAR de vos réponses orales et écrites.</p>
',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80', 'Comprendre et Appliquer la Méthode STAR à votre Entretien', 'Comprendre et Appliquer la Méthode STAR à votre Entretien', 'Découvrez la méthodologie reine utilisée par Amazon, Google et les recruteurs internationaux pour structurer vos réponses avec brio.',
  6, (SELECT id FROM public.blog_authors WHERE slug = 'sonia-benali'),
  (SELECT id FROM public.blog_categories WHERE slug = 'methode-entretien'),
  'published', 'public', true, 'fr', '2026-06-01'::timestamptz
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content, content_html = EXCLUDED.content_html,
  featured_image = EXCLUDED.featured_image, featured_image_alt = EXCLUDED.featured_image_alt,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  reading_time_minutes = EXCLUDED.reading_time_minutes, author_id = EXCLUDED.author_id,
  category_id = EXCLUDED.category_id, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id FROM public.blog_posts p, public.blog_tags t
WHERE p.slug = 'methode-star-entretien' AND t.slug IN ('methode-star', 'entretien', 'recrutement', 'pitch', 'scenario')
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content, content_html,
  featured_image, featured_image_alt, seo_title, seo_description,
  reading_time_minutes, author_id, category_id, status, visibility,
  featured, locale, published_at
)
VALUES (
  'guide-ultime-cv-ats', 'Le Guide Ultime du Formatage de CV (Standard ATS & Europe)', 'Toutes les normes typographiques, structures et stratégies de mots-clés pour réussir le passage des filtres de recrutement.', 'Règles typographiques, marges, gestion des mots-clés et pièges à éviter : tout ce que vous devez savoir pour un CV 100% lisible par les robots ATS.',
  '{"quote":"Plus de 85% des entreprises utilisent un ATS pour trier les candidatures. Un CV mal formaté peut être rejeté avant d''être lu par un humain.","sections":[{"id":"structure-tech","title":"1. La Structure Technique Indispensable","content":"Privilégiez les polices système sans empattement (Inter, Arial, Helvetica) avec une taille minimale de 10.5pt. Évitez les tableaux complexes, les zones de texte flottantes et les illustrations vectorielles non indexables."},{"id":"mots-cles","title":"2. L''Art de l''Optimisation des Mots-Clés","content":"Analysez la fiche de poste. Identifiez les compétences requises et répétez-les naturellement au sein de vos descriptions d''expériences."},{"id":"quantification","title":"3. La Quantification Systématique des Succès","content":"Chaque puce de votre CV doit comporter un verbe d''action et une métrique chiffrée (ex: ''Optimisation du tunnel de vente (+24% de conversion)'')."},{"id":"conclusion","title":"En Conclusion","content":"En générant votre CV sur CVPilot, vous bénéficiez d''une conformité ATS native garantie sur tous les formats d''exportation PDF."}]}'::jsonb, '<blockquote>Plus de 85% des entreprises utilisent un ATS pour trier les candidatures. Un CV mal formaté peut être rejeté avant d''être lu par un humain.</blockquote>
<h2>1. La Structure Technique Indispensable</h2>
<p>Privilégiez les polices système sans empattement (Inter, Arial, Helvetica) avec une taille minimale de 10.5pt. Évitez les tableaux complexes, les zones de texte flottantes et les illustrations vectorielles non indexables.</p>
<h2>2. L''Art de l''Optimisation des Mots-Clés</h2>
<p>Analysez la fiche de poste. Identifiez les compétences requises et répétez-les naturellement au sein de vos descriptions d''expériences.</p>
<h2>3. La Quantification Systématique des Succès</h2>
<p>Chaque puce de votre CV doit comporter un verbe d''action et une métrique chiffrée (ex: ''Optimisation du tunnel de vente (+24% de conversion)'').</p>
<h2>En Conclusion</h2>
<p>En générant votre CV sur CVPilot, vous bénéficiez d''une conformité ATS native garantie sur tous les formats d''exportation PDF.</p>
',
  'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80', 'Le Guide Ultime du Formatage de CV (Standard ATS & Europe)', 'Le Guide Ultime du Formatage de CV (Standard ATS & Europe)', 'Règles typographiques, marges, gestion des mots-clés et pièges à éviter : tout ce que vous devez savoir pour un CV 100% lisible par les robots ATS.',
  8, (SELECT id FROM public.blog_authors WHERE slug = 'claire-delamare'),
  (SELECT id FROM public.blog_categories WHERE slug = 'guides-de-redaction'),
  'published', 'public', false, 'fr', '2026-06-15'::timestamptz
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content, content_html = EXCLUDED.content_html,
  featured_image = EXCLUDED.featured_image, featured_image_alt = EXCLUDED.featured_image_alt,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  reading_time_minutes = EXCLUDED.reading_time_minutes, author_id = EXCLUDED.author_id,
  category_id = EXCLUDED.category_id, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id FROM public.blog_posts p, public.blog_tags t
WHERE p.slug = 'guide-ultime-cv-ats' AND t.slug IN ('ats', 'formatage', 'cv', 'rh', 'efficacite')
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content, content_html,
  featured_image, featured_image_alt, seo_title, seo_description,
  reading_time_minutes, author_id, category_id, status, visibility,
  featured, locale, published_at
)
VALUES (
  'cvpilot-vs-canva-word', 'CVPilot vs Canva & Word : Le Comparatif Complet 2026', 'Analyse comparative approfondie entre les traitements de texte, les éditeurs graphiques et la plateforme IA dédiée.', 'Découvrez pourquoi les modèles Canva échouent aux tests ATS et comment Word génère des décalages de mise en page récurrents.',
  '{"quote":"Le design ne doit jamais se faire au détriment de la lisibilité algorithmique. CVPilot allie l''élégance visuelle à la rigueur technique.","sections":[{"id":"limites-canva","title":"1. Les Limites Cachées de Canva pour le Recrutement","content":"Canva est un excellent outil de création graphique mais transforme souvent le texte en blocs d''images invisibles pour les logiciels de tri ATS."},{"id":"problemes-word","title":"2. Les Inconvénients de Word et des Fichiers .DOCX","content":"Word génère régulièrement des sauts de page imprévus et des polices décalées selon le système d''exploitation du recruteur."},{"id":"solution-cvpilot","title":"3. L''Approche CVPilot : Allier Design et Compatibilité","content":"CVPilot génère automatiquement un PDF vectoriel épuré, structuré de façon sémantique et parfaitement lisible sur ordinateur et mobile."},{"id":"conclusion","title":"En Conclusion","content":"Adoptez la solution construite spécialement pour la recherche d''emploi et multipliez vos chances de sélection dès aujourd''hui."}]}'::jsonb, '<blockquote>Le design ne doit jamais se faire au détriment de la lisibilité algorithmique. CVPilot allie l''élégance visuelle à la rigueur technique.</blockquote>
<h2>1. Les Limites Cachées de Canva pour le Recrutement</h2>
<p>Canva est un excellent outil de création graphique mais transforme souvent le texte en blocs d''images invisibles pour les logiciels de tri ATS.</p>
<h2>2. Les Inconvénients de Word et des Fichiers .DOCX</h2>
<p>Word génère régulièrement des sauts de page imprévus et des polices décalées selon le système d''exploitation du recruteur.</p>
<h2>3. L''Approche CVPilot : Allier Design et Compatibilité</h2>
<p>CVPilot génère automatiquement un PDF vectoriel épuré, structuré de façon sémantique et parfaitement lisible sur ordinateur et mobile.</p>
<h2>En Conclusion</h2>
<p>Adoptez la solution construite spécialement pour la recherche d''emploi et multipliez vos chances de sélection dès aujourd''hui.</p>
',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80', 'CVPilot vs Canva & Word : Le Comparatif Complet 2026', 'CVPilot vs Canva & Word : Le Comparatif Complet 2026', 'Découvrez pourquoi les modèles Canva échouent aux tests ATS et comment Word génère des décalages de mise en page récurrents.',
  5, (SELECT id FROM public.blog_authors WHERE slug = 'marc-antoine-sorel'),
  (SELECT id FROM public.blog_categories WHERE slug = 'comparatifs'),
  'published', 'public', false, 'fr', '2026-06-10'::timestamptz
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content, content_html = EXCLUDED.content_html,
  featured_image = EXCLUDED.featured_image, featured_image_alt = EXCLUDED.featured_image_alt,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  reading_time_minutes = EXCLUDED.reading_time_minutes, author_id = EXCLUDED.author_id,
  category_id = EXCLUDED.category_id, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id FROM public.blog_posts p, public.blog_tags t
WHERE p.slug = 'cvpilot-vs-canva-word' AND t.slug IN ('comparatif', 'cvpilot', 'canva', 'word', 'outils')
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content, content_html,
  featured_image, featured_image_alt, seo_title, seo_description,
  reading_time_minutes, author_id, category_id, status, visibility,
  featured, locale, published_at
)
VALUES (
  'rediger-bible-lettre-motivation', 'Comment Rédiger une Lettre de Motivation Captivante avec l''IA', 'Passez d''une formule d''accroche banale à un pitch personnalisé qui suscite l''enthousiasme immédiat du recruteur.', 'Transformez vos lettres de motivation génériques en histoires ciblées grâce aux modèles de rédaction intelligents CVPilot.',
  '{"quote":"La lettre de motivation doit répondre à la question : ''Pourquoi nous, pourquoi vous, et pourquoi maintenant ?''","sections":[{"id":"structure-lettre","title":"1. La Règle du Vous - Moi - Nous","content":"Commencez par parler de l''entreprise (VOUS), enchaînez sur ce que vous apportez (MOI), et terminez par la synergie créée (NOUS)."},{"id":"accroche","title":"2. Bâtir une Accroche Imparable","content":"Évitez les banalités (''Je vous adresse ma candidature...''). Évoquez directement un projet récent ou un enjeu actuel de l''entreprise."},{"id":"conclusion","title":"En Conclusion","content":"Utilisez le module IA de CVPilot pour générer en un clic une lettre parfaitement harmonisée avec votre CV."}]}'::jsonb, '<blockquote>La lettre de motivation doit répondre à la question : ''Pourquoi nous, pourquoi vous, et pourquoi maintenant ?''</blockquote>
<h2>1. La Règle du Vous - Moi - Nous</h2>
<p>Commencez par parler de l''entreprise (VOUS), enchaînez sur ce que vous apportez (MOI), et terminez par la synergie créée (NOUS).</p>
<h2>2. Bâtir une Accroche Imparable</h2>
<p>Évitez les banalités (''Je vous adresse ma candidature...''). Évoquez directement un projet récent ou un enjeu actuel de l''entreprise.</p>
<h2>En Conclusion</h2>
<p>Utilisez le module IA de CVPilot pour générer en un clic une lettre parfaitement harmonisée avec votre CV.</p>
',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80', 'Comment Rédiger une Lettre de Motivation Captivante avec l''IA', 'Comment Rédiger une Lettre de Motivation Captivante avec l''IA', 'Transformez vos lettres de motivation génériques en histoires ciblées grâce aux modèles de rédaction intelligents CVPilot.',
  7, (SELECT id FROM public.blog_authors WHERE slug = 'marc-antoine-sorel'),
  (SELECT id FROM public.blog_categories WHERE slug = 'guides-de-redaction'),
  'published', 'public', false, 'fr', '2026-05-25'::timestamptz
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content, content_html = EXCLUDED.content_html,
  featured_image = EXCLUDED.featured_image, featured_image_alt = EXCLUDED.featured_image_alt,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  reading_time_minutes = EXCLUDED.reading_time_minutes, author_id = EXCLUDED.author_id,
  category_id = EXCLUDED.category_id, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id FROM public.blog_posts p, public.blog_tags t
WHERE p.slug = 'rediger-bible-lettre-motivation' AND t.slug IN ('lettre', 'redaction', 'ia', 'motivation')
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content, content_html,
  featured_image, featured_image_alt, seo_title, seo_description,
  reading_time_minutes, author_id, category_id, status, visibility,
  featured, locale, published_at
)
VALUES (
  'creer-arcs-d-experiences', 'Créer des Arcs de Personnages Professionnels : Conflit Interne vs Objectif Externe', 'La chimie psychologique pour intéresser vos interlocuteurs : structurer votre parcours comme un récit inspirant.', 'Découvrez comment présenter votre trajectoire et vos reconversions sous forme de progression cohérente et captivante.',
  '{"quote":"Les gens n''achètent pas ce que vous faites, ils achètent pourquoi vous le faites. Appliquez ce principe à votre pitch de carrière.","sections":[{"id":"storytelling-pro","title":"1. Le Storytelling Appliqué au Recrutement","content":"Chaque transition professionnelle répond à un objectif. Présentez vos virages de carrière comme des choix stratégiques d''apprentissage."},{"id":"conflit-interne","title":"2. Mettre en Valeur le Dépassement de Soi","content":"Expliquez comment vous avez surmonté des défis complexes pour acquérir vos compétences actuelles."},{"id":"conclusion","title":"En Conclusion","content":"Construisez votre argumentaire avec clarté pour captiver les décideurs lors de vos entretiens."}]}'::jsonb, '<blockquote>Les gens n''achètent pas ce que vous faites, ils achètent pourquoi vous le faites. Appliquez ce principe à votre pitch de carrière.</blockquote>
<h2>1. Le Storytelling Appliqué au Recrutement</h2>
<p>Chaque transition professionnelle répond à un objectif. Présentez vos virages de carrière comme des choix stratégiques d''apprentissage.</p>
<h2>2. Mettre en Valeur le Dépassement de Soi</h2>
<p>Expliquez comment vous avez surmonté des défis complexes pour acquérir vos compétences actuelles.</p>
<h2>En Conclusion</h2>
<p>Construisez votre argumentaire avec clarté pour captiver les décideurs lors de vos entretiens.</p>
',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80', 'Créer des Arcs de Personnages Professionnels : Conflit Interne vs Objectif Externe', 'Créer des Arcs de Personnages Professionnels : Conflit Interne vs Objectif Externe', 'Découvrez comment présenter votre trajectoire et vos reconversions sous forme de progression cohérente et captivante.',
  6, (SELECT id FROM public.blog_authors WHERE slug = 'claire-delamare'),
  (SELECT id FROM public.blog_categories WHERE slug = 'entretien-pitch'),
  'published', 'public', false, 'fr', '2026-05-18'::timestamptz
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content, content_html = EXCLUDED.content_html,
  featured_image = EXCLUDED.featured_image, featured_image_alt = EXCLUDED.featured_image_alt,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  reading_time_minutes = EXCLUDED.reading_time_minutes, author_id = EXCLUDED.author_id,
  category_id = EXCLUDED.category_id, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id FROM public.blog_posts p, public.blog_tags t
WHERE p.slug = 'creer-arcs-d-experiences' AND t.slug IN ('pitch', 'storytelling', 'carriere', 'snob')
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content, content_html,
  featured_image, featured_image_alt, seo_title, seo_description,
  reading_time_minutes, author_id, category_id, status, visibility,
  featured, locale, published_at
)
VALUES (
  'portfolio-web-candidat', 'Pourquoi et Comment Créer un Portfolio Web Interactif en 2026', 'Démarquez-vous de 99% des candidats en accompagnant votre CV PDF d''une page web dynamique et sécurisée.', 'Un lien interactif vers vos réalisations augmente le taux de retour des recruteurs de plus de 40%.',
  '{"quote":"Le CV montre ce que vous avez fait. Le Portfolio Web prouve ce que vous êtes capable de produire aujourd''hui.","sections":[{"id":"avantage-portfolio","title":"1. L''Impact d''un Portfolio Numérique","content":"Proposer un site vitrine sobre permet aux recruteurs de visualiser vos projets réels en haute résolution."},{"id":"integration-cvpilot","title":"2. Génération Automatique via CVPilot","content":"En un clic, CVPilot convertit la structure de votre CV en une page web réactive et hébergée en toute sécurité."},{"id":"conclusion","title":"En Conclusion","content":"Combinez CV PDF et Portfolio Web pour maximiser votre impact auprès des employeurs."}]}'::jsonb, '<blockquote>Le CV montre ce que vous avez fait. Le Portfolio Web prouve ce que vous êtes capable de produire aujourd''hui.</blockquote>
<h2>1. L''Impact d''un Portfolio Numérique</h2>
<p>Proposer un site vitrine sobre permet aux recruteurs de visualiser vos projets réels en haute résolution.</p>
<h2>2. Génération Automatique via CVPilot</h2>
<p>En un clic, CVPilot convertit la structure de votre CV en une page web réactive et hébergée en toute sécurité.</p>
<h2>En Conclusion</h2>
<p>Combinez CV PDF et Portfolio Web pour maximiser votre impact auprès des employeurs.</p>
',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80', 'Pourquoi et Comment Créer un Portfolio Web Interactif en 2026', 'Pourquoi et Comment Créer un Portfolio Web Interactif en 2026', 'Un lien interactif vers vos réalisations augmente le taux de retour des recruteurs de plus de 40%.',
  5, (SELECT id FROM public.blog_authors WHERE slug = 'sonia-benali'),
  (SELECT id FROM public.blog_categories WHERE slug = 'gestion-de-carriere'),
  'published', 'public', false, 'fr', '2026-05-10'::timestamptz
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content, content_html = EXCLUDED.content_html,
  featured_image = EXCLUDED.featured_image, featured_image_alt = EXCLUDED.featured_image_alt,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  reading_time_minutes = EXCLUDED.reading_time_minutes, author_id = EXCLUDED.author_id,
  category_id = EXCLUDED.category_id, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id FROM public.blog_posts p, public.blog_tags t
WHERE p.slug = 'portfolio-web-candidat' AND t.slug IN ('portfolio', 'web', 'candidature', 'digital')
ON CONFLICT DO NOTHING;

