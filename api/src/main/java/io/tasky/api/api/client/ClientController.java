package io.tasky.api.api.client;

import io.tasky.api.domain.client.Client;
import io.tasky.api.domain.client.ClientService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{orgId}/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<ClientResponse>> list(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId) || permissionService.getMembership(user.id(), activeOrgId).isEmpty()) {
            throw new SecurityException("Not a member of this organization");
        }
        List<Client> clients = clientService.getClientsByOrganization(activeOrgId);
        return ResponseEntity.ok(clients.stream().map(this::toResponse).toList());
    }

    @PostMapping
    @PreAuthorize("@access.isManagerOrAdminOfOrganization(authentication.principal, #orgId)")
    public ResponseEntity<ClientResponse> create(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateClientRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        Client client = clientService.createClient(activeOrgId, request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(client));
    }

    @PutMapping("/{clientId}")
    @PreAuthorize("@access.isManagerOrAdminOfOrganization(authentication.principal, #orgId)")
    public ResponseEntity<ClientResponse> update(
            @PathVariable UUID orgId,
            @PathVariable UUID clientId,
            @Valid @RequestBody CreateClientRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        Client client = clientService.renameClient(activeOrgId, clientId, request.name());
        return ResponseEntity.ok(toResponse(client));
    }

    @DeleteMapping("/{clientId}")
    @PreAuthorize("@access.isManagerOrAdminOfOrganization(authentication.principal, #orgId)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID orgId,
            @PathVariable UUID clientId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        clientService.deleteClient(activeOrgId, clientId);
        return ResponseEntity.noContent().build();
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private ClientResponse toResponse(Client client) {
        return new ClientResponse(
                client.getId(),
                client.getOrganization().getId(),
                client.getName(),
                client.getCreatedAt()
        );
    }
}
