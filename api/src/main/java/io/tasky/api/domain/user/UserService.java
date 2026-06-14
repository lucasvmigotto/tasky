package io.tasky.api.domain.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

    public User getOrCreateUser(String email, String googleSub, String displayName, String avatarUrl) {
        return userRepository.findByGoogleSub(googleSub)
                .orElseGet(() -> userRepository.findByEmail(email)
                        .map(user -> {
                            user.setGoogleSub(googleSub);
                            if (displayName != null) user.setDisplayName(displayName);
                            if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
                            return userRepository.save(user);
                        })
                        .orElseGet(() -> createUser(email, googleSub, displayName, avatarUrl)));
    }

    public User createUser(String email, String googleSub, String displayName, String avatarUrl) {
        String prefix = email.split("@")[0];
        String username = generateUsername(prefix);
        User user = User.builder()
                .email(email)
                .username(username)
                .displayName(displayName)
                .googleSub(googleSub)
                .avatarUrl(avatarUrl)
                .isActive(true)
                .build();
        return userRepository.save(user);
    }

    private String generateUsername(String prefix) {
        String randomPart;
        do {
            randomPart = RANDOM.ints(8, 0, CHARS.length())
                    .mapToObj(CHARS::charAt)
                    .collect(StringBuilder::new, StringBuilder::append, StringBuilder::append)
                    .toString();
        } while (userRepository.existsByUsername(prefix + "#" + randomPart));

        return prefix + "#" + randomPart;
    }
}
