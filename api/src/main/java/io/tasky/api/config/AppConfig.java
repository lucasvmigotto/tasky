package io.tasky.api.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import javax.sql.DataSource;
import java.util.Optional;
import java.util.UUID;

@Configuration
@EnableConfigurationProperties(TaskYProperties.class)
public class AppConfig {

    @Bean
    public Flyway flyway(DataSource dataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();
        flyway.migrate();
        return flyway;
    }

    @Bean
    public AuditorAware<UUID> auditorAware() {
        return Optional::empty;
    }

    public static final java.util.List<Short> FIBONACCI_WEIGHTS =
            java.util.List.of((short) 1, (short) 2, (short) 3, (short) 5, (short) 8, (short) 13);

    public static boolean isValidFibonacciWeight(short weight) {
        return FIBONACCI_WEIGHTS.contains(weight);
    }
}
