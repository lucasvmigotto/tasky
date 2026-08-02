package io.tasky.api.api.capacity;

import io.tasky.api.api.sector.SectorOverviewResponse;

import java.util.List;

public record SectorCapacityView(
        SectorOverviewResponse overview,
        List<MemberCapacityResponse> capacities
) {}
