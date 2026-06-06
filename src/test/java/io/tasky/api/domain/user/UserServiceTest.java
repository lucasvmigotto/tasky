package io.tasky.api.domain.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getOrCreateUser_createsNewUser() {
        when(userRepository.findByGoogleSub("google123")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User user = userService.getOrCreateUser("test@gmail.com", "google123", "Test User", "https://avatar.url");

        assertNotNull(user);
        assertEquals("test@gmail.com", user.getEmail());
        assertEquals("google123", user.getGoogleSub());
        assertTrue(user.getUsername().startsWith("test#"));
        assertEquals(8, user.getUsername().length() - "test#".length());
        assertTrue(user.isActive());
    }

    @Test
    void getOrCreateUser_returnsExistingByGoogleSub() {
        User existing = User.builder()
                .id(UUID.randomUUID())
                .email("test@gmail.com")
                .username("test#abc12345")
                .googleSub("google123")
                .isActive(true)
                .build();

        when(userRepository.findByGoogleSub("google123")).thenReturn(Optional.of(existing));

        User result = userService.getOrCreateUser("test@gmail.com", "google123", "New Name", null);

        assertSame(existing, result);
        verify(userRepository, never()).save(any());
    }
}
