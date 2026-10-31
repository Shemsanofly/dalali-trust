-- Remove the development-label prefix from existing names, titles, and notifications.
BEGIN;

UPDATE "user"
SET "name" = regexp_replace("name", '\[SAMPLE\][[:blank:]]*', '', 'gi')
WHERE "name" ~* '\[SAMPLE\]';

UPDATE "advertiser_profile"
SET "displayName" = regexp_replace("displayName", '\[SAMPLE\][[:blank:]]*', '', 'gi')
WHERE "displayName" ~* '\[SAMPLE\]';

UPDATE "property"
SET "title" = regexp_replace("title", '\[SAMPLE\][[:blank:]]*', '', 'gi')
WHERE "title" ~* '\[SAMPLE\]';

UPDATE "notification"
SET "body" = regexp_replace("body", '\[SAMPLE\][[:blank:]]*', '', 'gi')
WHERE "body" ~* '\[SAMPLE\]';

UPDATE "notification"
SET "data" = regexp_replace("data"::text, '\[SAMPLE\][[:blank:]]*', '', 'gi')::jsonb
WHERE "data"::text ~* '\[SAMPLE\]';

COMMIT;
