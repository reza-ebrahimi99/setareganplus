-- Idempotent seed of default achievement categories for all organizations.
-- Safe to run multiple times: only inserts missing slugs per organization.

INSERT INTO "achievement_categories" (
    "id",
    "organizationId",
    "name",
    "slug",
    "icon",
    "color",
    "displayOrder",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(o."id" || ':' || defaults.slug),
    o."id",
    defaults.name,
    defaults.slug,
    defaults.icon,
    defaults.color,
    defaults.display_order,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organizations" AS o
CROSS JOIN (
    VALUES
        ('gifted-admissions', 'پذیرش مدارس استعداد', 'star', '#0f766e', 0),
        ('olympiads', 'المپیادها', 'trophy', '#b45309', 1),
        ('competitions', 'مسابقات', 'flag', '#1d4ed8', 2),
        ('qalamchi', 'افتخارات قلم‌چی', 'book', '#7c3aed', 3),
        ('school-awards', 'جوایز مدرسه', 'award', '#be123c', 4),
        ('certificates', 'گواهی‌نامه‌ها', 'certificate', '#334155', 5),
        ('other', 'سایر', 'spark', '#475569', 6)
) AS defaults(slug, name, icon, color, display_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM "achievement_categories" AS ac
    WHERE ac."organizationId" = o."id"
      AND ac."slug" = defaults.slug
      AND ac."deletedAt" IS NULL
);
