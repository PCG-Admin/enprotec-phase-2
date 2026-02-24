-- Step 1: Convert workflow_requests.department from ENUM to TEXT
ALTER TABLE public.en_workflow_requests ADD COLUMN department_temp TEXT;
UPDATE public.en_workflow_requests SET department_temp = department::text;
ALTER TABLE public.en_workflow_requests DROP COLUMN department CASCADE;
ALTER TABLE public.en_workflow_requests RENAME COLUMN department_temp TO department;
ALTER TABLE public.en_workflow_requests ALTER COLUMN department SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_workflow_requests_department ON public.en_workflow_requests(department);
ALTER TABLE public.en_workflow_requests ADD CONSTRAINT fk_workflow_requests_department FOREIGN KEY (department) REFERENCES public.en_departments(code) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 2: Convert salvage_requests.source_department from ENUM to TEXT
ALTER TABLE public.en_salvage_requests ADD COLUMN source_department_temp TEXT;
UPDATE public.en_salvage_requests SET source_department_temp = source_department::text WHERE source_department IS NOT NULL;
ALTER TABLE public.en_salvage_requests DROP COLUMN source_department CASCADE;
ALTER TABLE public.en_salvage_requests RENAME COLUMN source_department_temp TO source_department;
ALTER TABLE public.en_salvage_requests ADD CONSTRAINT fk_salvage_requests_source_department FOREIGN KEY (source_department) REFERENCES public.en_departments(code) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: Drop the ENUM type (CASCADE will handle view dependencies)
DROP TYPE IF EXISTS public.department CASCADE;
