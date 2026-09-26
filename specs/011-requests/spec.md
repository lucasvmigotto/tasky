# 011 — Internal requests (demand hub)

> Status: Implemented (no dedicated e2e).

## Stories

1. **Intake**: create/search/edit requests with priority/status workflow,
   department routing, assignees, GLPI link.
2. **Work conversion**: link project/activity, bulk-create activities,
   convert request → project.
3. **Discussion**: request comments.
   - Evidence (all) [OBSERVED: `InternalRequestController.java:46-225`,
     `InternalRequestService`, `V19/V20`, key format `org+sequence`].

## Planned

- Intake forms / public submission channel.
