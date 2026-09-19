package io.tasky.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cache.interceptor.KeyGenerator;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * PHASE 7: Redis cache for expensive read models. Fail-open by design:
 * a down Redis degrades to direct queries, never to errors. Only
 * summary dashboards are cached (30s); detailed rows and CSV exports
 * always read fresh data.
 */
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    public static final String REPORT_SUMMARY = "report-summary";

    @Value("${tasky.cache.report-summary-ttl:PT30S}")
    private Duration reportSummaryTtl;

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Response DTOs are records (not JDK-Serializable): JSON values.
        // Local mapper (no shared Spring ObjectMapper bean in this codebase).
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        // Embed class info: cached values are records (final) and must
        // round-trip to their concrete DTO type.
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.EVERYTHING, JsonTypeInfo.As.PROPERTY);
        GenericJackson2JsonRedisSerializer values =
                new GenericJackson2JsonRedisSerializer(objectMapper);
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(reportSummaryTtl)
                .disableCachingNullValues()
                .prefixCacheNameWith("tasky:")
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(values));
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .build();
    }

    @Bean("reportSummaryKeyGenerator")
    public KeyGenerator reportSummaryKeyGenerator() {
        return (target, method, params) -> {
            @SuppressWarnings("unchecked")
            Set<UUID> scope = (Set<UUID>) params[5];
            List<String> sorted = scope.stream().map(UUID::toString).sorted().toList();
            return params[0] + "|" + params[1] + "|" + params[2] + "|"
                    + params[3] + "|" + params[4] + "|" + String.join(",", sorted);
        };
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            private final Logger log = LoggerFactory.getLogger("tasky.cache");

            @Override
            public void handleCacheGetError(RuntimeException ex, Cache cache, Object key) {
                log.warn("Cache get failed ({}:{}), falling through", cache.getName(), key);
            }

            @Override
            public void handleCachePutError(RuntimeException ex, Cache cache, Object key, Object value) {
                log.warn("Cache put failed ({}:{})", cache.getName(), key);
            }

            @Override
            public void handleCacheEvictError(RuntimeException ex, Cache cache, Object key) {
                log.warn("Cache evict failed ({}:{})", cache.getName(), key);
            }

            @Override
            public void handleCacheClearError(RuntimeException ex, Cache cache) {
                log.warn("Cache clear failed ({})", cache.getName());
            }
        };
    }
}
