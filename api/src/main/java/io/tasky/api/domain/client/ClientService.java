package io.tasky.api.domain.client;

import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final OrganizationRepository organizationRepository;

    public Client createClient(UUID organizationId, String name) {
        if (clientRepository.existsByOrganizationIdAndName(organizationId, name)) {
            throw new IllegalArgumentException("Client name already exists in this organization");
        }
        Organization org = organizationRepository.getReferenceById(organizationId);
        Client client = Client.builder()
                .organization(org)
                .name(name)
                .build();
        return clientRepository.save(client);
    }

    public List<Client> getClientsByOrganization(UUID organizationId) {
        return clientRepository.findByOrganizationId(organizationId);
    }

    public Client renameClient(UUID organizationId, UUID clientId, String name) {
        Client client = clientRepository.findByIdAndOrganizationId(clientId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        if (name != null && !name.isBlank() && !name.equals(client.getName())) {
            if (clientRepository.existsByOrganizationIdAndName(organizationId, name)) {
                throw new IllegalArgumentException("Client name already exists in this organization");
            }
            client.setName(name);
        }
        return clientRepository.save(client);
    }

    public void deleteClient(UUID organizationId, UUID clientId) {
        Client client = clientRepository.findByIdAndOrganizationId(clientId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        clientRepository.delete(client);
    }
}
