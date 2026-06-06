CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_organizations_slug UNIQUE (slug)
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_departments_org_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_departments_organization_id ON departments(organization_id);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_teams_department_name UNIQUE (department_id, name)
);
CREATE INDEX idx_teams_department_id ON teams(department_id);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(255),
    google_sub VARCHAR(255),
    avatar_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_google_sub UNIQUE (google_sub)
);

CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'leader', 'employee')),
    custom_username VARCHAR(100),
    max_daily_work_minutes INTEGER NOT NULL DEFAULT 480,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_memberships_user_org UNIQUE (user_id, organization_id)
);
CREATE INDEX idx_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_memberships_organization_id ON organization_memberships(organization_id);

CREATE TABLE manager_departments (
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (membership_id, department_id)
);
CREATE INDEX idx_manager_departments_department_id ON manager_departments(department_id);

CREATE TABLE leader_teams (
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (membership_id, team_id)
);
CREATE INDEX idx_leader_teams_team_id ON leader_teams(team_id);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_membership_id UUID NOT NULL REFERENCES organization_memberships(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_projects_department_name UNIQUE (department_id, name)
);
CREATE INDEX idx_projects_department_id ON projects(department_id);
CREATE INDEX idx_projects_manager_membership_id ON projects(manager_membership_id);

CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_assignments UNIQUE (project_id, membership_id)
);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_membership_id ON project_assignments(membership_id);

CREATE TABLE cross_department_project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES organization_memberships(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_cross_dept_access UNIQUE (project_id, department_id)
);
CREATE INDEX idx_cross_dept_access_project_id ON cross_department_project_access(project_id);
CREATE INDEX idx_cross_dept_access_department_id ON cross_department_project_access(department_id);

CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES organization_memberships(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_labels_org_slug UNIQUE (organization_id, slug)
);
CREATE INDEX idx_labels_organization_id ON labels(organization_id);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    weight SMALLINT NOT NULL DEFAULT 1 CHECK (weight IN (1, 2, 3, 5, 8, 13)),
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES organization_memberships(id),
    assigned_to UUID NOT NULL REFERENCES organization_memberships(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_activities_datetime CHECK (start_datetime < end_datetime)
);
CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_created_by ON activities(created_by);
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX idx_activities_start_datetime ON activities(start_datetime);
CREATE INDEX idx_activities_end_datetime ON activities(end_datetime);

CREATE TABLE activity_labels (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, label_id)
);
CREATE INDEX idx_activity_labels_label_id ON activity_labels(label_id);

CREATE TABLE activity_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    child_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    CONSTRAINT uq_activity_dependencies UNIQUE (parent_activity_id, child_activity_id),
    CONSTRAINT chk_no_self_dependency CHECK (parent_activity_id <> child_activity_id)
);
CREATE INDEX idx_activity_dependencies_parent ON activity_dependencies(parent_activity_id);
CREATE INDEX idx_activity_dependencies_child ON activity_dependencies(child_activity_id);
