package io.tasky.api.api.common;

import org.springframework.http.ProblemDetail;

/** Thrown when an unbounded inline endpoint must be replaced by its paged variant. */
public class PagedResultRequiredException extends RuntimeException {

    private final ProblemDetail problem;

    public PagedResultRequiredException(ProblemDetail problem) {
        super(problem.getDetail());
        this.problem = problem;
    }

    public ProblemDetail getProblem() {
        return problem;
    }
}
