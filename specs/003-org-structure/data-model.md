# 003 — Data model

- `departments`: org FK, name.
- `department_member_types`: dept FK, unique (dept, name), isActive.
- `membership_member_types`: composite PK (membership, type).
- `manager_departments`: composite PK, management scope links.
