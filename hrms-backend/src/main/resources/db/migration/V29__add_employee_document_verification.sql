ALTER TABLE public.employees
    ADD COLUMN document_verification_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED';

ALTER TABLE public.employee_documents
    ADD COLUMN review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN review_note VARCHAR(1000),
    ADD COLUMN reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN reviewed_by VARCHAR(255);

-- Existing employees must retain access when the attendance gate is introduced.
-- Only employees created after this migration begin the document onboarding flow.
UPDATE public.employees
SET document_verification_status = 'APPROVED';

UPDATE public.employee_documents
SET review_status = 'APPROVED',
    reviewed_at = CURRENT_TIMESTAMP,
    reviewed_by = 'SYSTEM_MIGRATION',
    review_note = 'Approved during document onboarding rollout';
