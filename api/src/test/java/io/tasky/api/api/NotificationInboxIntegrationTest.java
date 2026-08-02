package io.tasky.api.api;

import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationInboxIntegrationTest extends BaseIntegrationTest {

    @Autowired private NotificationService notificationService;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private OrganizationService organizationService;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;

    private User firstUser;
    private User secondUser;
    private Organization firstOrg;
    private Organization secondOrg;
    private OrganizationMembership firstMembership;
    private OrganizationMembership secondMembership;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        firstUser = userService.createUser("notify-a-" + suffix + "@test.com", "notify-a-" + suffix, "User A", null);
        secondUser = userService.createUser("notify-b-" + suffix + "@test.com", "notify-b-" + suffix, "User B", null);
        firstOrg = organizationService.createOrganization("Notify A " + suffix, "notify-a-" + suffix, firstUser);
        secondOrg = organizationService.createOrganization("Notify B " + suffix, "notify-b-" + suffix, secondUser);
        firstMembership = membershipRepository.findByUserIdAndOrganizationId(firstUser.getId(), firstOrg.getId()).orElseThrow();
        secondMembership = membershipRepository.findByUserIdAndOrganizationId(secondUser.getId(), secondOrg.getId()).orElseThrow();
    }

    @AfterEach
    void cleanUp() {
        if (firstOrg != null) organizationRepository.delete(firstOrg);
        if (secondOrg != null) organizationRepository.delete(secondOrg);
        if (firstUser != null) userRepository.delete(firstUser);
        if (secondUser != null) userRepository.delete(secondUser);
    }

    @Test
    void duplicateEvent_isStoredOnce_andReadOperationsStayRecipientScoped() {
        UUID resourceId = UUID.randomUUID();
        String eventKey = "activity:" + resourceId + ":assigned";

        assertThat(notificationService.createOnce(firstOrg.getId(), firstMembership.getId(), eventKey,
                "ACTIVITY_ASSIGNED", "Nova atividade", "Revisar documento", "activity", resourceId)).isTrue();
        assertThat(notificationService.createOnce(firstOrg.getId(), firstMembership.getId(), eventKey,
                "ACTIVITY_ASSIGNED", "Nova atividade", "Revisar documento", "activity", resourceId)).isFalse();

        var notification = notificationService.list(firstMembership.getId()).getFirst();
        assertThat(notificationService.unread(firstMembership.getId())).isEqualTo(1);
        assertThat(notificationService.list(firstMembership.getId())).hasSize(1);
        assertThat(notificationService.list(secondMembership.getId())).isEmpty();

        assertThatThrownBy(() -> notificationService.markRead(secondMembership.getId(), notification.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Notification not found");
        assertThat(notificationService.unread(firstMembership.getId())).isEqualTo(1);

        assertThat(notificationService.markAllRead(firstMembership.getId())).isEqualTo(1);
        assertThat(notificationService.unread(firstMembership.getId())).isZero();
    }
}
