-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TENANT', 'LANDLORD', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "AdvertiserPlan" AS ENUM ('FREE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('ROOM', 'BEDSITTER', 'APARTMENT', 'HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'AVAILABLE_SOON', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "RentPeriod" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "UtilityArrangement" AS ENUM ('INCLUDED_IN_RENT', 'SEPARATE_METER', 'SHARED_SPLIT', 'NOT_AVAILABLE', 'ASK_ADVERTISER');

-- CreateEnum
CREATE TYPE "ChargeFrequency" AS ENUM ('ONE_TIME', 'MONTHLY');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('IDENTITY', 'ADVERTISER_ROLE', 'PROPERTY_EVIDENCE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'MORE_INFO_REQUIRED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID', 'SELFIE_WITH_ID', 'BUSINESS_LICENCE', 'OWNER_AUTHORIZATION_LETTER', 'MANAGEMENT_AGREEMENT', 'UTILITY_BILL', 'PROPERTY_OWNERSHIP_DOCUMENT', 'PROPERTY_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('IMPERSONATION', 'DUPLICATE_OR_MISLEADING', 'INCORRECT_PRICE_OR_AVAILABILITY', 'ADVANCE_PAYMENT_REQUEST', 'UNAUTHORIZED_ADVERTISING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'ACTION_TAKEN', 'DISMISSED', 'APPEALED');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('APPROVE_LISTING', 'REJECT_LISTING', 'SUSPEND_LISTING', 'REINSTATE_LISTING', 'SUSPEND_USER', 'REINSTATE_USER', 'CHANGE_ROLE', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'VERIFICATION_INFO_REQUESTED', 'VERIFICATION_EXPIRED', 'REPORT_UNDER_REVIEW', 'REPORT_INFO_REQUESTED', 'REPORT_ACTION_TAKEN', 'REPORT_DISMISSED');

-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('FEEDBACK', 'CONTACT');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'TENANT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "phoneNumber" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "suspendedReason" TEXT,
    "suspendedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "advertiser_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "agencyName" TEXT,
    "serviceRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactPhone" TEXT,
    "whatsappNumber" TEXT,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "plan" "AdvertiserPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "advertiser_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "streetAddress" TEXT,
    "latitude" DECIMAL(8,5),
    "longitude" DECIMAL(8,5),
    "currency" CHAR(3) NOT NULL DEFAULT 'TZS',
    "rentAmount" INTEGER NOT NULL,
    "rentPeriod" "RentPeriod" NOT NULL DEFAULT 'MONTHLY',
    "advanceMonths" INTEGER NOT NULL DEFAULT 1,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "agentFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "agentFeeNote" TEXT,
    "paymentTerms" TEXT,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "electricity" "UtilityArrangement" NOT NULL DEFAULT 'ASK_ADVERTISER',
    "water" "UtilityArrangement" NOT NULL DEFAULT 'ASK_ADVERTISER',
    "utilityNotes" TEXT,
    "contactPhone" TEXT,
    "contactWhatsapp" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "availableFrom" DATE,
    "availabilityConfirmedAt" TIMESTAMPTZ(3),
    "submittedAt" TIMESTAMPTZ(3),
    "publishedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_image" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_charge" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" "ChargeFrequency" NOT NULL,
    "note" TEXT,

    CONSTRAINT "property_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_property" (
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_property_pkey" PRIMARY KEY ("userId","propertyId")
);

-- CreateTable
CREATE TABLE "verification_request" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "propertyId" TEXT,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "applicantNote" TEXT,
    "reviewerId" TEXT,
    "decisionReason" TEXT,
    "scopeStatement" TEXT,
    "submittedAt" TIMESTAMPTZ(3),
    "decidedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_evidence" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgedAt" TIMESTAMPTZ(3),

    CONSTRAINT "verification_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_request" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "proposedAt" TIMESTAMPTZ(3) NOT NULL,
    "message" TEXT,
    "contactPhone" TEXT,
    "status" "ViewingStatus" NOT NULL DEFAULT 'PENDING',
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "viewing_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "propertyId" TEXT,
    "subjectUserId" TEXT,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assignedToId" TEXT,
    "publicResponse" TEXT,
    "internalNote" TEXT,
    "appealNote" TEXT,
    "appealedAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgedAt" TIMESTAMPTZ(3),

    CONSTRAINT "report_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_action" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "propertyId" TEXT,
    "targetUserId" TEXT,
    "reportId" TEXT,
    "verificationRequestId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL DEFAULT 'FEEDBACK',
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "rate_limit_windowStart_idx" ON "rate_limit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "advertiser_profile_userId_key" ON "advertiser_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "property_slug_key" ON "property"("slug");

-- CreateIndex
CREATE INDEX "property_status_region_district_idx" ON "property"("status", "region", "district");

-- CreateIndex
CREATE INDEX "property_status_propertyType_idx" ON "property"("status", "propertyType");

-- CreateIndex
CREATE INDEX "property_status_rentAmount_idx" ON "property"("status", "rentAmount");

-- CreateIndex
CREATE INDEX "property_status_bedrooms_idx" ON "property"("status", "bedrooms");

-- CreateIndex
CREATE INDEX "property_status_publishedAt_idx" ON "property"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "property_advertiserId_status_idx" ON "property"("advertiserId", "status");

-- CreateIndex
CREATE INDEX "property_image_propertyId_sortOrder_idx" ON "property_image"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "property_image_sha256_idx" ON "property_image"("sha256");

-- CreateIndex
CREATE INDEX "property_charge_propertyId_idx" ON "property_charge"("propertyId");

-- CreateIndex
CREATE INDEX "saved_property_propertyId_idx" ON "saved_property"("propertyId");

-- CreateIndex
CREATE INDEX "verification_request_status_submittedAt_idx" ON "verification_request"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "verification_request_subjectUserId_type_idx" ON "verification_request"("subjectUserId", "type");

-- CreateIndex
CREATE INDEX "verification_request_propertyId_idx" ON "verification_request"("propertyId");

-- CreateIndex
CREATE INDEX "verification_evidence_requestId_idx" ON "verification_evidence"("requestId");

-- CreateIndex
CREATE INDEX "viewing_request_requesterId_createdAt_idx" ON "viewing_request"("requesterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "viewing_request_advertiserId_status_idx" ON "viewing_request"("advertiserId", "status");

-- CreateIndex
CREATE INDEX "viewing_request_propertyId_idx" ON "viewing_request"("propertyId");

-- CreateIndex
CREATE INDEX "report_status_createdAt_idx" ON "report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "report_reporterId_createdAt_idx" ON "report"("reporterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "report_propertyId_idx" ON "report"("propertyId");

-- CreateIndex
CREATE INDEX "report_subjectUserId_idx" ON "report"("subjectUserId");

-- CreateIndex
CREATE INDEX "report_evidence_reportId_idx" ON "report_evidence"("reportId");

-- CreateIndex
CREATE INDEX "moderation_action_createdAt_idx" ON "moderation_action"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "moderation_action_propertyId_idx" ON "moderation_action"("propertyId");

-- CreateIndex
CREATE INDEX "moderation_action_targetUserId_idx" ON "moderation_action"("targetUserId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "analytics_event_name_createdAt_idx" ON "analytics_event"("name", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_event_propertyId_name_idx" ON "analytics_event"("propertyId", "name");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertiser_profile" ADD CONSTRAINT "advertiser_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property" ADD CONSTRAINT "property_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_image" ADD CONSTRAINT "property_image_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_charge" ADD CONSTRAINT "property_charge_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_property" ADD CONSTRAINT "saved_property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_property" ADD CONSTRAINT "saved_property_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_request" ADD CONSTRAINT "verification_request_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_request" ADD CONSTRAINT "verification_request_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_request" ADD CONSTRAINT "verification_request_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "verification_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_request" ADD CONSTRAINT "viewing_request_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_request" ADD CONSTRAINT "viewing_request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_request" ADD CONSTRAINT "viewing_request_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "verification_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Database-level integrity checks (application validation is enforced with Zod;
-- these constraints are a second line of defence). Prisma does not model CHECK
-- constraints, so they live only in migrations.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "property"
  ADD CONSTRAINT "property_currency_check" CHECK ("currency" = 'TZS'),
  ADD CONSTRAINT "property_rent_positive" CHECK ("rentAmount" > 0),
  ADD CONSTRAINT "property_deposit_nonnegative" CHECK ("depositAmount" >= 0),
  ADD CONSTRAINT "property_agent_fee_nonnegative" CHECK ("agentFeeAmount" >= 0),
  ADD CONSTRAINT "property_advance_months_range" CHECK ("advanceMonths" BETWEEN 0 AND 24),
  ADD CONSTRAINT "property_bedrooms_range" CHECK ("bedrooms" BETWEEN 0 AND 50),
  ADD CONSTRAINT "property_bathrooms_range" CHECK ("bathrooms" BETWEEN 0 AND 50),
  ADD CONSTRAINT "property_latitude_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "property_longitude_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "property_published_has_date" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);

ALTER TABLE "property_charge"
  ADD CONSTRAINT "property_charge_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "property_image"
  ADD CONSTRAINT "property_image_size_positive" CHECK ("sizeBytes" > 0);

ALTER TABLE "verification_evidence"
  ADD CONSTRAINT "verification_evidence_size_positive" CHECK ("sizeBytes" > 0);

ALTER TABLE "report_evidence"
  ADD CONSTRAINT "report_evidence_size_positive" CHECK ("sizeBytes" > 0);

ALTER TABLE "verification_request"
  ADD CONSTRAINT "verification_decided_has_date"
  CHECK ("status" NOT IN ('VERIFIED', 'REJECTED') OR "decidedAt" IS NOT NULL),
  ADD CONSTRAINT "verification_verified_has_scope"
  CHECK ("status" <> 'VERIFIED' OR "scopeStatement" IS NOT NULL),
  ADD CONSTRAINT "verification_property_scope"
  CHECK (("type" = 'PROPERTY_EVIDENCE') = ("propertyId" IS NOT NULL));

ALTER TABLE "rate_limit"
  ADD CONSTRAINT "rate_limit_count_positive" CHECK ("count" > 0);
