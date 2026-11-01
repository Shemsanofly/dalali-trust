-- Bring existing listings into line with the server's monthly-rent fee bands.
-- Property owners pay no agent fee.
UPDATE "property" AS p
SET "agentFeeAmount" = CASE
  WHEN u."role" <> 'AGENT' THEN 0
  WHEN p."rentAmount" < 50000 THEN ROUND(p."rentAmount"::numeric * 85 / 100)::integer
  WHEN p."rentAmount" < 100000 THEN ROUND(p."rentAmount"::numeric * 60 / 100)::integer
  WHEN p."rentAmount" < 500000 THEN ROUND(p."rentAmount"::numeric * 40 / 100)::integer
  WHEN p."rentAmount" < 1000000 THEN ROUND(p."rentAmount"::numeric * 25 / 100)::integer
  ELSE ROUND(p."rentAmount"::numeric * 10 / 100)::integer
END,
"agentFeeNote" = CASE WHEN u."role" = 'AGENT' THEN p."agentFeeNote" ELSE NULL END
FROM "user" AS u
WHERE p."advertiserId" = u."id";
