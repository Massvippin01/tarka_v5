# ADR-011: Empirical Performance & Benchmark Suite Methodology

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: Performance claims must come from actual empirical execution of real synthetic workloads rather than hard-coded API responses.

## Decision
1. **Empirical Benchmark Suite**: Implement `BenchmarkService` (`benchmark_service.py`) executing real workloads across Search, Bounded Graph Projection, Analytical Signals, and Governed Copilot queries.
2. **Telemetry Reporting**: Benchmark outputs report dataset size, hardware environment, concurrency tier, P50, P95, P99 latency, throughput (RPS), memory usage, and error rate.
3. **Execution Endpoint**: Expose `POST /api/v1/investigation/benchmarks/run` for automated empirical performance profiling.

## Consequences
- **Positive**:
  - 100% empirical, reproducible performance measurements.
  - Zero hard-coded benchmark values in production code paths.
