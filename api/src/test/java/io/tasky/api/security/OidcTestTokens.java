package io.tasky.api.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Test-only JWT minting with a local RSA keypair: real RS256 signatures,
 * no network. Mirrors the validators wired in production verifiers.
 */
final class OidcTestTokens {

    private OidcTestTokens() {}

    static RSAKey rsaKey() throws Exception {
        return new RSAKeyGenerator(2048).keyID("test-key").generate();
    }

    static JwtDecoder decoderFor(RSAKey key, String issuer, String audience) throws Exception {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withPublicKey(key.toRSAPublicKey()).build();
        if (audience == null) {
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        } else {
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer(issuer),
                    new JwtClaimValidator<List<String>>("aud",
                            aud -> aud != null && aud.contains(audience))));
        }
        return decoder;
    }

    static String mint(RSAKey key, String issuer, String audience, Map<String, Object> extraClaims,
                       Instant expiresAt) throws Exception {
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject("subject-1")
                .issueTime(Date.from(Instant.now().minusSeconds(60)))
                .expirationTime(Date.from(expiresAt));
        if (audience != null) {
            builder.audience(audience);
        }
        extraClaims.forEach(builder::claim);
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),
                builder.build());
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    static Map<String, Object> claims(String email, String name) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("email_verified", true);
        claims.put("name", name);
        return claims;
    }
}
