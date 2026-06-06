package io.tasky.api.domain;

import io.tasky.api.config.AppConfig;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FibonacciWeightTest {

    @Test
    void validFibonacciWeights() {
        assertTrue(AppConfig.isValidFibonacciWeight((short) 1));
        assertTrue(AppConfig.isValidFibonacciWeight((short) 2));
        assertTrue(AppConfig.isValidFibonacciWeight((short) 3));
        assertTrue(AppConfig.isValidFibonacciWeight((short) 5));
        assertTrue(AppConfig.isValidFibonacciWeight((short) 8));
        assertTrue(AppConfig.isValidFibonacciWeight((short) 13));
    }

    @Test
    void invalidWeights() {
        assertFalse(AppConfig.isValidFibonacciWeight((short) 0));
        assertFalse(AppConfig.isValidFibonacciWeight((short) 4));
        assertFalse(AppConfig.isValidFibonacciWeight((short) 7));
        assertFalse(AppConfig.isValidFibonacciWeight((short) 14));
        assertFalse(AppConfig.isValidFibonacciWeight((short) 21));
    }
}
