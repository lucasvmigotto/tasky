CREATE TABLE department_member_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_department_member_types_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT uq_department_member_types_department_name
        UNIQUE (department_id, name)
);

ALTER TABLE organization_memberships
    ADD COLUMN member_type_id UUID,
    ADD CONSTRAINT fk_memberships_member_type
        FOREIGN KEY (member_type_id) REFERENCES department_member_types(id) ON DELETE SET NULL;

CREATE INDEX idx_department_member_types_department_id
    ON department_member_types(department_id);
