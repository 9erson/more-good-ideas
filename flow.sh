#!/bin/bash
# Removed -e so the script doesn't die when a test fails. 
# Kept -u (error on unset variables) and -o pipefail for safety.
set -uo pipefail

SKIP_SETUP=false

# ==============================================================================
# CONFIGURATION
# ==============================================================================
UNIT_TEST_COVERAGE_THRESHOLD=80
FLOW_DIR="./.flow"
CHECKS_FOLDER="$FLOW_DIR/checks"
BUILD_CHECK_FILE="$CHECKS_FOLDER/build.txt"
UNIT_TEST_COVERAGE_CHECK_FILE="$CHECKS_FOLDER/unit-test-coverage.txt"
LINT_CHECK_FILE="$CHECKS_FOLDER/lint.txt"
TYPECHECK_CHECK_FILE="$CHECKS_FOLDER/typecheck.txt"
E2E_TEST_CHECK_FILE="$CHECKS_FOLDER/e2e-test.txt"
PLAN_FILE="$FLOW_DIR/plan.md"

# ==============================================================================
# UI HELPERS
# ==============================================================================
section() {
    gum style --foreground 212 --bold --border normal --padding "0 1" "$1"
}

log_info() { gum log --level info -- "$1"; }
log_warn() { gum log --level warn -- "$1"; }
log_error() { gum log --level error -- "$1"; }
log_success() { gum log --level info -- "$1"; }

run_with_timer() {
    local description="$1"
    local command="$2"
    local output_file="$3"

    log_info "Starting: $description"
    start_time=$(date +%s)

    eval "$command" | tee "$output_file" | while read -r line; do
        # If $line is empty, skip it to avoid gum errors
        [[ -z "$line" ]] && continue
        
        # Added -- before "$line"
        gum log --prefix "Terminal" --level info -- "$line"
    done

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    log_success "$description completed in ${duration}s"
}

agent() {
    local prompt="$1"
    # Stream the output through gum log
    opencode run "$prompt" | while read -r line; do
        # If $line is empty, skip it to avoid gum errors
        [[ -z "$line" ]] && continue
        
        # Added -- before "$line"
        gum log --prefix "Agent" --level info -- "$line"
    done
}

# ==============================================================================
# SETUP
# ==============================================================================
if ! $SKIP_SETUP; then    
    section "Flow Initialization"
    rm -rf "$FLOW_DIR"
    mkdir -p "$CHECKS_FOLDER"
    log_success "Flow directory ready at $FLOW_DIR"
fi

# ==============================================================================
# TECH STACK
# ==============================================================================
if ! $SKIP_SETUP; then
    section "Tech Stack Validation"
    agent "Ensure the following tech stack is installed: bun, biome, git, shadcn, tailwind, react, playwright. Ensure the playwright config has fullyParallel: true, and workers: 4, and output is not interactive html. Do not run any tests or update code. Just ensure the tech stack is installed. If it's not, then install it. Finally, give a summary of your findings."
fi

# ==============================================================================
# HEALTH CHECKS
# ==============================================================================
run_build() { run_with_timer "Build" "bun run build" "$BUILD_CHECK_FILE"; }
run_lint() { run_with_timer "Lint" "bun run lint:fix && bun run lint" "$LINT_CHECK_FILE"; }
run_typecheck() { run_with_timer "Typecheck" "bun run typecheck 2>&1 || (echo 'Typecheck failed' && exit 1); echo 'Typecheck passed'" "$TYPECHECK_CHECK_FILE"; }
run_unit_test_coverage() { run_with_timer "Unit Tests" "bun test --coverage --coverage-reporter=text 2>&1" "$UNIT_TEST_COVERAGE_CHECK_FILE"; }
run_e2e_test() { run_with_timer "E2E Tests" "bun test:e2e" "$E2E_TEST_CHECK_FILE"; }

run_health_checks() {
    section "Health Checks"
    run_build
    run_lint
    run_typecheck
    run_unit_test_coverage
    run_e2e_test
    log_success "All health checks executed"
}

# ==============================================================================
# PLANNING + EXECUTION
# ==============================================================================
run_identify_next_task() {
    section "Identifying Next Task"
    agent "Read the files in $CHECKS_FOLDER. This represents the current health state. Identify the next micro-iteration task. Save the 'what' and 'why' to $PLAN_FILE. Do not implement yet."
}

plan_next_task() {
    section "Planning Task Implementation"
    agent "Read $PLAN_FILE. Analyze codebase and document the 'how' as a markdown checklist in the same file. Do not implement yet."
}

implement_next_task() {
    section "Implementing Task"
    agent "Read $PLAN_FILE. Implement the task and mark items as [x]. Only work on the task at hand."
}

commit_changes() {
    section "Committing Changes"
    agent "Identify uncommitted changes. Update .gitignore if needed. Commit with message: 'task: <task name>'."
}

# ==============================================================================
# MAIN LOOP
# ==============================================================================
iteration=1

while true; do
    section "Iteration #$iteration"
    
    run_health_checks
    run_identify_next_task
    plan_next_task
    implement_next_task
    commit_changes

    log_success "Iteration #$iteration complete"
    iteration=$((iteration + 1))
done