package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final TaskYProperties properties;
    private final Environment environment;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/api/v1/auth/**").permitAll()
                            .requestMatchers("/actuator/health").permitAll()
                            .requestMatchers("/actuator/**").denyAll();
                    if (!isProd) {
                        auth.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs/**").permitAll();
                    } else {
                        auth.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs/**").denyAll();
                    }
                    auth.anyRequest().authenticated();
                })
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"error\":\"Unauthorized\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"error\":\"Forbidden\"}");
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = properties.cors().allowedOrigins();
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");

        if (origins == null || origins.isEmpty() || origins.stream().allMatch(origin -> origin == null || origin.isBlank())) {
            if (isProd) {
                throw new IllegalStateException(
                        "CORS origin is required in prod; set APP_CORS_ALLOWED_ORIGINS");
            }
            origins = List.of("http://localhost:5173");
        }

        origins = origins.stream().map(this::validateOrigin).toList();

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private String validateOrigin(String origin) {
        if (origin == null || origin.isBlank() || origin.trim().equals("*")) {
            throw new IllegalStateException("CORS origins must be explicit HTTP(S) origins");
        }

        String normalized = origin.trim();
        try {
            URI uri = new URI(normalized);
            boolean validScheme = "http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme());
            boolean hasOnlyOriginComponents = uri.getHost() != null
                    && uri.getUserInfo() == null
                    && (uri.getPath() == null || uri.getPath().isEmpty())
                    && uri.getQuery() == null
                    && uri.getFragment() == null;
            if (!validScheme || !hasOnlyOriginComponents) {
                throw new IllegalStateException("Invalid CORS origin: " + normalized);
            }
            return normalized;
        } catch (URISyntaxException exception) {
            throw new IllegalStateException("Invalid CORS origin: " + normalized, exception);
        }
    }
}
