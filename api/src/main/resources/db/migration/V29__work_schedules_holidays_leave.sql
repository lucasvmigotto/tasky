CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_work_schedules_org_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_work_schedules_organization_id ON work_schedules(organization_id);
CREATE UNIQUE INDEX uq_work_schedules_org_default ON work_schedules(organization_id) WHERE is_default;

CREATE TABLE work_schedule_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_schedule_id UUID NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    is_work_day BOOLEAN NOT NULL DEFAULT true,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_work_schedule_days_schedule_dow UNIQUE (work_schedule_id, day_of_week),
    CONSTRAINT chk_work_schedule_days_range CHECK (
        is_work_day = false OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);
CREATE INDEX idx_work_schedule_days_schedule_id ON work_schedule_days(work_schedule_id);

CREATE TABLE membership_work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    work_schedule_id UUID NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    valid_range DATERANGE GENERATED ALWAYS AS (
        daterange(effective_from, COALESCE(effective_to + 1, DATE 'infinity'), '[)')
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_membership_work_schedules_range CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT ex_membership_work_schedules_no_overlap
        EXCLUDE USING gist (membership_id WITH =, valid_range WITH &&)
);
CREATE INDEX idx_membership_work_schedules_organization_id ON membership_work_schedules(organization_id);
CREATE INDEX idx_membership_work_schedules_schedule_id ON membership_work_schedules(work_schedule_id);

CREATE TABLE organization_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    is_recurring_yearly BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_holidays_org_date UNIQUE (organization_id, holiday_date)
);
CREATE INDEX idx_organization_holidays_org_date ON organization_holidays(organization_id, holiday_date);

CREATE TABLE membership_leave_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note VARCHAR(255),
    valid_range DATERANGE GENERATED ALWAYS AS (
        daterange(start_date, end_date + 1, '[)')
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_membership_leave_periods_range CHECK (end_date >= start_date),
    CONSTRAINT chk_membership_leave_periods_type CHECK (leave_type IN ('VACATION', 'SICK', 'PARENTAL', 'UNPAID', 'OTHER')),
    CONSTRAINT chk_membership_leave_periods_status CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED')),
    CONSTRAINT ex_membership_leave_periods_no_overlap
        EXCLUDE USING gist (membership_id WITH =, valid_range WITH &&)
);
CREATE INDEX idx_membership_leave_periods_organization_id ON membership_leave_periods(organization_id);
CREATE INDEX idx_membership_leave_periods_membership_id ON membership_leave_periods(membership_id);
